"""Automatic check of a photo and its detections against the capture rules
(docs/BAO_CAO_MODEL_V8_YOLO26S_SEED0.md, section 11).

Only what can be measured is checked: resolution, sharpness, exposure, shrimp size
relative to the image, and signs in the detections (nothing found, max_det reached,
low confidence). Hands, logos, screen recordings, water depth or camera angle cannot
be detected here. Thresholds are heuristics, not validated limits.
"""
from typing import Any

import cv2
import numpy as np
from PIL import Image

MIN_LONG_SIDE = 800          # below this the shrimp head is only a few pixels
RECOMMENDED_LONG_SIDE = 1600
BLUR_VARIANCE_MIN = 3.0      # Laplacian variance on a 1024 px copy; only very smooth images fall below (mlpro patches that count fine score 5-700)
DARK_MEAN = 60
BRIGHT_MEAN = 210
HEAD_RATIO_MIN = 0.008       # median box side / long side; labelled heads are about 0.02
HEAD_RATIO_MAX = 0.06
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


def median_box_ratio(detections: list[dict[str, Any]], long_side: int) -> float | None:
    if not detections:
        return None
    sides = [((d["box"]["x2"] - d["box"]["x1"]) * (d["box"]["y2"] - d["box"]["y1"])) ** 0.5 for d in detections]
    return float(np.median(sides)) / long_side


def check_photo(
    image: Image.Image,
    detections: list[dict[str, Any]],
    max_det: int,
    summary: dict[str, Any],
) -> list[dict[str, str]]:
    """Return warnings: [{"code", "level" ("warning" | "info"), "message"}], empty if nothing to flag."""
    warnings: list[dict[str, str]] = []

    def add(code: str, level: str, message: str) -> None:
        warnings.append({"code": code, "level": level, "message": message})

    long_side = max(image.size)
    if long_side < MIN_LONG_SIDE:
        add("low_resolution", "warning",
            f"Ảnh chỉ {long_side}px ở cạnh dài, đầu tôm quá nhỏ. Hãy chụp ảnh gốc, cạnh dài từ {RECOMMENDED_LONG_SIDE}px.")
    elif long_side < RECOMMENDED_LONG_SIDE:
        add("resolution_below_recommended", "info",
            f"Ảnh {long_side}px ở cạnh dài, thấp hơn mức khuyến nghị {RECOMMENDED_LONG_SIDE}px.")

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
        ratio = median_box_ratio(detections, long_side)
        if ratio is not None and ratio < HEAD_RATIO_MIN:
            add("shrimp_too_small", "warning",
                "Tôm quá nhỏ so với khung ảnh. Hãy chụp gần hơn hoặc dùng ảnh phân giải cao hơn (có thể dùng tile_size).")
        elif ratio is not None and ratio > HEAD_RATIO_MAX:
            add("shrimp_too_large", "warning",
                "Tôm quá lớn so với khung ảnh, ngoài phạm vi tôm giống mà model được dạy. Hãy chụp xa hơn.")
        low_ratio = summary.get("low_confidence_ratio")
        mean_conf = summary.get("mean_confidence")
        if (low_ratio is not None and low_ratio > LOW_CONF_RATIO_MAX) or (mean_conf is not None and mean_conf < MEAN_CONF_MIN):
            add("low_confidence", "warning",
                "Phần lớn kết quả có độ tin cậy thấp. Số đếm có thể sai; kiểm tra ảnh theo quy định chụp ảnh.")

    if len(detections) >= max_det:
        add("max_det_reached", "warning", "Đã chạm giới hạn số khung, số đếm bị cắt. Tăng max_det hoặc chia ảnh nhỏ hơn.")

    return warnings
