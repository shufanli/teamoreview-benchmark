#!/usr/bin/env python3
"""Update nginx config to add teamoreview location blocks."""

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

# Split by "server {" to find the HTTPS block (third segment)
blocks = content.split("server {")
if len(blocks) >= 3:
    https_block = blocks[2]
    # Find the last "location / {" (catch-all) and insert before it
    last_loc_idx = https_block.rfind("location / {")
    if last_loc_idx >= 0:
        https_block = https_block[:last_loc_idx] + teamoreview_block + https_block[last_loc_idx:]
        blocks[2] = https_block
        content = "server {".join(blocks)

with open(conf_path, "w") as f:
    f.write(content)

print("Nginx config updated with teamoreview locations")
