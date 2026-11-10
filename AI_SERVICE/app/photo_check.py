"""Automatic check of a photo and its detections against the capture rules
(docs/BAO_CAO_MODEL_V8_YOLO26S_SEED0.md, section 11).

Only what can be measured is checked: resolution (info only), sharpness, exposure, detected
head size in pixels, and signs in the detections (nothing found, max_det reached,
low confidence). Hands, logos, screen recordings, water depth or camera angle cannot
be detected here. Thresholds are heuristics, not validated limits.
"""
from typing import Any

import cv2
import numpy as np
from PIL import Image

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

    if max_det_reached:
        add("max_det_reached", "warning", "Đã chạm giới hạn số khung, số đếm bị cắt. Tăng max_det hoặc chia ảnh nhỏ hơn.")

    return warnings
