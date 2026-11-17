FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app
COPY pyproject.toml ./
COPY automatalab ./automatalab
RUN python -m pip install --no-cache-dir . && \
    useradd --create-home --uid 10001 automatalab

USER automatalab
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ['PORT'] + '/api/health', timeout=2)" || exit 1
CMD ["sh", "-c", "exec uvicorn automatalab.api.main:app --host 0.0.0.0 --port ${PORT}"]
