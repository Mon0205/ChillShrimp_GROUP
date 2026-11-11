import os
import threading
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any, Optional

import cloudinary.uploader
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageOps
from ultralytics import YOLO
from ultralytics.engine.results import Results

from app.cloudinary_config import CLOUDINARY_CONFIGURED
from app.photo_check import check_photo


SERVICE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = SERVICE_DIR / "models" / "best.pt"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH)))
# Recorded by the backend with every inspection; keep it distinct per model.
DEFAULT_MODEL_VERSION = "v8_yolo26s_seed0"
INSPECTION_FOLDER = os.getenv("CLOUDINARY_INSPECTION_FOLDER", "chillshrimp/ai-inspections/originals")


def default_conf() -> float:
    """Confidence threshold used when the caller sends none (the backend does not).

    0.35 gave the lowest count error for this model on the measured photos; that figure is
    optimistic because the threshold was chosen on those photos (docs/BAO_CAO_MODEL_V8_YOLO26S_SEED0.md, 9.3).
    Set DETECTION_CONF to change it without touching the code.
    """
    try:
        value = float(os.getenv("DETECTION_CONF", "0.35"))
    except ValueError:
        return 0.35
    return value if 0.0 <= value <= 1.0 else 0.35


DEFAULT_CONF = default_conf()

app = FastAPI(
    title="Shrimp Seed Detection AI Service",
    description="YOLO26s service for shrimp seed detection and counting.",
    version="0.2.0",
)

model: Optional[YOLO] = None
# One shared YOLO instance is not safe to call from several threads at once, and requests now
# run in a threadpool. The lock loads the weights once and runs one prediction at a time;
# the event loop (and /health) stays free while a prediction waits or runs.
MODEL_LOCK = threading.RLock()


def get_model() -> YOLO:
    global model

    with MODEL_LOCK:
        if model is None:
            if not MODEL_PATH.exists():
                raise HTTPException(
                    status_code=503,
                    detail=f"Model file not found. Expected: {MODEL_PATH}. Set MODEL_PATH to override.",
                )
            model = YOLO(str(MODEL_PATH))

    return model


def read_image(file_bytes: bytes) -> Image.Image:
    try:
        # Phones store rotation in EXIF; apply it so the model sees the photo as displayed.
        return ImageOps.exif_transpose(Image.open(BytesIO(file_bytes))).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc


def upload_original_to_cloudinary(file_bytes: bytes, filename: Optional[str]) -> dict[str, Any]:
    stream = BytesIO(file_bytes)
    safe_filename = (filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    stream.name = safe_filename or "shrimp-image.jpg"

    return cloudinary.uploader.upload(
        stream,
        folder=INSPECTION_FOLDER,
        resource_type="image",
    )


def upload_annotated_to_cloudinary(plotted_bgr: np.ndarray) -> dict[str, Any]:
    """Results.plot returns BGR; convert to RGB before encoding.

    JPEG keeps the file small enough for Cloudinary's per-image size limit on large photos.
    """
    annotated = Image.fromarray(plotted_bgr[..., ::-1].copy())
    stream = BytesIO()
    annotated.save(stream, format="JPEG", quality=90)
    stream.seek(0)
    stream.name = "annotated.jpg"
    return cloudinary.uploader.upload(
        stream,
        folder=f"{INSPECTION_FOLDER}/annotated",
        resource_type="image",
    )


def plot_detections(image: Image.Image, names: dict[int, str], detections: list[dict[str, Any]]) -> np.ndarray:
    """Plot final merged tile detections on the original image, never individual tiles."""
    boxes = np.asarray([
        [det["box"]["x1"], det["box"]["y1"], det["box"]["x2"], det["box"]["y2"],
         det["confidence"], det["class_id"]]
        for det in detections
    ], dtype=np.float32).reshape(-1, 6)
    result = Results(
        orig_img=np.asarray(image)[..., ::-1].copy(), path="", names=names, boxes=torch.from_numpy(boxes)
    )
    return result.plot(labels=False, conf=False)


def detection_to_dict(box: Any, names: dict[int, str]) -> dict[str, Any]:
    class_id = int(box.cls[0].item())
    x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]

    return {
        "class_id": class_id,
        "class": names.get(class_id, str(class_id)),
        "confidence": float(box.conf[0].item()),
        "box": {
            "x1": round(x1, 2),
            "y1": round(y1, 2),
            "x2": round(x2, 2),
            "y2": round(y2, 2),
        },
    }


LOW_CONFIDENCE_THRESHOLD = 0.4


def summarize_confidence(detections: list[dict[str, Any]]) -> dict[str, Optional[float]]:
    """Informational only: on the project's test photos confidence did not reliably flag wrong counts."""
    if not detections:
        return {"mean_confidence": None, "low_confidence_ratio": None}

    values = [det["confidence"] for det in detections]
    return {
        "mean_confidence": round(sum(values) / len(values), 3),
        "low_confidence_ratio": round(sum(1 for value in values if value < LOW_CONFIDENCE_THRESHOLD) / len(values), 3),
    }


# Smaller tiles or more tiles make a single request run thousands of sequential predictions.
MIN_TILE_SIZE = 160
MAX_TILES = 64


def tile_origins(length: int, tile: int, overlap: float) -> list[int]:
    if length <= tile:
        return [0]

    step = max(1, int(tile * (1 - overlap)))
    origins = list(range(0, length - tile, step))
    origins.append(length - tile)
    return origins


def merge_detections(detections: list[dict[str, Any]], iou_threshold: float) -> list[dict[str, Any]]:
    """Greedy NMS to drop duplicates of the same shrimp seen in overlapping tiles."""
    kept: list[dict[str, Any]] = []

    for det in sorted(detections, key=lambda item: item["confidence"], reverse=True):
        box = det["box"]
        area = (box["x2"] - box["x1"]) * (box["y2"] - box["y1"])
        duplicate = False

        for other in kept:
            ob = other["box"]
            iw = min(box["x2"], ob["x2"]) - max(box["x1"], ob["x1"])
            ih = min(box["y2"], ob["y2"]) - max(box["y1"], ob["y1"])
            if iw <= 0 or ih <= 0:
                continue
            inter = iw * ih
            other_area = (ob["x2"] - ob["x1"]) * (ob["y2"] - ob["y1"])
            if inter / (area + other_area - inter) >= iou_threshold:
                duplicate = True
                break

        if not duplicate:
            kept.append(det)

    return kept


def detect_tiled(
    detector: YOLO,
    image: Image.Image,
    conf: float,
    imgsz: int,
    max_det: int,
    tile_size: int,
    overlap: float,
    merge_iou: float,
) -> tuple[dict[int, str], list[dict[str, Any]], bool]:
    """Run YOLO on overlapping crops so small, dense shrimp seeds stay large enough to detect.

    Returns (names, merged detections, truncated). max_det caps each crop, so truncated is
    True when any crop hit that cap, not when the merged total exceeds it.
    """
    # Ultralytics expects BGR for NumPy inputs; Pillow images are RGB.
    pixels = np.asarray(image)[..., ::-1].copy()
    names: dict[int, str] = {}
    detections: list[dict[str, Any]] = []
    truncated = False

    for y0 in tile_origins(image.height, tile_size, overlap):
        for x0 in tile_origins(image.width, tile_size, overlap):
            crop = pixels[y0 : y0 + tile_size, x0 : x0 + tile_size]
            result = detector.predict(source=crop, conf=conf, imgsz=imgsz, max_det=max_det, verbose=False)[0]
            names = {int(key): value for key, value in result.names.items()}
            truncated = truncated or len(result.boxes) >= max_det

            for box in result.boxes:
                det = detection_to_dict(box, names)
                det["box"] = {
                    "x1": round(det["box"]["x1"] + x0, 2),
                    "y1": round(det["box"]["y1"] + y0, 2),
                    "x2": round(det["box"]["x2"] + x0, 2),
                    "y2": round(det["box"]["y2"] + y0, 2),
                }
                detections.append(det)

    return names, merge_detections(detections, merge_iou), truncated


def run_detection(
    image: Image.Image,
    conf: float,
    imgsz: int,
    max_det: int,
    tile_size: int,
    tile_overlap: float,
    merge_iou: float,
) -> tuple[list[dict[str, Any]], np.ndarray, bool, float]:
    """Blocking model work; called through run_in_threadpool so the event loop stays free.

    Returns (detections, plotted image, max_det reached, inference scale). The scale is how much
    the image (or each tile) is shrunk before the model sees it, so photo checks can judge the
    head size the model actually works with.
    """
    detector = get_model()

    with MODEL_LOCK:
        if tile_size:
            names, detections, truncated = detect_tiled(
                detector, image, conf, imgsz, max_det, tile_size, tile_overlap, merge_iou
            )
            plotted = plot_detections(image, names, detections)
            return detections, plotted, truncated, min(1.0, imgsz / tile_size)

        result = detector.predict(source=image, conf=conf, imgsz=imgsz, max_det=max_det, verbose=False)[0]
        names = {int(key): value for key, value in result.names.items()}
        detections = [detection_to_dict(box, names) for box in result.boxes]
        plotted = result.plot(labels=False, conf=False)
        return detections, plotted, len(detections) >= max_det, min(1.0, imgsz / max(image.size))


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
        "model_loaded": model is not None,
        "model_version": os.getenv("MODEL_VERSION", DEFAULT_MODEL_VERSION),
        "default_conf": DEFAULT_CONF,
        "cloudinary_configured": CLOUDINARY_CONFIGURED,
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    conf: float = Query(DEFAULT_CONF, ge=0.0, le=1.0),
    imgsz: int = Query(640, ge=64, le=2048),
    save_original: bool = Query(True),
    max_det: Annotated[int, Query(ge=1, le=5000)] = 1000,
    tile_size: Annotated[
        int, Query(ge=0, le=4096, description=f"Crop size in px; 0 disables tiling, otherwise at least {MIN_TILE_SIZE}.")
    ] = 0,
    tile_overlap: Annotated[float, Query(ge=0.0, lt=1.0)] = 0.2,
    merge_iou: Annotated[float, Query(gt=0.0, le=1.0)] = 0.5,
) -> dict[str, Any]:
    if tile_size and tile_size < MIN_TILE_SIZE:
        raise HTTPException(status_code=422, detail=f"tile_size must be 0 or at least {MIN_TILE_SIZE}.")

    file_bytes = await file.read()
    image = await run_in_threadpool(read_image, file_bytes)

    if tile_size:
        tiles = len(tile_origins(image.width, tile_size, tile_overlap)) * len(
            tile_origins(image.height, tile_size, tile_overlap)
        )
        if tiles > MAX_TILES:
            raise HTTPException(
                status_code=422,
                detail=f"tile_size={tile_size} needs {tiles} tiles for this image; the limit is {MAX_TILES}. Use a larger tile_size.",
            )

    if not CLOUDINARY_CONFIGURED:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Cloudinary is not configured. Set all CLOUDINARY_* environment variables.",
                "image_saved": False,
            },
        )

    detections, plotted_bgr, max_det_reached, inference_scale = await run_in_threadpool(
        run_detection, image, conf, imgsz, max_det, tile_size, tile_overlap, merge_iou
    )
    # Before any upload: a failing photo check must not leave assets behind on Cloudinary.
    confidence_summary = summarize_confidence(detections)
    photo_warnings = await run_in_threadpool(
        check_photo, image, detections, max_det_reached, confidence_summary, inference_scale
    )

    cloudinary_asset = None
    try:
        if save_original:
            cloudinary_asset = await run_in_threadpool(
                upload_original_to_cloudinary, file_bytes, file.filename
            )
            if not cloudinary_asset.get("secure_url") or not cloudinary_asset.get("public_id"):
                raise RuntimeError("Cloudinary upload response is missing the asset URL or public ID.")
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "YOLO prediction succeeded, but the original image could not be backed up to Cloudinary.",
                "image_saved": False,
            },
        ) from exc

    try:
        annotated_asset = await run_in_threadpool(upload_annotated_to_cloudinary, plotted_bgr)
        if not annotated_asset.get("secure_url") or not annotated_asset.get("public_id"):
            raise RuntimeError("Cloudinary annotated upload response is missing URL or public ID.")
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "YOLO prediction succeeded, but the annotated image could not be saved to Cloudinary.",
                "image_saved": bool(cloudinary_asset),
                "annotated_image_saved": False,
            },
        ) from exc

    return {
        "filename": file.filename,
        "image_saved": bool(cloudinary_asset),
        "image_url": cloudinary_asset["secure_url"] if cloudinary_asset else None,
        "public_id": cloudinary_asset["public_id"] if cloudinary_asset else None,
        "annotated_image_saved": True,
        "annotated_image_url": annotated_asset["secure_url"],
        "annotated_public_id": annotated_asset["public_id"],
        "model_version": os.getenv("MODEL_VERSION", DEFAULT_MODEL_VERSION),
        "image": {"width": image.width, "height": image.height},
        "count": len(detections),
        "max_det": max_det,
        "max_det_reached": max_det_reached,
        **confidence_summary,
        "photo_warnings": photo_warnings,
        "detections": detections,
    }
