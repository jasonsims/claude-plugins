#!/bin/bash
# Claude finished: release this session's caffeinate.
# stop.sh session-end: the session is over, so also forget its /awake on.
# shellcheck source-path=SCRIPTDIR
. "$(dirname "$0")/lib.sh"
sid=$(hook_sid "$(cat)")
[ -n "$sid" ] || exit 0
release "$(pidfile "$sid")"
[ "$1" = session-end ] && rm -f "$(flag "$sid")"
exit 0
