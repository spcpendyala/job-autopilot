# PHASE 4 — Onboarding (4-Screen Flow)

## Goal
New users must complete a 4-step setup before reaching the dashboard.
This collects their resume(s), builds their AI profile, and kicks off first discovery.

---

## Prompt for Claude Code

```
Phases 1–3 complete. App shell, sidebar, sign-in all work.
Now build the onboarding overlay that new users see.

CREATE dashboard/src/components/Onboarding.jsx

---

STRUCTURE:
- Full-screen overlay, z-index 1000, background rgba(8,8,8,0.97)
- White progress bar at top that fills as steps advance (25% → 50% → 75% → 100%)
- Centered card, max-width 560px, scrollable
- Cannot be skipped — user must complete all 4 steps

---

STEP 0 — WELCOME:

  Large emoji: 🚀 (52px, centered)
  Title: "Welcome to Job AutoPilot"
  Subtitle: "Your AI co-pilot for the job search. Let's set up your profile in about 3 minutes."

  3 feature boxes in a row (icons + short label):
    🔍  "Finds matching jobs"
    ✍️  "Tailors every resume"
    📩  "Monitors your inbox"

  Platform logos row (small grey text):
    "Works with: LinkedIn · Indeed · Upwork · Fiverr · Freelancer · Remote OK"

  [Get Started →] button (green, full-width)
  Small text: "No credit card needed"

---

STEP 1 — UPLOAD RESUMES:

  Title: "Upload Your Resume"
  Subtitle: "Claude reads your resume and builds your complete candidate profile automatically."

  Drop zone:
    Height: 140px, dashed border (1px dashed var(--border-hi))
    Hover: border turns green
    Drop: accept files
    onClick: open hidden <input type="file" id="ob-file" multiple accept=".pdf,.docx,.txt">
    Shows: 📁 "Drop files here or click to browse"
    Sub-text: "PDF, DOCX, or TXT  ·  Up to 6 files  ·  10MB each"

  File list (below drop zone):
    Each file: 📄 filename  (size in KB)  [×]
    × removes that file from state

  LinkedIn instructions (collapsible, starts collapsed):
    Toggle text: "🔗 How to download your LinkedIn profile as PDF ▼ / ▲"
    Expanded shows:
      1. Go to your LinkedIn profile
      2. Click "More" (below your name)
      3. Select "Save to PDF"
      4. Upload that file above

  Error box (only if upload failed): red border card with error message

  [Analyze & Build Profile →] button (green, full-width)
    Disabled if no files selected
    Loading state: Spinner + "Analyzing with Claude... (20–30 seconds)"
    
  On click:
    POST /api/profile/upload with FormData { resumes: files[] }
    On success: store response.profile in state → advance to step 2
    On error: show error message, stay on step 1

---

STEP 2 — REVIEW PROFILE:

  Title: "Here's what we found"
  Subtitle: "Check this over — you can edit everything later in Profile."

  Completeness bar:
    "Profile completeness" label + percentage right-aligned
    Bar color: green if ≥80%, yellow if 60–79%, red below 60%
    Computed from profileCompleteness(profile) in lib/api.js

  Profile summary card (dark surface background, padding 18px):
    NAME (large, bold, 18px)
    location  ·  email  ·  phone  (grey, 13px)

    SECTION: TARGET ROLES
      Tag chips for each role (max 6 shown)

    SECTION: EXPERIENCE
      List first 3 roles as "Title — Company · From–To"
      "+N more" if more than 3

    SECTION: CORE SKILLS
      Tag chips for first 14 skills
      "+N more" if more

    SECTION: EDUCATION
      "Degree — Institution · Year"

    Skip any section that is empty/null

  Two buttons at bottom:
    [← Re-upload]             (secondary, goes back to step 1)
    [Looks Good — Continue →] (primary, 2× wider)

  On approve:
    POST /api/profile/approve with { profile }
    On success: advance to step 3
    On error: show error toast, stay on step 2

  Small hint: "You can edit all details on the Profile page anytime"

---

STEP 3 — WHAT ARE YOU LOOKING FOR:

  Title: "What kind of work are you after?"
  Subtitle: "This helps us search the right platforms for you."

  Two groups of toggles:

  GROUP A — "Work Type" (checkboxes, can pick multiple):
    [■] Full-time employment
    [■] Contract / freelance projects
    [□] Part-time
    [□] Internship

  GROUP B — "Platforms to search" (toggles, can pick multiple):
    Salaried jobs:
      [■] Indeed       [■] LinkedIn       [■] Monster
      [■] Remote OK    [■] We Work Remotely  [■] Remotive
    Freelance gigs:
      [■] Upwork       [■] Fiverr
      [■] Freelancer.com  [■] PeoplePerHour

  Preferred location row:
    [■] Open to remote
    [□] On-site only
    City/country input (optional): placeholder "e.g. Toronto, ON"

  [Save & Find My First Jobs →] button (green, full-width)

  On click:
    POST /api/profile with updated preferences
    Then POST /api/discover (fire and forget — don't block)
    Advance to step 4

---

STEP 4 — DONE:

  Large emoji: 🎉 (52px, centered)
  Title: "You're all set!"

  While discovery is running (first 60 seconds):
    Spinner + "We're searching for jobs that match your profile..."
    "Checking: Indeed · Remote OK · Remotive · Upwork..."

  After 60s timeout OR if discovery responds:
    "Your first job matches are ready."

  [Go to Dashboard →] button (always enabled as soon as step 4 loads)
  On click: calls onComplete() prop

  Side note: "Discovery runs automatically every morning at 8am"

  On step 4 load:
    POST /api/discover in background (don't await, don't block the button)
    After 60 seconds max: update text to "ready" message regardless

---

WIRE INTO App.jsx:

  Import Onboarding from './components/Onboarding'

  In AppShell, when onboarding === true, render:
    <Onboarding onComplete={() => { setOnboarding(false); navigate('home') }} />

  This replaces the dev placeholder from Phase 3.
  Remove the "Skip (dev only)" button.

---

TEST:
  1. Sign in as a user with profileApproved = false
     → Full-screen onboarding overlay appears (no sidebar visible behind it)
     → Progress bar at 25% on step 0
     → Step 0: 3 feature boxes visible, platform list visible, Get Started works
     → Step 1: drop zone works, files appear in list, × removes them
     → Click Analyze with a real PDF → spinner shows → profile appears in step 2
     → Step 2: completeness bar renders, all non-empty sections show
     → Click Looks Good → step 3 → platform toggles work
     → Click Save & Find My First Jobs → step 4 → spinner shows
     → After a moment or clicking the button → onboarding dismissed → Home placeholder

  2. Sign in as a user with profileApproved = true
     → NO onboarding → goes straight to Home placeholder

  Stop here. Do not build Home yet.
```

---

## ✅ Phase 4 Complete When
- [ ] New user sees 4-step onboarding (cannot skip)
- [ ] Step 3 includes both salaried and freelance platform toggles
- [ ] Returning user skips onboarding entirely
- [ ] Discovery fires in the background on step 4
- [ ] No console errors
