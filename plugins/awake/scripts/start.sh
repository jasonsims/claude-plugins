#!/bin/bash
# Keep the Mac awake for this turn, only if this session ran /awake on.
command -v caffeinate >/dev/null 2>&1 || exit 0
# shellcheck source-path=SCRIPTDIR
. "$(dirname "$0")/lib.sh"
sid=$(hook_sid "$(cat)")
[ -n "$sid" ] && [ -f "$(flag "$sid")" ] || exit 0
running "$(pidfile "$sid")" && exit 0
# -i: no idle sleep (display may still turn off). -t: 4-hour safety cap.
nohup caffeinate -i -t 14400 >/dev/null 2>&1 &
echo $! > "$(pidfile "$sid")"
disown
exit 0
