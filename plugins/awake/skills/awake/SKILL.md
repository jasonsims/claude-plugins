---
name: awake
description: Turn keep-awake on or off for this session's work on this Mac, or list sessions keeping it awake
argument-hint: "[on | off | off all | list]"
disable-model-invocation: true
---

!`CLAUDE_PLUGIN_DATA="${CLAUDE_PLUGIN_DATA}" "${CLAUDE_PLUGIN_ROOT}/scripts/awake.sh" "${CLAUDE_SESSION_ID}" "$ARGUMENTS"`

Relay the output above to the user as is: one short sentence, or the list unchanged. Do nothing else.
