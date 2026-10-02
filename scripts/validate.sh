#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

claude plugin validate .
for dir in plugins/*/; do
  claude plugin validate "${dir%/}"
done

# Installs are cached by version, so a plugin's version and its marketplace
# entry must move together or users never receive the update
node --input-type=module -e '
import { readFileSync } from "node:fs"
const market = JSON.parse(readFileSync(".claude-plugin/marketplace.json", "utf8"))
let failed = false
for (const entry of market.plugins) {
  const manifest = JSON.parse(
    readFileSync(`${entry.source}/.claude-plugin/plugin.json`, "utf8"),
  )
  if (manifest.version !== entry.version) {
    console.error(
      `✘ ${entry.name}: plugin.json is ${manifest.version}, marketplace.json is ${entry.version}`,
    )
    failed = true
  }
}
if (failed) process.exit(1)
console.log("✔ Plugin versions match the marketplace")
'
