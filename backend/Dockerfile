FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and image tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Ensure storage directories exist
RUN mkdir -p uploads/profiles qr_codes

EXPOSE 8000

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--workers", "2", "--bind", "0.0.0.0:8000"]
