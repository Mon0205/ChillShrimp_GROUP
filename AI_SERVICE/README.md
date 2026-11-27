# AI_SERVICE — Shrimp Seed Detection

AI inference service for shrimp seed detection and counting. It exposes a FastAPI endpoint using the included **YOLO26s** model (`v8_yolo26s_seed0`) and uploads the annotated image to Cloudinary after each inference. The original image is also backed up unless the caller sends `save_original=false` (the main backend does).

## Contents

- `app/`: FastAPI service, Cloudinary configuration, `detector.py` (YOLO on ONNX Runtime) and `photo_check.py` (capture-quality warnings).
- `models/best.pt`: trained YOLO26s model (one class, `shrimp-seed`), kept for re-exporting.
- `models/best.onnx`: the same model exported to ONNX; this is what the service runs.
- `scripts/export_onnx.py`: re-creates `best.onnx` from `best.pt`.
- `docs/BAO_CAO_MODEL_V8_YOLO26S_SEED0.md`: full model report (dataset, training, accuracy, labelling and photo-capture rules).
- `requirements.txt`, `.env.example`, `Dockerfile`.

## Run locally (PowerShell)

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Fill the three Cloudinary values in `.env`. Open `http://localhost:8001/docs` to try `POST /predict`, or `http://localhost:8001/health`. `/predict` returns 503 unless Cloudinary is configured.

## ONNX Runtime instead of PyTorch

The service runs `models/best.onnx` with ONNX Runtime (`app/detector.py`), so the image has no PyTorch or Ultralytics and fits the 512 MB of Render's free plan. `detector.py` reproduces Ultralytics 8.4.198 `predict` (rect letterbox, best class with score > conf, class-aware NMS at IoU 0.7, `max_det`, `scale_boxes`). Checked against `best.pt` through the same `run_detection`: 47 images × 3 settings (conf 0.35 and 0.25, tiling off and `tile_size=320`), 138/138 runs with the same count, boxes within 0.01 px.

Peak memory of the process (Windows, `ORT_NUM_THREADS=1`): about 340 MB for a 640 px photo, 360 MB for a 2048 px photo (the size the app's camera sends), 450 MB for a 12 MP photo.

**When `best.pt` changes, re-export.** Exporting needs the training-time Ultralytics (`ultralytics==8.4.198`, YOLO26 cannot load in 8.3.x) in a separate environment; see the docstring of `scripts/export_onnx.py`. Then change `MODEL_VERSION`. The model's head is not end-to-end (`end2end=False` in the ONNX metadata), so NMS runs in `detector.py`; it refuses an end-to-end export.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | – | Required for `/predict` |
| `CLOUDINARY_INSPECTION_FOLDER` | `chillshrimp/ai-inspections/originals` | Folder for originals; annotated images go to `<folder>/annotated` |
| `MODEL_VERSION` | `v8_yolo26s_seed0_onnx` | Returned as `model_version`; the backend stores it with every inspection. Change it whenever the model changes |
| `DETECTION_CONF` | `0.35` | Confidence threshold when the caller sends no `conf` |
| `CROWD_OVERLAP_RATIO_MAX` | `0.25` | `crowded` photo warning: share of boxes whose IoU with another box exceeds 0.1. Provisional, not calibrated on dense photos |
| `CROWD_COVERAGE_MAX` | `0.30` | `crowded` photo warning: sum of box areas divided by image area. Provisional |
| `MODEL_PATH` | `models/best.onnx` | Model file |
| `ORT_NUM_THREADS` | all cores (`1` in the Dockerfile) | ONNX Runtime threads; free hosts give a fraction of one CPU |
| `PORT` | `8001` | Port the Docker image listens on; Render sets it |

## API

`POST /predict` takes multipart field `file` and optional query parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `conf` | `DETECTION_CONF` (0.35) | Confidence threshold |
| `imgsz` | 640 | Inference size |
| `save_original` | `true` | `false` skips the Cloudinary backup of the original (the backend already stores it) |
| `max_det` | 1000 | Maximum boxes |
| `tile_size` | 0 | 0 = whole image. Otherwise at least 160 and at most 64 tiles per image (else 422). Use e.g. 320 only for dense small shrimp (type A) |
| `tile_overlap` | 0.2 | Overlap between tiles |
| `merge_iou` | 0.5 | IoU used to merge duplicates across tiles |

Response fields used by the backend (do not remove or rename): `count`, `detections` (`class_id`, `class`, `confidence`, `box`), `annotated_image_url`, `model_version`. Also returned: `image_saved`, `image_url`, `public_id`, `annotated_public_id`, `image`, `max_det`, `max_det_reached`, `mean_confidence`, `low_confidence_ratio`, and **`photo_warnings`** (list of `{code, level, message}`; empty when nothing to flag).

`GET /health` reports model-file, model-load, model version, default `conf` and Cloudinary status.

## Reading the result honestly

- Scope: type A (small dark shrimp, many per image) and type C (close-up, sparse). Translucent shrimp with an orange gut (type B) are **not supported**; large shrimp are out of scope.
- `conf=0.35` gave the lowest count error on the measured photos (about 11%), but it was chosen on those photos, so that figure is optimistic. At `0.25` the model over-counts (about 22% error on type A). Real error varies between photos and places; see sections 8 and 9 of the report.
- Most type A training data comes from one place on two days; generalisation to other places is not proven.
- `photo_warnings` thresholds are heuristic and not validated against count errors.
- The report concludes the model is **not yet reliable enough to be treated as final**; keep the result as decision support, with the technician's own count alongside.

## Docker

Build from this directory:

```powershell
docker build -t shrimp-ai-service .
```

Provide the Cloudinary variables through Docker Compose or deployment secrets. Do not put real credentials in the image or Git. The Dockerfile installs only `requirements.txt` (ONNX Runtime, `opencv-python-headless`, no PyTorch, no system packages) and leaves `best.pt` out of the image (`.dockerignore`).

## Main project Compose

The root `docker-compose.yml` builds this folder as `ai-service` and exposes its Swagger UI at `http://localhost:8001/docs`. `models/best.onnx` and the Python packages are baked into the image, so after changing the model or `requirements.txt` rebuild with `docker compose up --build ai-service`. `app/` is mounted into the container, so code edits reload automatically.

The backend calls this service through `AI_SERVICE_URL` after an inspection image is saved. It sends the already stored original image with `save_original=false`, then records the returned count, detections, annotated image URL and `model_version`.

Every `/predict` uploads the annotated image (and, unless `save_original=false`, the original) to Cloudinary. Make sure that is acceptable for your data.
