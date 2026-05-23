# Phase 11 — GCP Deployment
## Goal
Deploy Job AutoPilot to a GCP e2-micro VM (free forever).
API runs on GCP. Dashboard deploys to Vercel (free).
Deploy once, never touch the server again.

---

## What Claude Code Builds
1. `Dockerfile` — containerizes the Node.js API
2. `ecosystem.config.js` — PM2 process manager config (keeps app alive, auto-restarts)
3. `scripts/deploy.sh` — one-command deploy script for future updates
4. `nginx.conf` — reverse proxy config (routes port 80 → 3001)
5. `.env.production.example` — production env template
6. `dashboard/vercel.json` — Vercel deployment config
7. Update `CLAUDE.md` — mark Phase 11 complete

---

## Files to Create

### 1. `Dockerfile`
```dockerfile
FROM node:20-slim

# Install dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create required directories
RUN mkdir -p data outputs core/profiles

# Expose API port
EXPOSE 3001

# Start with PM2
CMD ["node", "api/server.js"]
```

### 2. `ecosystem.config.js` (PM2 config)
```javascript
module.exports = {
  apps: [
    {
      name: 'job-autopilot-api',
      script: 'api/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/job-autopilot/error.log',
      out_file: '/var/log/job-autopilot/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'job-autopilot-cron',
      script: 'scripts/daily-scan.js',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 8 * * *',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/job-autopilot/cron-error.log',
      out_file: '/var/log/job-autopilot/cron-out.log',
    },
  ],
}
```

### 3. `nginx.conf`
```nginx
server {
    listen 80;
    server_name _;

    # API routes
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/api/health;
    }

    # Block direct access to sensitive paths
    location ~ /\. {
        deny all;
    }
}
```

### 4. `scripts/deploy.sh`
```bash
#!/bin/bash
# Run this on your local machine to deploy updates to GCP
# Usage: ./scripts/deploy.sh

set -e

GCP_USER="ubuntu"
GCP_IP="YOUR_GCP_IP"  # Replace with your VM's external IP
APP_DIR="/home/ubuntu/job-autopilot"

echo "🚀 Deploying Job AutoPilot to GCP..."

# Push latest code
echo "📦 Syncing code..."
rsync -avz --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'data' \
  --exclude 'outputs' \
  --exclude '.env' \
  --exclude 'core/google-token.json' \
  --exclude 'core/profiles' \
  . $GCP_USER@$GCP_IP:$APP_DIR/

# Install dependencies and restart
echo "🔄 Installing dependencies and restarting..."
ssh $GCP_USER@$GCP_IP "cd $APP_DIR && npm install --only=production && pm2 restart all"

echo "✅ Deployment complete!"
echo "🌐 API running at http://$GCP_IP/api/health"
```

### 5. `.env.production.example`
```
# Copy this to .env on your GCP server
# Fill in all values before starting the app

ANTHROPIC_API_KEY=sk-ant-...
BETA_MODE=false
ACTIVE_PROFILE=sai
PORT=3001
NODE_ENV=production

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TRACKING_SHEET_ID=
DRIVE_FOLDER_ID=

JOB_RSS_FEEDS=
WATCH_COMPANIES=https://boards.greenhouse.io/anthropic
```

### 6. `dashboard/vercel.json`
```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR_GCP_IP/api/$1"
    }
  ]
}
```

Note: `YOUR_GCP_IP` in vercel.json must be replaced with the actual GCP VM external IP after the VM is created.

### 7. Update `dashboard/vite.config.js`
Add production API URL support:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: path.join(__dirname, 'dist'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
```

---

## Update `.gitignore`
Make sure these are excluded (never commit to GitHub):
```
.env
.env.production
core/google-token.json
core/profiles/*.json
data/
outputs/
node_modules/
.DS_Store
```

---

## Update `package.json`
Add production scripts:
```json
"scripts": {
  "apply": "node scripts/apply.js",
  "analyze": "node scripts/analyze.js",
  "discover": "node scripts/discover.js",
  "full": "node scripts/apply.js --full",
  "prep": "node scripts/prep.js",
  "scan": "node scripts/daily-scan.js",
  "setup-google": "node scripts/setup-google.js",
  "start": "node api/server.js",
  "start:prod": "pm2 start ecosystem.config.js",
  "stop:prod": "pm2 stop all",
  "logs": "pm2 logs",
  "dev": "concurrently \"node api/server.js\" \"vite --config dashboard/vite.config.js\""
}
```

---

## Done Test (Claude Code runs these locally)
```bash
# Test 1 — Dockerfile builds without errors
docker build -t job-autopilot . 2>&1 | tail -5
# Expected: "Successfully built [hash]"

# Test 2 — All required files exist
ls Dockerfile ecosystem.config.js nginx.conf scripts/deploy.sh .env.production.example dashboard/vercel.json
# Expected: all files listed

# Test 3 — deploy.sh is executable
chmod +x scripts/deploy.sh && echo "deploy.sh is executable"

# Test 4 — vercel.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('dashboard/vercel.json'))" && echo "vercel.json valid"
```

Phase 11 is complete when all 4 tests pass.
Do NOT attempt to connect to GCP or Vercel — that happens in the manual steps below.
