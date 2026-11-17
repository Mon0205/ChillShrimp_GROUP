"""Automatic check of a photo and its detections against the capture rules
(docs/BAO_CAO_MODEL_V8_YOLO26S_SEED0.md, section 11).

Only what can be measured is checked: resolution (info only), sharpness, exposure, detected
head size in pixels, and signs in the detections (nothing found, max_det reached,
low confidence). Hands, logos, screen recordings, water depth or camera angle cannot
be detected here. Thresholds are heuristics, not validated limits.
"""
import os
from typing import Any

import cv2
import numpy as np
from PIL import Image


def _env_float(name: str, default: float) -> float:
    """Read a float threshold from the environment; an unset or invalid value keeps the default."""
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default

# Image size alone cannot tell whether shrimp are too small: a 320 px crop can hold 16 px heads
# while a 4000 px tray photo can hold 6 px ones. So resolution is only an info note, and
# "too small" is judged from the detected head size in original-image pixels.
RECOMMENDED_LONG_SIDE = 1600  # a recommendation (model report 11.6), not a measured limit
HEAD_PX_MIN = 8              # median head side as the model sees it (after shrinking to imgsz); below it counts drop (test+valid downscaled: C error 21% at 8-10 px, 51% at 6-8 px)
BLUR_VARIANCE_MIN = 3.0      # Laplacian variance on a 1024 px copy; only very smooth images fall below (mlpro patches that count fine score 5-700)
DARK_MEAN = 60
BRIGHT_MEAN = 210
HEAD_RATIO_MAX = 0.06        # median box side / long side; labelled heads are about 0.02
LOW_CONF_RATIO_MAX = 0.5
MEAN_CONF_MIN = 0.4

# Crowding (shrimp lying on top of each other). PROVISIONAL thresholds: they have not been calibrated
# on dense photos yet, only checked on a sparse sample (about 2% overlapping boxes, 7% coverage).
# Tune them with CROWD_OVERLAP_RATIO_MAX / CROWD_COVERAGE_MAX once crowded and clean photos are compared.
CROWD_MIN_BOXES = 20          # below this the statistics say nothing
CROWD_IOU = 0.1               # two boxes overlapping by more than this IoU count as overlapping
CROWD_OVERLAP_RATIO_MAX = _env_float("CROWD_OVERLAP_RATIO_MAX", 0.25)  # share of boxes that overlap another box
CROWD_COVERAGE_MAX = _env_float("CROWD_COVERAGE_MAX", 0.30)            # sum of box areas / image area


def image_metrics(image: Image.Image) -> dict[str, float]:
    gray = np.asarray(image.convert("L"))
    long_side = max(gray.shape)
    if long_side > 1024:
        scale = 1024 / long_side
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return {
        "sharpness": float(cv2.Laplacian(gray, cv2.CV_64F).var()),
        "brightness": float(gray.mean()),
        "contrast": float(gray.std()),
    }


def median_box_side(detections: list[dict[str, Any]]) -> float | None:
    """Median sqrt(box area) in original-image pixels: roughly the head size the model sees."""
    if not detections:
        return None
    sides = [((d["box"]["x2"] - d["box"]["x1"]) * (d["box"]["y2"] - d["box"]["y1"])) ** 0.5 for d in detections]
    return float(np.median(sides))


def crowding_metrics(detections: list[dict[str, Any]], image_size: tuple[int, int]) -> dict[str, float] | None:
    """Signs of shrimp lying on top of each other, measured on the detected boxes.

    overlap_ratio: share of boxes whose IoU with some other box exceeds CROWD_IOU.
    coverage: sum of box areas divided by image area (can exceed the real covered area when boxes overlap).
    Boxes the model merged or missed cannot be seen here, so heavy stacking can be under-reported.
    Returns None when there are too few boxes to judge. Rows are processed in blocks to bound memory.
    """
    n = len(detections)
    if n < CROWD_MIN_BOXES:
        return None
    boxes = np.array(
        [[d["box"]["x1"], d["box"]["y1"], d["box"]["x2"], d["box"]["y2"]] for d in detections], dtype=np.float64
    )
    areas = np.clip(boxes[:, 2] - boxes[:, 0], 0, None) * np.clip(boxes[:, 3] - boxes[:, 1], 0, None)
    overlapping = 0
    block = 256
    for start in range(0, n, block):
        part = boxes[start:start + block]
        width = np.clip(np.minimum(part[:, None, 2], boxes[None, :, 2]) - np.maximum(part[:, None, 0], boxes[None, :, 0]), 0, None)
        height = np.clip(np.minimum(part[:, None, 3], boxes[None, :, 3]) - np.maximum(part[:, None, 1], boxes[None, :, 1]), 0, None)
        inter = width * height
        rows = np.arange(part.shape[0])
        inter[rows, start + rows] = 0  # a box never overlaps itself
        union = areas[start:start + block, None] + areas[None, :] - inter
        iou = np.divide(inter, union, out=np.zeros_like(inter), where=union > 0)
        overlapping += int((iou.max(axis=1) > CROWD_IOU).sum())
    pixels = image_size[0] * image_size[1]
    return {
        "overlap_ratio": overlapping / n,
        "coverage": float(areas.sum() / pixels) if pixels > 0 else 0.0,
    }


def check_photo(
    image: Image.Image,
    detections: list[dict[str, Any]],
    max_det_reached: bool,
    summary: dict[str, Any],
    inference_scale: float = 1.0,
) -> list[dict[str, str]]:
    """Return warnings: [{"code", "level" ("warning" | "info"), "message"}], empty if nothing to flag.

    max_det_reached comes from the detector: with tiling it means one crop hit its cap,
    which the merged total cannot tell. inference_scale (<= 1) is how much the image or tile is
    shrunk before the model sees it: a 20 px head in a 4000 px photo is about 3 px at imgsz=640.
    """
    warnings: list[dict[str, str]] = []

    def add(code: str, level: str, message: str) -> None:
        warnings.append({"code": code, "level": level, "message": message})

    long_side = max(image.size)
    if long_side < RECOMMENDED_LONG_SIDE:
        add("small_image", "info",
            f"Ảnh nhỏ ({long_side}px ở cạnh dài). Nếu đây là ảnh chụp cả khay, nên dùng ảnh gốc từ camera "
            f"(khuyến nghị cạnh dài khoảng {RECOMMENDED_LONG_SIDE}px) để thấy rõ từng con.")

    m = image_metrics(image)
    if m["sharpness"] < BLUR_VARIANCE_MIN:
        add("blurry", "warning", "Ảnh có vẻ bị mờ. Hãy lấy nét vào mặt nước và giữ máy cố định.")
    if m["brightness"] < DARK_MEAN:
        add("too_dark", "warning", "Ảnh quá tối. Hãy chụp nơi đủ sáng, ánh sáng đều.")
    elif m["brightness"] > BRIGHT_MEAN:
        add("too_bright", "warning", "Ảnh quá sáng hoặc cháy sáng. Tránh đèn flash và ánh nắng chiếu thẳng.")

    if not detections:
        add("no_detection", "warning",
            "Không phát hiện con nào. Có thể ảnh ngoài phạm vi (tôm quá to hoặc quá nhỏ, nền quá lẫn); kiểm tra lại quy định chụp ảnh.")
    else:
        head_px = median_box_side(detections)
        ratio = head_px / long_side if head_px is not None else None
        # Judge the head size the model works with, not the size in the original photo.
        model_head_px = head_px * min(1.0, inference_scale) if head_px is not None else None
        if model_head_px is not None and model_head_px < HEAD_PX_MIN:
            add("shrimp_too_small", "warning",
                f"Đầu tôm chỉ khoảng {model_head_px:.0f}px khi model xử lý, quá nhỏ để đếm chính xác (dưới {HEAD_PX_MIN}px thường bị đếm thiếu). "
                "Hãy chụp gần hơn để tôm chiếm nhiều khung hình hơn.")
        elif ratio is not None and ratio > HEAD_RATIO_MAX:
            add("shrimp_too_large", "warning",
                "Tôm quá lớn so với khung ảnh, ngoài phạm vi tôm giống mà model được dạy. Hãy chụp xa hơn.")
        low_ratio = summary.get("low_confidence_ratio")
        mean_conf = summary.get("mean_confidence")
        if (low_ratio is not None and low_ratio > LOW_CONF_RATIO_MAX) or (mean_conf is not None and mean_conf < MEAN_CONF_MIN):
            add("low_confidence", "warning",
                "Phần lớn kết quả có độ tin cậy thấp. Số đếm có thể sai; kiểm tra ảnh theo quy định chụp ảnh.")
        crowd = crowding_metrics(detections, image.size)
        if crowd and (crowd["overlap_ratio"] > CROWD_OVERLAP_RATIO_MAX or crowd["coverage"] > CROWD_COVERAGE_MAX):
            add("crowded", "warning",
                f"Tôm chồng lên nhau hoặc quá sát nhau (khoảng {crowd['overlap_ratio']:.0%} khung dính khung khác). "
                "Số đếm có thể sai (đếm thiếu hoặc dư). Hãy tách tôm ra, dùng nước nông để tôm nằm một lớp "
                "rồi chụp lại, hoặc đếm tay để đối chiếu.")

    if max_det_reached:
        add("max_det_reached", "warning", "Đã chạm giới hạn số khung, số đếm bị cắt. Tăng max_det hoặc chia ảnh nhỏ hơn.")

    return warnings
