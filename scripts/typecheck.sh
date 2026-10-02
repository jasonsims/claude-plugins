#!/usr/bin/env bash
# Mods are typed against declarations the engine writes into
# <plugin>/.claude-plugin/types/ when it loads the plugin (hot reload or
# --plugin-dir). Those are build-specific and gitignored, so a plugin that
# hasn't been loaded locally yet is skipped rather than failed.
set -euo pipefail
cd "$(dirname "$0")/.."

status=0
for dir in plugins/*/; do
  dir=${dir%/}
  [[ -d $dir/hooks ]] || continue
  if [[ ! -f $dir/.claude-plugin/types/tsconfig.json ]]; then
    echo "skip $dir (no engine types yet: run claude --plugin-dir $dir once)"
    continue
  fi
  echo "tsc $dir"
  npx tsc -p "$dir" || status=1
done
exit $status
