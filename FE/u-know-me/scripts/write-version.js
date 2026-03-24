const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const appRoot = path.resolve(__dirname, '..')
const publicDir = path.join(appRoot, 'public')
const generatedDir = path.join(appRoot, 'src', 'generated')
const versionJsonPath = path.join(publicDir, 'version.json')
const buildVersionPath = path.join(generatedDir, 'build-version.js')

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z')

const getGitRevision = () => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: appRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch (error) {
    return 'nogit'
  }
}

const version = `${timestamp}-${getGitRevision()}`

fs.mkdirSync(publicDir, { recursive: true })
fs.mkdirSync(generatedDir, { recursive: true })

fs.writeFileSync(
  versionJsonPath,
  `${JSON.stringify({ version }, null, 2)}\n`,
  'utf8'
)

fs.writeFileSync(
  buildVersionPath,
  `export const BUILD_VERSION = '${version}'\n`,
  'utf8'
)

console.log(`Generated build version: ${version}`)
