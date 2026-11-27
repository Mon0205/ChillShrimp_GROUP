"""YOLO inference on ONNX Runtime, without PyTorch or Ultralytics.

models/best.onnx is exported from best.pt by scripts/export_onnx.py. This model's head is NOT
end-to-end (metadata end2end=False): the graph returns raw predictions of shape
(1, 4 + classes, anchors) as centre-x, centre-y, width, height and class scores, so NMS runs here.

Pre- and post-processing mirror Ultralytics 8.4.198 `predict`, so counts and boxes match best.pt:
- rect letterbox (predict sets rect=True): long side to imgsz, the short side padded only up to
  the next multiple of the stride (a 960x540 photo becomes 640x384), pad 114, INTER_LINEAR;
- best class per anchor, kept when score > conf (strictly greater);
- class-aware greedy NMS, IoU 0.7, at most 30000 candidates, then the first max_det boxes;
- boxes mapped back with separate x/y gains (ultralytics.utils.ops.scale_boxes) and clipped.
"""

import ast
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort


PAD_VALUE = 114
IOU_THRESHOLD = 0.7
MAX_NMS_CANDIDATES = 30000
CLASS_OFFSET = 7680  # Ultralytics max_wh: shifts each class into its own range so NMS stays per class.
# Ultralytics Colors palette (RGB) indexed by class id; class 0 (shrimp-seed) draws in blue.
PALETTE = [
    (4, 42, 255), (11, 219, 235), (243, 243, 243), (0, 223, 183), (17, 31, 104),
    (255, 111, 221), (255, 68, 79), (204, 237, 0), (0, 243, 68), (189, 0, 255),
    (0, 180, 255), (221, 0, 186), (0, 255, 255), (38, 192, 0), (1, 255, 179),
    (125, 36, 255), (123, 0, 104), (255, 27, 108), (252, 109, 47), (162, 255, 11),
]


@dataclass
class Detection:
    class_id: int
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


class OnnxYoloDetector:
    def __init__(self, model_path: Path) -> None:
        options = ort.SessionOptions()
        threads = os.getenv("ORT_NUM_THREADS")
        if threads:
            options.intra_op_num_threads = int(threads)
        self.session = ort.InferenceSession(
            str(model_path), sess_options=options, providers=["CPUExecutionProvider"]
        )

        metadata = self.session.get_modelmeta().custom_metadata_map
        if metadata.get("end2end") == "True":
            # An end-to-end export returns (1, max_det, 6) final boxes and needs other post-processing.
            raise RuntimeError("best.onnx is an end-to-end export; app/detector.py expects raw predictions.")
        self.names: dict[int, str] = {
            int(key): value for key, value in ast.literal_eval(metadata["names"]).items()
        }
        self.stride = int(metadata.get("stride", 32))

        model_input = self.session.get_inputs()[0]
        self.input_name = model_input.name
        height, width = model_input.shape[2], model_input.shape[3]
        # A static export only accepts its own size; a dynamic one takes any multiple of the stride.
        self.fixed_size = (height, width) if isinstance(height, int) and isinstance(width, int) else None

    def predict(self, image_rgb: np.ndarray, conf: float, imgsz: int, max_det: int) -> list[Detection]:
        """Detect on an RGB uint8 image (H, W, 3); boxes are in that image's pixels."""
        if self.fixed_size:
            target, auto = self.fixed_size, False
        else:
            # check_imgsz rounds imgsz up to a multiple of the stride.
            size = max(math.ceil(imgsz / self.stride) * self.stride, self.stride)
            target, auto = (size, size), True

        tensor = self._letterbox(image_rgb, target, auto)
        output = self.session.run(None, {self.input_name: tensor})[0][0].T  # (anchors, 4 + classes)
        return self._postprocess(output, conf, max_det, tensor.shape[2:], image_rgb.shape[:2])

    def _letterbox(self, image: np.ndarray, target: tuple[int, int], auto: bool) -> np.ndarray:
        height, width = image.shape[:2]
        gain = min(target[0] / height, target[1] / width)
        new_width, new_height = max(round(width * gain), 1), max(round(height * gain), 1)
        pad_w, pad_h = target[1] - new_width, target[0] - new_height
        if auto:  # minimum rectangle: pad only up to the next multiple of the stride
            pad_w, pad_h = pad_w % self.stride, pad_h % self.stride
        pad_w, pad_h = pad_w / 2, pad_h / 2

        if (width, height) != (new_width, new_height):
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        top, bottom = round(pad_h - 0.1), round(pad_h + 0.1)
        left, right = round(pad_w - 0.1), round(pad_w + 0.1)
        image = cv2.copyMakeBorder(
            image, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(PAD_VALUE,) * 3
        )
        return np.ascontiguousarray(image.transpose(2, 0, 1)[None], dtype=np.float32) / 255.0

    @staticmethod
    def _postprocess(
        output: np.ndarray,
        conf: float,
        max_det: int,
        input_shape: tuple[int, int],
        original_shape: tuple[int, int],
    ) -> list[Detection]:
        class_scores = output[:, 4:]
        class_ids = class_scores.argmax(axis=1)
        scores = class_scores[np.arange(len(class_scores)), class_ids]
        keep = scores > conf
        boxes, scores, class_ids = output[keep, :4], scores[keep], class_ids[keep]
        if not len(scores):
            return []

        if len(scores) > MAX_NMS_CANDIDATES:
            top = scores.argsort(kind="stable")[::-1][:MAX_NMS_CANDIDATES]
            boxes, scores, class_ids = boxes[top], scores[top], class_ids[top]

        xyxy = np.empty_like(boxes)
        xyxy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
        xyxy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
        xyxy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
        xyxy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2

        kept = _nms(xyxy + class_ids[:, None] * CLASS_OFFSET, scores, IOU_THRESHOLD)[:max_det]
        xyxy, scores, class_ids = xyxy[kept], scores[kept], class_ids[kept]

        # ultralytics.utils.ops.scale_boxes: gains and padding recomputed from the rounded sizes.
        height, width = original_shape
        gain = min(input_shape[0] / height, input_shape[1] / width)
        new_height, new_width = max(round(height * gain), 1), max(round(width * gain), 1)
        gain_y, gain_x = new_height / height, new_width / width
        pad_x = round((input_shape[1] - new_width) / 2 - 0.1)
        pad_y = round((input_shape[0] - new_height) / 2 - 0.1)
        xyxy[:, [0, 2]] = ((xyxy[:, [0, 2]] - pad_x) / gain_x).clip(0, width)
        xyxy[:, [1, 3]] = ((xyxy[:, [1, 3]] - pad_y) / gain_y).clip(0, height)

        return [
            Detection(int(class_id), float(score), *(float(value) for value in box))
            for box, score, class_id in zip(xyxy, scores, class_ids)
        ]

    @staticmethod
    def annotate(image_rgb: np.ndarray, detections: list[dict[str, Any]]) -> np.ndarray:
        """Draw boxes only, like Ultralytics Results.plot(labels=False, conf=False). Returns RGB."""
        canvas = np.ascontiguousarray(image_rgb).copy()
        line_width = max(round(sum(canvas.shape) / 2 * 0.003), 2)
        for detection in detections:
            box = detection["box"]
            color = PALETTE[detection["class_id"] % len(PALETTE)]
            cv2.rectangle(
                canvas,
                (int(box["x1"]), int(box["y1"])),
                (int(box["x2"]), int(box["y2"])),
                color,
                thickness=line_width,
                lineType=cv2.LINE_AA,
            )
        return canvas


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> np.ndarray:
    """Greedy NMS like torchvision.ops.nms; returns kept indices by descending score."""
    x1, y1, x2, y2 = boxes.T
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort(kind="stable")[::-1]
    kept = []
    while order.size:
        best, rest = order[0], order[1:]
        kept.append(best)
        overlap_w = np.clip(np.minimum(x2[best], x2[rest]) - np.maximum(x1[best], x1[rest]), 0, None)
        overlap_h = np.clip(np.minimum(y2[best], y2[rest]) - np.maximum(y1[best], y1[rest]), 0, None)
        intersection = overlap_w * overlap_h
        iou = intersection / (areas[best] + areas[rest] - intersection)
        order = rest[iou <= iou_threshold]
    return np.array(kept, dtype=np.int64)
