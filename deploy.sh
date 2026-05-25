#!/bin/bash
set -e
GCP_IP="34.148.196.49"
GCP_USER="spcpendyala"

echo "🔨 Building dashboard..."
cd ~/Desktop/job-autopilot/dashboard
npx vite build --config vite.config.js

echo "📦 Pushing code to GitHub..."
cd ~/Desktop/job-autopilot
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')" || echo "Nothing to commit"
git push

echo "🚀 Deploying to server..."
ssh $GCP_USER@$GCP_IP "
  set -e
  cd /home/$GCP_USER/job-autopilot
  git fetch origin
  git reset --hard origin/main
  npm install --production
  sudo mkdir -p /var/log/job-autopilot
  sudo chown $GCP_USER:$GCP_USER /var/log/job-autopilot 2>/dev/null || true
  pm2 restart all
  pm2 save
"
scp -r ~/Desktop/job-autopilot/dashboard/dist/* $GCP_USER@$GCP_IP:/home/$GCP_USER/job-autopilot/dashboard-dist/

echo "✅ Done! Live at http://$GCP_IP"
