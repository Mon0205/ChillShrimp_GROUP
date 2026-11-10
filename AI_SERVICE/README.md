# AI_SERVICE — Shrimp Seed Detection

AI inference service for shrimp seed detection and counting. It exposes a FastAPI endpoint using the included **YOLO26s** model (`v8_yolo26s_seed0`) and uploads the annotated image to Cloudinary after each inference. The original image is also backed up unless the caller sends `save_original=false` (the main backend does).

## Contents

- `app/`: FastAPI service, Cloudinary configuration and `photo_check.py` (capture-quality warnings).
- `models/best.pt`: trained YOLO26s model (one class, `shrimp-seed`).
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

**YOLO26 needs `ultralytics>=8.4`.** Do not downgrade to 8.3.x: it cannot load this model.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | – | Required for `/predict` |
| `CLOUDINARY_INSPECTION_FOLDER` | `chillshrimp/ai-inspections/originals` | Folder for originals; annotated images go to `<folder>/annotated` |
| `MODEL_VERSION` | `v8_yolo26s_seed0` | Returned as `model_version`; the backend stores it with every inspection. Change it whenever `models/best.pt` changes |
| `DETECTION_CONF` | `0.35` | Confidence threshold when the caller sends no `conf` |
| `MODEL_PATH` | `models/best.pt` | Model file |

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

Provide the Cloudinary variables through Docker Compose or deployment secrets. Do not put real credentials in the image or Git. The Dockerfile installs the CPU build of PyTorch first, then `requirements.txt`, and `libgl1`/`libglib2.0-0` because OpenCV needs them on `python:3.11-slim`.

## Main project Compose

The root `docker-compose.yml` builds this folder as `ai-service` and exposes its Swagger UI at `http://localhost:8001/docs`. `models/best.pt` and the Python packages are baked into the image, so after changing the model or `requirements.txt` rebuild with `docker compose up --build ai-service`. `app/` is mounted into the container, so code edits reload automatically.

The backend calls this service through `AI_SERVICE_URL` after an inspection image is saved. It sends the already stored original image with `save_original=false`, then records the returned count, detections, annotated image URL and `model_version`.

Every `/predict` uploads the annotated image (and, unless `save_original=false`, the original) to Cloudinary. Make sure that is acceptable for your data.
