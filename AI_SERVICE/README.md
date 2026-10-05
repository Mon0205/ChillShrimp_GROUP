# AI_SERVICE — Shrimp Seed Detection

AI inference service extracted from the shrimp-seed training project. It exposes a FastAPI endpoint using the included YOLOv8 model and uploads annotated results to Cloudinary after successful inference. Direct `/predict` calls also back up the original image by default.

## Contents

- `app/`: FastAPI service and Cloudinary configuration.
- `models/best.pt`: trained YOLOv8n model.
- `requirements.txt`: service dependencies.
- `.env.example`: placeholder environment variables only; no credentials are included.
- `Dockerfile`: container build definition.

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

Fill the three Cloudinary values in `.env`. Open `http://localhost:8001/docs` to try `POST /predict`, or `http://localhost:8001/health` to inspect service status. The API requires Cloudinary configuration for a successful `/predict` response.

## API

`POST /predict` accepts multipart form field `file` and optional query parameters `conf` (default `0.25`), `imgsz` (default `640`), and `save_original` (default `true`). It returns the shrimp count, detection class/confidence/boxes, `model_version`, and Cloudinary `annotated_image_url`. When `save_original=true`, it also backs up the original image and returns `image_url`/`public_id`.

`GET /health` reports service, model-file, model-load and Cloudinary configuration status.

## Docker

Build from this directory:

```powershell
docker build -t shrimp-ai-service .
```

Provide `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` through Docker Compose or deployment secrets. Do not put real credentials in the image or Git.

## Main project Compose

The root `docker-compose.yml` builds this folder as `ai-service` and exposes its Swagger UI at `http://localhost:8001/docs`. Create `AI_SERVICE/.env` from `.env.example`, then copy only the three Cloudinary credential values from `BE/.env`. Do not point this service at `BE/.env`: that file also contains database, authentication, and SMTP secrets.

Annotated images are uploaded to the same Cloudinary account as the backend, under `chillshrimp/ai-inspections/originals/annotated` by default. Direct `/predict` calls save originals under `chillshrimp/ai-inspections/originals`. The AI container uses its own restricted environment file; no credentials are baked into the image.

The backend calls this service through `AI_SERVICE_URL` after an inspection image is saved. The backend sends the already stored original image with `save_original=false`, then records the returned count, detections, confidence, model version, and annotated image URL in `ai_inspections`. The frontend only calls backend endpoints. In Compose, `AI_SERVICE_URL` points to `http://ai-service:8001`; for a locally started backend, set it to `http://localhost:8001`.
