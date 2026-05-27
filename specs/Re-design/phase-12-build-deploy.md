# PHASE 12 — Build + Deploy to GCP

## Goal
Pre-deploy checklist, production build, and live deployment to your GCP server.

---

## Prompt for Claude Code

```
All pages are built (Phases 1–11 complete).
Now build the dashboard and deploy to GCP.

---

STEP A — Pre-deploy checks:

1. Start dev server and check for errors:
   cd dashboard && npm run dev
   Open http://localhost:5173
   Open DevTools → Console tab
   Fix any red errors before continuing.

2. Verify all pages load without crashing:
   Navigate to: Home | Pipeline | Find a Job | Inbox | Freelance | Profile | Settings
   Each must render (even if empty) within 5 seconds — no blank screens, no spinners that hang.

3. Verify data isolation (CRITICAL for multi-user SaaS):
   Sign in as User A, note their applications.
   Sign in as User B (different browser/incognito).
   User B must NOT see User A's data.

   Run these curl checks:
     curl http://localhost:3001/api/applications
     → only your own applications, NOT all users'

     curl http://localhost:3001/api/approval-queue
     → only your own queue items

4. Check all backend fixes from Phase 1 still pass:
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/setup-status
   curl "http://localhost:3001/api/applications?status=discovered&limit=5"

---

STEP B — Set ADMIN_USER_ID if not already done:

  SSH into GCP:
    ssh spcpendyala@34.148.196.49

  Get your Google user ID (sign in via browser first, then):
    curl http://localhost:3001/auth/me
    # copy the "userId" value from the response

  Add to .env:
    echo 'ADMIN_USER_ID=paste-your-google-id-here' >> /home/spcpendyala/job-autopilot/.env

---

STEP C — Production build:

  cd dashboard
  npm install
  npx vite build
  # Output → dashboard/dist/
  # Verify: ls dashboard/dist/ should show index.html and assets/

---

STEP D — Deploy to GCP:

  From your LOCAL machine (not the GCP server):

  # 1. Sync all code files (excludes large/private directories):
  rsync -avz \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'data' \
    --exclude 'uploads' \
    --exclude '.env' \
    --exclude 'dashboard/node_modules' \
    --exclude 'dashboard/dist' \
    . spcpendyala@34.148.196.49:/home/spcpendyala/job-autopilot/

  # 2. Copy the production build:
  scp -r dashboard/dist/* spcpendyala@34.148.196.49:/home/spcpendyala/job-autopilot/dashboard-dist/

  # 3. Restart the server on GCP:
  ssh spcpendyala@34.148.196.49 "
    cd /home/spcpendyala/job-autopilot
    npm install --production
    pm2 restart all
    pm2 save
    pm2 status
  "

---

STEP E — Verify live:

  Open http://34.148.196.49 in browser
  
  Check 1: Sign-out state → sign-in screen with Google button
  Check 2: Sign in → onboarding (new user) OR Home page (returning user)
  Check 3: All 7 nav items work (including Inbox and Freelance)
  Check 4: Admin link ONLY visible to admin user
  Check 5: No console errors in browser DevTools
  Check 6: Different users see different data

  If anything is broken:
    ssh spcpendyala@34.148.196.49 "pm2 logs job-autopilot-api --lines 50"
    Fix the error and re-deploy.

---

DONE when:
  http://34.148.196.49 loads correctly
  Full flow works: sign-in → onboarding → Home → apply
  No console errors
  Data isolation confirmed
```

---

## ✅ Phase 12 Complete When
- [ ] `npm run build` completes without errors
- [ ] Live URL loads sign-in screen
- [ ] Full sign-in → onboarding → home flow works
- [ ] All 7 nav items functional on live server
- [ ] Admin-only link confirmed
- [ ] Data isolation confirmed (users only see their own data)
