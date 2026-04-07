# -------- Base Image --------
FROM python:3.10-slim-bookworm

# -------- Environment Variables --------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    XDG_CACHE_HOME=/app/cache

WORKDIR /app

# -------- System Dependencies --------
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    portaudio19-dev \
    libasound2 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# -------- Copy requirements --------
COPY requirements.txt .

# -------- Upgrade build tools --------
RUN pip install --no-cache-dir --upgrade pip setuptools wheel cython

# -------- Install dependencies --------
# Disable build isolation so setuptools/pkg_resources are available
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# -------- Install gunicorn --------
RUN pip install --no-cache-dir gunicorn

# -------- Download NLTK data --------
RUN python - <<EOF
import nltk
nltk.download("punkt_tab")
nltk.download("averaged_perceptron_tagger_eng")
nltk.download("wordnet")
EOF

# -------- Copy project --------
COPY . .

# -------- Prepare directories --------
RUN mkdir -p /app/media /app/staticfiles /app/cache

# -------- Collect static files --------
RUN python manage.py collectstatic --noinput || true

# -------- Expose port --------
EXPOSE 8000

# -------- Start server --------
CMD ["gunicorn", "backend.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--threads", "4", \
     "--timeout", "180"]