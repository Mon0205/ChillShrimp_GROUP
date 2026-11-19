"""Export models/best.pt to models/best.onnx for app/detector.py.

Run it whenever best.pt changes, in an environment with the training-time Ultralytics version:
    pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
    pip install ultralytics==8.4.198 "onnx>=1.12,<1.18" onnxslim onnxruntime==1.20.1
    python scripts/export_onnx.py

dynamic=True keeps the input size free, so imgsz and tiling (tile_size) still work as with best.pt.
YOLO26 is end-to-end (NMS-free): the graph already returns the final boxes, and the script prints
the output shape so app/detector.py can be checked against it.
"""
from pathlib import Path

import onnxruntime as ort
from ultralytics import YOLO

MODELS = Path(__file__).resolve().parents[1] / "models"


def main() -> None:
    model = YOLO(str(MODELS / "best.pt"))
    exported = Path(model.export(format="onnx", dynamic=True, simplify=True))
    target = MODELS / "best.onnx"
    if exported.resolve() != target.resolve():
        exported.replace(target)

    session = ort.InferenceSession(str(target), providers=["CPUExecutionProvider"])
    for item in session.get_inputs():
        print("input ", item.name, item.shape)
    for item in session.get_outputs():
        print("output", item.name, item.shape)
    meta = session.get_modelmeta().custom_metadata_map
    print("metadata", {key: meta[key] for key in sorted(meta) if key in ("names", "stride", "imgsz", "end2end", "task")})
    print(f"saved {target} ({target.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
