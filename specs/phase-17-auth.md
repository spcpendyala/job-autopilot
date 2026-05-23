# Phase 17 — Multi-User Authentication
## Goal
Google OAuth sign-in. Each user gets isolated data.
Session-based auth. Per-user profiles, applications, outreach.
Simple admin view for Sai to see all users.

---

## New Dependencies
```bash
npm install passport passport-google-oauth20 express-session connect-sqlite3 cookie-parser
```

---

## Architecture

```
User signs in with Google
  → Google returns: id, name, email, picture
  → Session created with userId = Google sub
  → All DB queries filtered by userId
  → Profile stored at: core/profiles/users/{userId}/profile.json
  → Data in SQLite with userId column on every table
```

---

## DB Changes — Add userId to All Tables

Add migration function to db.js that runs on startup:

```javascript
function migrateAddUserId() {
  const tables = ['applications', 'outreach', 'approval_queue', 'apply_queue', 'profile_status', 'uploaded_resumes']
  for (const table of tables) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN user_id TEXT DEFAULT 'default'`).run()
    } catch { /* column already exists */ }
  }
}
```

Call `migrateAddUserId()` in `initDB()` after CREATE TABLE statements.

Update ALL db.js query functions to accept and filter by `userId`:
- `saveApplication(data, userId)` — include user_id in insert
- `getAllApplications(userId)` — WHERE user_id = ?
- `isDuplicate(url, userId)` — WHERE url_hash = ? AND user_id = ?
- `getStats(userId)` — WHERE user_id = ?
- `addToApprovalQueue(data, userId)` — include user_id
- `getApprovalQueue(status, userId)` — WHERE status = ? AND user_id = ?
- `getOutreach(status, userId)` — WHERE user_id = ?
- All other functions — add userId parameter

Existing data (userId='default') remains accessible.

---

## Files to Create

### 1. `services/auth.js`
Passport + Google OAuth setup.

```javascript
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const fs = require('fs')
const path = require('path')

const USERS_DIR = path.join(__dirname, '..', 'core', 'profiles', 'users')

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.AUTH_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  const userId = profile.id
  const userDir = path.join(USERS_DIR, userId)

  // Create user directory if new user
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
    // Create default config for new user
    fs.writeFileSync(path.join(userDir, 'config.json'), JSON.stringify({
      name: profile.displayName,
      email: profile.emails?.[0]?.value || '',
      picture: profile.photos?.[0]?.value || '',
      profileApproved: false,
      createdAt: new Date().toISOString()
    }, null, 2))
  }

  return done(null, { id: userId, name: profile.displayName, email: profile.emails?.[0]?.value, picture: profile.photos?.[0]?.value })
}))

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => {
  const userDir = path.join(USERS_DIR, id)
  if (!fs.existsSync(userDir)) return done(null, false)
  const config = JSON.parse(fs.readFileSync(path.join(userDir, 'config.json'), 'utf8'))
  done(null, { id, ...config })
})

module.exports = passport
```

---

### 2. Update `api/server.js` — Auth middleware

Add near top after existing requires:

```javascript
const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const cookieParser = require('cookie-parser')
const passport = require('./services/auth')

// Session middleware
app.use(cookieParser())
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'job-autopilot-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}))
app.use(passport.initialize())
app.use(passport.session())

// Auth middleware — attach userId to req
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.userId = req.user.id
    return next()
  }
  // Allow unauthenticated access in single-user mode
  if (process.env.MULTI_USER !== 'true') {
    req.userId = 'default'
    return next()
  }
  res.status(401).json({ error: 'Not authenticated', loginUrl: '/auth/google' })
}
```

Add auth routes:
```javascript
// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (req, res) => res.redirect('/?auth=success')
)

app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'))
})

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user, userId: req.userId })
})
```

Apply `requireAuth` middleware to ALL existing API routes.
Pass `req.userId` to all DB functions.

---

### 3. Update `.env.example`
```
# Auth
MULTI_USER=false
SESSION_SECRET=change-this-to-random-string
AUTH_CALLBACK_URL=http://localhost:3001/auth/google/callback
# For production: AUTH_CALLBACK_URL=http://34.148.196.49/auth/google/callback
```

---

### 4. Per-User Profile File Paths
Update all file path references to use userId-based paths when MULTI_USER=true:

```javascript
function getProfilePath(userId) {
  if (process.env.MULTI_USER === 'true' && userId !== 'default') {
    return path.join(__dirname, '..', 'core', 'profiles', 'users', userId, 'profile.json')
  }
  return path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`)
}

function getResumePath(userId) {
  if (process.env.MULTI_USER === 'true' && userId !== 'default') {
    return path.join(__dirname, '..', 'core', 'profiles', 'users', userId, 'base-resume.md')
  }
  return path.join(__dirname, '..', 'core', 'base-resume.md')
}
```

---

### 5. Admin endpoint
```javascript
// Admin only — Sai's Google ID
const ADMIN_ID = process.env.ADMIN_USER_ID || ''

app.get('/api/admin/users', requireAuth, (req, res) => {
  if (req.userId !== ADMIN_ID && process.env.MULTI_USER === 'true') {
    return res.status(403).json({ error: 'Admin only' })
  }
  const usersDir = path.join(__dirname, '..', 'core', 'profiles', 'users')
  if (!fs.existsSync(usersDir)) return res.json({ users: [] })
  const users = fs.readdirSync(usersDir).map(id => {
    const cfg = JSON.parse(fs.readFileSync(path.join(usersDir, id, 'config.json'), 'utf8'))
    const stats = getStats(id)
    return { id, ...cfg, stats }
  })
  res.json({ users })
})
```

Add to `.env.example`:
```
ADMIN_USER_ID=your-google-id
```

---

### 6. Dashboard Auth — `dashboard/src/components/AuthGate.jsx`

```jsx
// Wraps app content. Shows login if not authenticated in multi-user mode.
export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.json())
      .then(d => { setUser(d.user); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen">Loading...</div>

  // Single user mode — no auth needed
  if (!user && window.MULTI_USER !== 'true') return children

  if (!user) return (
    <div className="login-screen">
      <div className="login-card">
        <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
        <h1>Job AutoPilot</h1>
        <p>Your AI-powered job search co-pilot</p>
        <a href="/auth/google" className="btn google-btn">
          Sign in with Google
        </a>
      </div>
    </div>
  )

  return children
}
```

Update `App.jsx` to wrap with `<AuthGate>`.

---

## Done Test
```bash
# Test 1 — single user mode (default, MULTI_USER=false)
# All APIs work without auth
curl http://localhost:3001/api/applications
# Expected: returns data without auth

# Test 2 — enable multi-user
# Set MULTI_USER=true in .env, restart PM2
# curl http://localhost:3001/api/applications
# Expected: 401 with loginUrl

# Test 3 — OAuth flow
# Open http://34.148.196.49/auth/google in browser
# Sign in → redirected back → authenticated

# Test 4 — user isolation
# Sign in as user A → apply to job → sign out
# Sign in as user B → no applications visible

# Test 5 — admin view
# Set ADMIN_USER_ID to your Google ID in .env
# GET /api/admin/users
# Expected: list of all users with stats
```

Phase 17 complete when:
- Single-user mode works exactly as before (MULTI_USER=false)
- Multi-user mode isolates all data per Google account
- Dashboard shows login screen when not authenticated in multi-user mode
