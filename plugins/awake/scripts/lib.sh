#!/bin/bash
# Shared by the awake scripts. Per session: session-<id>.on (keep-awake wanted)
# and session-<id>.pid (the caffeinate holding the Mac awake right now).
state="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/awake}"

# hook_sid <hook json>: the session id from a hook's input
hook_sid() { sed -n 's/.*"session_id" *: *"\([^"]*\)".*/\1/p' <<<"$1" | head -1; }
flag() { echo "$state/session-$1.on"; }
pidfile() { echo "$state/session-$1.pid"; }

# running <pidfile>: true if it names a live caffeinate (a reused PID doesn't count)
running() {
  local pid
  pid=$(cat "$1" 2>/dev/null) || return 1
  [ -n "$pid" ] && [ "$(ps -p "$pid" -o comm= 2>/dev/null | xargs basename 2>/dev/null)" = caffeinate ]
}

# release <pidfile>: stop that caffeinate if it's still ours, then forget it
release() {
  running "$1" && kill "$(cat "$1")" 2>/dev/null
  rm -f "$1"
}

# sessions: every session id with a flag or pidfile
sessions() {
  local f
  for f in "$state"/session-*.on "$state"/session-*.pid; do
    [ -e "$f" ] || continue
    f=${f##*/session-}; echo "${f%.*}"
  done | sort -u
}
