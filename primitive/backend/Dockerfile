# ---- builder: install primitive ----
FROM golang:1.22 as builder
RUN go install github.com/fogleman/primitive@latest

# ---- runtime: python + primitive ----
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy primitive binary
COPY --from=builder /go/bin/primitive /usr/local/bin/primitive

# Workdir
WORKDIR /app

# Copy backend project
COPY pyproject.toml ./
COPY app ./app

# Install Python deps
RUN pip install --no-cache-dir -e .

# Create data dir
VOLUME ["/data"]

# Expose port
EXPOSE 8000

# Default command (prod)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 