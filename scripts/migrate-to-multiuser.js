require('dotenv').config()
const fs = require('fs')
const path = require('path')

const DEFAULT_USER = 'default'
const BASE = path.join(__dirname, '..')
const USER_DIR = path.join(BASE, 'data', 'users', DEFAULT_USER)

;[USER_DIR, path.join(USER_DIR, 'resumes'), path.join(USER_DIR, 'outputs')].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

function copyIfMissing(src, dest) {
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest)
    return true
  }
  return false
}

const migrations = [
  [path.join(BASE,'core','profiles','sai.json'), path.join(USER_DIR,'profile.json')],
  [path.join(BASE,'core','base-resume.md'), path.join(USER_DIR,'base-resume.md')],
]
migrations.forEach(([src,dest]) => {
  if (copyIfMissing(src,dest)) console.log(`Migrated: ${path.basename(dest)}`)
  else console.log(`Skipped (already exists): ${path.basename(dest)}`)
})

const oldResumes = path.join(BASE,'core','resumes')
if (fs.existsSync(oldResumes)) {
  fs.readdirSync(oldResumes).forEach(f => copyIfMissing(path.join(oldResumes,f), path.join(USER_DIR,'resumes',f)))
  console.log('Migrated: resume variants')
}

const oldOutputs = path.join(BASE,'outputs')
if (fs.existsSync(oldOutputs)) {
  fs.readdirSync(oldOutputs).filter(f => {
    try { return fs.statSync(path.join(oldOutputs,f)).isDirectory() } catch { return false }
  }).forEach(folder => {
    const dest = path.join(USER_DIR,'outputs',folder)
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest,{recursive:true})
      fs.readdirSync(path.join(oldOutputs,folder)).forEach(file =>
        fs.copyFileSync(path.join(oldOutputs,folder,file), path.join(dest,file)))
    }
  })
  console.log('Migrated: application outputs')
}

console.log('\nMigration complete -> data/users/default/')
