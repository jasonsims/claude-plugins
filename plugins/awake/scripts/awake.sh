#!/bin/bash
# awake.sh <session id> [on | off | off all | list]  (nothing = status)
# shellcheck source-path=SCRIPTDIR
. "$(dirname "$0")/lib.sh"
sid=$1
read -r cmd scope <<<"$2"
if ! command -v caffeinate >/dev/null 2>&1; then
  echo "Keep-awake only works on macOS; nothing changed."; exit 0
fi
if [ -z "$sid" ]; then echo "Couldn't tell which session this is; nothing changed."; exit 0; fi
mkdir -p "$state"
case "$cmd $scope" in
  "on ")
    touch "$(flag "$sid")"
    echo "Keep-awake is ON for this session: the Mac stays awake while Claude works here and can sleep once each job is done." ;;
  "off ")
    rm -f "$(flag "$sid")"; release "$(pidfile "$sid")"
    echo "Keep-awake is OFF for this session." ;;
  "off all")
    for s in $(sessions); do rm -f "$(flag "$s")"; release "$(pidfile "$s")"; done
    echo "Keep-awake is OFF for every session." ;;
  "list ")
    list=$(sessions)
    if [ -z "$list" ]; then echo "No sessions have keep-awake on."; exit 0; fi
    echo "Keep-awake sessions:"
    for s in $list; do
      line="- ${s:0:8}"; [ "$s" = "$sid" ] && line+=" (this session)"
      if [ -f "$(flag "$s")" ]; then line+=": on"; else line+=": off"; fi
      if running "$(pidfile "$s")"; then
        line+=", awake now (caffeinate $(cat "$(pidfile "$s")"), $(ps -p "$(cat "$(pidfile "$s")")" -o etime= | xargs))"
      else
        line+=", idle"
      fi
      echo "$line"
    done ;;
  " ")
    if [ -f "$(flag "$sid")" ]; then echo "Keep-awake is ON for this session. Turn it off with /awake off."
    else echo "Keep-awake is OFF for this session. Turn it on with /awake on."; fi ;;
  *) echo "Usage: /awake [on | off | off all | list]" ;;
esac
exit 0
