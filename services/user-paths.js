const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, '..', 'data')

function getProfilePath(userId) {
  if (userId && userId !== 'default') {
    const userDir = path.join(DATA_DIR, 'users', userId)
    fs.mkdirSync(userDir, { recursive: true })
    return path.join(userDir, 'profile.json')
  }
  // Single-user mode: prefer core/profiles/sai.json, fallback to default.json
  const saiPath = path.join(__dirname, '..', 'core', 'profiles', 'sai.json')
  if (fs.existsSync(saiPath)) return saiPath
  const defaultPath = path.join(__dirname, '..', 'core', 'profiles', 'default.json')
  if (fs.existsSync(defaultPath)) return defaultPath
  // Last resort: data/users/default/profile.json
  const fallbackDir = path.join(DATA_DIR, 'users', 'default')
  fs.mkdirSync(fallbackDir, { recursive: true })
  return path.join(fallbackDir, 'profile.json')
}

function getResumePath(userId) {
  if (userId && userId !== 'default') {
    return path.join(DATA_DIR, 'users', userId, 'base-resume.md')
  }
  const coreResume = path.join(__dirname, '..', 'core', 'base-resume.md')
  if (fs.existsSync(coreResume)) return coreResume
  return path.join(DATA_DIR, 'users', 'default', 'base-resume.md')
}

function getUserDir(userId) {
  const dir = (userId && userId !== 'default')
    ? path.join(DATA_DIR, 'users', userId)
    : path.join(DATA_DIR, 'users', 'default')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getUserOutputDir(userId) {
  const dir = path.join(getUserDir(userId), 'outputs')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getUserDataDir(userId) {
  return getUserDir(userId)
}

module.exports = { getProfilePath, getResumePath, getUserDir, getUserOutputDir, getUserDataDir }
