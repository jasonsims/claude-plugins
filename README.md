# claude-plugins

Claude Code plugin marketplace.

```sh
claude plugin marketplace add jasonsims/claude-plugins
claude plugin install session-gist@jasonsims
```

## Plugins

| Plugin | Description |
| --- | --- |
| [session-gist](plugins/session-gist) | Share Claude Code sessions as GitHub gists |

## Adding a plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json`
2. Add commands/skills/agents/hooks under `plugins/<name>/`
3. Register it in `.claude-plugin/marketplace.json`
4. `claude plugin validate .`
