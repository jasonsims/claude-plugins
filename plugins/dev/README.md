# dev

Skills for everyday dev work.

```sh
claude plugin marketplace add jasonsims/claude-plugins
claude plugin install dev@jasonsims
```

## Skills

| Skill | What it does |
| --- | --- |
| [`/dev:review`](#review) | First-pass PR review: regression risk first, critical of additions, terse output |

## review

Puts regression risk to existing flows first, is critical of anything the ticket doesn't need, and only says what needs to change (or thanks + LGTM).

```
/dev:review 123               # print a draft review of PR #123
/dev:review <PR URL> --post   # post it to GitHub as one review
/dev:review                   # review the current branch's outstanding work
```

Findings are sorted into **Please fix**, **Please split**, **Please verify** and **Smaller asks**. The verdict is `REQUEST_CHANGES` when anything needs fixing, otherwise `COMMENT`; it never approves.

The skill reads the repo's `CLAUDE.md` (or `AGENTS.md`) and `.claude/review.md` if present. Put project specifics there (shared code paths, ticket-key rules, labels, deploy gotchas); they add to the skill's rules and win on a conflict.

Requires `gh` for PR targets and `--post`. Uses a tracker connector (Jira, Linear, GitHub issues) to read the linked ticket and the `code-review` skill for a bug-hunt pass when they're available.
