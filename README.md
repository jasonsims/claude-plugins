# claude-plugins

Claude Code plugin marketplace.

```sh
claude plugin marketplace add jasonsims/claude-plugins
claude plugin install session-gist@jasonsims
```

To pick up new versions later:

```sh
claude plugin marketplace update jasonsims
claude plugin update session-gist@jasonsims
```

## Plugins

| Plugin | Description |
| --- | --- |
| [session-gist](plugins/session-gist) | The gist of each session at a glance: a Haiku summary in the footer and a `/gist` detail pane |

## Adding a plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json`
2. Add commands/skills/agents/hooks under `plugins/<name>/`
3. Register it in `.claude-plugin/marketplace.json`
4. Try it with `claude --plugin-dir plugins/<name>`, then `npm run check`

## Releasing a change

Installs are cached by version, so a change only reaches users when the version goes up. Bump `version` in both the plugin's `plugin.json` and its `marketplace.json` entry; `npm run validate` fails if the two disagree.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), enforced in CI. Enable the local hook once per clone:

```sh
git config core.hooksPath .githooks
```

## Linting

```sh
npm install
npm run check   # biome + tsc + claude plugin validate
npm run fix     # apply biome fixes and formatting
```

Biome handles lint and format for TS/TSX/JSON, and errors on Node imports since mods run without Node. Type-checking uses the declarations Claude Code writes into `plugins/<name>/.claude-plugin/types/` when it loads a mod (gitignored, build-specific), so load a plugin once with `claude --plugin-dir plugins/<name>` before `npm run typecheck` covers it. CI runs Biome, shellcheck and `claude plugin validate`, but not tsc.
