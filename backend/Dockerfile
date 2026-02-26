FROM python:3.11-slim

# Security: run as non-root
RUN groupadd -r statbot && useradd -r -g statbot -d /app statbot

WORKDIR /app

# Install system deps for matplotlib
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create workspace and charts dirs with proper permissions
RUN mkdir -p /app/workspace/charts && chown -R statbot:statbot /app

USER statbot

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
