// Installs are cached by version, so a plugin's version and its marketplace
// entry must move together or users never receive the update
import { readFileSync } from 'node:fs'

const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const market = readJson('.claude-plugin/marketplace.json')

const mismatched = market.plugins.filter(entry => {
  const { version } = readJson(`${entry.source}/.claude-plugin/plugin.json`)
  if (version === entry.version) return false
  console.error(
    `✘ ${entry.name}: plugin.json is ${version}, marketplace.json is ${entry.version}`,
  )
  return true
})

if (mismatched.length) process.exit(1)
console.log('✔ Plugin versions match the marketplace')
