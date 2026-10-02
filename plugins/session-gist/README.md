# session-gist

The gist of each Claude Code session at a glance, so you can tell what a session is for without having to `/rename` it.

- **Footer:** a short title for the session, at the right of the prompt footer. Click it (fullscreen terminal) or run `/gist` to open the pane.
- **Pane:** the title, context use and your plan's rate limits, the working directory and branch, a one or two sentence summary, Claude's task list when it has one, and changed and untracked files with line counts.

```sh
claude plugin marketplace add jasonsims/claude-plugins
claude plugin install session-gist@jasonsims
```

## Commands

| Command | What it does |
| --- | --- |
| `/gist` | Open the pane |
| `/gist refresh` | Open the pane and re-summarize now |

## What it costs

The title and summary come from one Claude Haiku call over a trimmed copy of the transcript (the first prompt plus the newest messages, about 12k characters). It runs after the first turn, then at most once every 3 turns, or when you run `/gist refresh`. On a Pro or Max plan those calls count toward your usage limits.

Everything else is free: the session's own usage figures, the transcript, and a few local `git` commands.

## Requirements

session-gist is a mod: a plugin built on Claude Code's function-hooks modules, which are in early access. On a Claude Code build where hooks modules are switched off it installs but shows nothing.

## Development

```sh
claude --plugin-dir plugins/session-gist   # load from this repo, reloading on edits
claude plugin test plugins/session-gist    # run the tests
```

The first load writes the engine's type declarations to `.claude-plugin/types/` (gitignored), which `npm run typecheck` uses.
