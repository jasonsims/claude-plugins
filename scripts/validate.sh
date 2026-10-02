#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

claude plugin validate .
for dir in plugins/*/; do
  claude plugin validate "${dir%/}"
done

node scripts/check-versions.mjs
