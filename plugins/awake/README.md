# awake

Keeps your Mac awake while Claude Code works, only when you ask, and lets it sleep as soon as the job is done.

- `/awake on`: in this session, every prompt keeps the Mac awake until Claude finishes that job
- `/awake off`: back to normal sleep for this session
- `/awake`: show whether it's on for this session
- `/awake list`: every session with keep-awake on, and which are holding the Mac awake right now
- `/awake off all`: turn it off everywhere and release every `caffeinate`

Keep-awake is per session: each Claude session gets its own `caffeinate`, so two agents running at once don't cut each other off, and `/awake off` in one leaves the others alone. It's forgotten when the session ends. A 4-hour cap stops a forgotten one. On non-Mac systems it does nothing.

## Install

```sh
claude plugin marketplace add jasonsims/claude-plugins
claude plugin install awake@jasonsims
```

## Check it

Run `/awake on`, send a prompt, and in another terminal run `pgrep -fl caffeinate` while Claude works. When Claude finishes, run it again: it should be gone.
