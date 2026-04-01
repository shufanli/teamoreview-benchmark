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
    # Backup
    cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%s)"

    # Use python to insert location blocks before the last location / in the 443 block
    python3 << 'PYEOF'
import re

conf_path = "/home/work/codepulse-survey/nginx.conf"
with open(conf_path, "r") as f:
    content = f.read()

teamoreview_block = """
    location /teamoreview/_next/ {
        proxy_pass http://teamoreview-frontend:3000/teamoreview/_next/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /teamoreview/api/ {
        proxy_pass http://teamoreview-backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /teamoreview/ {
        proxy_pass http://teamoreview-frontend:3000/teamoreview/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
"""

# Find the HTTPS server block's catch-all "location / {" and insert before it
# The HTTPS block is the second server block
blocks = content.split("server {")
if len(blocks) >= 3:
    # blocks[0] = before first server
    # blocks[1] = HTTP (port 80)
    # blocks[2] = HTTPS (port 443)
    https_block = blocks[2]

    # Find the last "location / {" in the HTTPS block
    last_loc_idx = https_block.rfind("location / {")
    if last_loc_idx >= 0:
        https_block = https_block[:last_loc_idx] + teamoreview_block + "\n    " + https_block[last_loc_idx:]
        blocks[2] = https_block
        content = "server {".join(blocks)

with open(conf_path, "w") as f:
    f.write(content)

print("Nginx config updated with teamoreview locations")
PYEOF
fi

echo "=== Step 5: Reload nginx ==="
docker exec codepulse-survey-nginx-1 nginx -t 2>&1
docker exec codepulse-survey-nginx-1 nginx -s reload
echo "Nginx reloaded!"

echo "=== Step 6: Verify ==="
sleep 3
HEALTH=$(curl -s http://localhost:3001/teamoreview/api/health 2>/dev/null || curl -s http://teamoreview-backend:8000/api/health 2>/dev/null || echo "check_manually")
echo "Health check result: $HEALTH"

echo "=== Deployment complete! ==="
echo "Access at: https://teamocode.teamolab.com/teamoreview"
