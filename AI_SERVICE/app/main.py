import os
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

import cloudinary.uploader
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image
from ultralytics import YOLO

from app.cloudinary_config import CLOUDINARY_CONFIGURED


SERVICE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = SERVICE_DIR / "models" / "best.pt"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH)))

app = FastAPI(
    title="Shrimp Seed Detection AI Service",
    description="YOLOv8 service for shrimp seed detection and counting.",
    version="0.1.0",
)

model: Optional[YOLO] = None


def get_model() -> YOLO:
    global model

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
        return Image.open(BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc


def upload_original_to_cloudinary(file_bytes: bytes, filename: Optional[str]) -> dict[str, Any]:
    stream = BytesIO(file_bytes)
    safe_filename = (filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    stream.name = safe_filename or "shrimp-image.jpg"

    return cloudinary.uploader.upload(
        stream,
        folder=os.getenv("CLOUDINARY_INSPECTION_FOLDER", "chillshrimp/ai-inspections/originals"),
        resource_type="image",
    )


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


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
        "model_loaded": model is not None,
        "cloudinary_configured": CLOUDINARY_CONFIGURED,
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.0, le=1.0),
    imgsz: int = Query(640, ge=64, le=2048),
) -> dict[str, Any]:
    file_bytes = await file.read()
    image = read_image(file_bytes)

    if not CLOUDINARY_CONFIGURED:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Cloudinary is not configured. Set all CLOUDINARY_* environment variables.",
                "image_saved": False,
            },
        )

    detector = get_model()
    result = detector.predict(source=image, conf=conf, imgsz=imgsz, verbose=False)[0]
    names = {int(key): value for key, value in result.names.items()}
    detections = [detection_to_dict(box, names) for box in result.boxes]

    try:
        cloudinary_asset = await run_in_threadpool(
            upload_original_to_cloudinary,
            file_bytes,
            file.filename,
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

    return {
        "filename": file.filename,
        "image_saved": True,
        "image_url": cloudinary_asset["secure_url"],
        "public_id": cloudinary_asset["public_id"],
        "image": {"width": image.width, "height": image.height},
        "count": len(detections),
        "detections": detections,
    }
