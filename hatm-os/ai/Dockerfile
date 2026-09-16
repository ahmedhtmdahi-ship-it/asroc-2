FROM python:3.11-slim
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt requirements-embeddings.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Optional embedding layer (paraphrase-multilingual-MiniLM-L12-v2). Build with
#   docker compose build --build-arg WITH_EMBEDDINGS=1 ai
ARG WITH_EMBEDDINGS=0
RUN if [ "$WITH_EMBEDDINGS" = "1" ]; then \
      pip install --no-cache-dir torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu && \
      pip install --no-cache-dir sentence-transformers==3.1.1 ; fi
COPY . .
EXPOSE 8100
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
