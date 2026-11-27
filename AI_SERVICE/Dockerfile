FROM python:3.11-slim

# ORT_NUM_THREADS=1: free hosts give a fraction of one CPU, so extra threads only add contention.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/models/best.onnx \
    ORT_NUM_THREADS=1

WORKDIR /app

# opencv-python-headless needs no libGL/X11, so no apt packages are installed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY models ./models

EXPOSE 8001
# Render passes the port to listen on in $PORT; docker compose overrides the command anyway.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
