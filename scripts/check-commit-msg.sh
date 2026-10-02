#!/usr/bin/env bash
# Usage: check-commit-msg.sh <file>        validate a commit message file (commit-msg hook)
#        check-commit-msg.sh --range A..B  validate every commit subject in a range (CI)
set -euo pipefail

pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .+'
# Git-generated subjects that shouldn't be rejected
allowed='^(Merge |Revert "|fixup! |squash! |amend! )'

check() {
  local subject=$1 label=$2
  if [[ $subject =~ $allowed || $subject =~ $pattern ]]; then
    return 0
  fi
  echo "✖ $label: \"$subject\"" >&2
  echo "  Expected: <type>(<scope>)?: <description>" >&2
  echo "  Types: feat fix docs style refactor perf test build ci chore revert" >&2
  return 1
}

if [[ ${1:-} == --range ]]; then
  failed=0
  while IFS=' ' read -r sha subject; do
    check "$subject" "${sha:0:7}" || failed=1
  done < <(git log --no-merges --format='%H %s' "$2")
  exit $failed
fi

subject=$(grep -v '^#' "$1" | head -n1)
check "$subject" "commit message"
