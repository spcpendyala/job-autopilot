#!/bin/bash
GCP_IP="34.148.196.49"
GCP_USER="spcpendyala"

echo "🔨 Building dashboard..."
cd ~/Desktop/job-autopilot/dashboard
npx vite build --config vite.config.js

echo "📦 Pushing code to GitHub..."
cd ~/Desktop/job-autopilot
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')"
git push

echo "🚀 Deploying to server..."
ssh $GCP_USER@$GCP_IP "cd /home/$GCP_USER/job-autopilot && git pull && pm2 restart all"
scp -r ~/Desktop/job-autopilot/dashboard/dist/* $GCP_USER@$GCP_IP:/home/$GCP_USER/job-autopilot/dashboard-dist/

echo "✅ Done! Live at http://$GCP_IP"
