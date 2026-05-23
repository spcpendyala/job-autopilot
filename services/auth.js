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

  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
    fs.writeFileSync(path.join(userDir, 'config.json'), JSON.stringify({
      name: profile.displayName,
      email: profile.emails?.[0]?.value || '',
      picture: profile.photos?.[0]?.value || '',
      profileApproved: false,
      createdAt: new Date().toISOString(),
    }, null, 2))
  }

  return done(null, {
    id: userId,
    name: profile.displayName,
    email: profile.emails?.[0]?.value,
    picture: profile.photos?.[0]?.value,
  })
}))

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser((id, done) => {
  const userDir = path.join(USERS_DIR, id)
  if (!fs.existsSync(userDir)) return done(null, false)
  try {
    const config = JSON.parse(fs.readFileSync(path.join(userDir, 'config.json'), 'utf8'))
    done(null, { id, ...config })
  } catch {
    done(null, false)
  }
})

module.exports = passport
