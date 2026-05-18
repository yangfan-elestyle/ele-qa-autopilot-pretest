# wrangler 调用 buildx 时自动注入 --platform=linux/amd64 (CF Containers 要求).
FROM python:3.13-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    EXIFTOOL_PATH=/usr/bin/exiftool \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    MARKITDOWN_ENABLE_PLUGINS=True \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        exiftool \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "markitdown-mcp==0.0.1a4" \
    && pip install --no-cache-dir "markitdown[all]==0.1.5"

WORKDIR /workdir

EXPOSE 8080

ENTRYPOINT ["markitdown-mcp", "--http", "--host", "0.0.0.0", "--port", "8080"]
