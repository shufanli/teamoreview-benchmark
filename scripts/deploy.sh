#!/bin/bash
set -e

PROJECT_DIR="/home/work/teamoreview"
NGINX_CONF="/home/work/codepulse-survey/nginx.conf"
REPO_URL="https://github.com/shufanli/teamoreview-benchmark.git"

echo "=== Step 1: Clone or update code ==="
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/main
else
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo "=== Step 2: Build and start containers ==="
cd "$PROJECT_DIR"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo "=== Step 3: Wait for health check ==="
for i in $(seq 1 30); do
    if docker exec teamoreview-backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" 2>/dev/null; then
        echo "Backend healthy!"
        break
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

echo "=== Step 4: Update nginx config ==="
if grep -q "teamoreview" "$NGINX_CONF"; then
    echo "Nginx config already has teamoreview, skipping update"
else
    cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%s)"
    
    python3 /home/work/teamoreview/scripts/update_nginx.py
fi

echo "=== Step 5: Reload nginx ==="
docker exec codepulse-survey-nginx-1 nginx -t 2>&1
docker exec codepulse-survey-nginx-1 nginx -s reload
echo "Nginx reloaded!"

echo "=== Step 6: Final verify ==="
sleep 2
docker ps --filter "name=teamoreview" --format "table {{.Names}}\t{{.Status}}"
echo "=== Deployment complete! ==="
