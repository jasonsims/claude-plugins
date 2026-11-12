---
name: review
description: First-pass PR review. Regression risk first, critical of additions, and terse output that says only what needs to change (or thanks + LGTM). Use when asked to review a PR, a branch, or the current diff, or to do a "first pass" review. Pass a PR number or URL; add --post to post the review to GitHub, otherwise it prints a draft.
---

# Review

Review the target the user named: a PR number or URL, a branch, or (with nothing named) the current
branch's outstanding work: its commits since the merge-base with the default branch, plus any
staged and unstaged changes (`git diff <merge-base>` covers all three). With no PR, skip the
PR-only steps (body, labels, earlier reviews, posting): take the ticket key from the branch name or
commit subjects, apply §5 to the commit messages, and print the draft.

**Your one job: say what needs to change, and nothing else.** As many findings as are valid, but
never a line about something that's fine: no recap of what the PR does, no "the title looks good",
no "worth knowing" notes, no praise padding. If nothing needs to change, say thanks and LGTM in a
sentence.

## Project rules

Before reviewing, read the repo's `CLAUDE.md` (or `AGENTS.md`) and, if it exists, `.claude/review.md`.
The review file holds this project's specifics: which code paths are shared, ticket-key rules,
labels, deploy and contract gotchas. Its rules add to the ones here and win on a conflict. Where
this skill says "the repo's conventions", that's where to look.

## Mindset

- **Regression risk first.** A new capability with rough edges is cheap; breaking something that
  already works in production is expensive. Spend most of your attention on what the diff changes
  for **existing** flows, and rank those findings above anything about the new code.
- **Smallest change that reaches the goal.** Be critical of additions. Every file, rename, helper,
  doc rewrite, and side-fix has to be needed for what the ticket asks. If it isn't, ask for it to
  be dropped or split out, especially when it changes existing behaviour.
- **Extend what's there.** Before accepting new code, check whether the repo already does this.
  When a comment justifies a reinvention ("a shared helper would need X"), open the shared helper
  and check.
- **Duplication is fine across separate services.** Two handlers for two external systems that
  rhyme don't need a shared abstraction. Shared *policy* (auth, claims, gates, idempotency) must
  stay in one place; per-service orchestration can be copied. Don't ask for an abstraction with one
  caller.
- **Verify before you report.** Try to disprove every finding: re-read the surrounding code and
  confirm the failure is reachable. If you confirm it, it's a finding. If it hinges on something
  you couldn't check (an external system's behaviour, real data, infra outside the repo), it goes
  under **Please verify**, saying what to check and what breaks if it's wrong. If you can't name a
  concrete failure either way, drop it.

## Gather

1. The PR's title, body, labels, changed files, commit messages, and the full diff. Also any earlier
   reviews and review threads: if an earlier review asked for a change, don't ask to drop it; judge
   whether it was done right.
2. **The ticket.** Find the ticket key and fetch it through whichever tracker connector is
   available (Jira, Linear, GitHub issues). Read what it actually asked for.
3. **The surrounding code**, not just the hunks: callers of anything changed, and existing helpers
   that do something similar to new code.
4. **External claims.** If the PR asserts how an external system behaves, check it against the real
   docs, or against real data when a connector gives you read access. Don't take the PR body's word
   for it. Skip this when the PR makes no such claim.
5. **A bug hunt.** If the `code-review` skill is available, run it on the same target at `high`
   effort, without `--comment` or `--fix`, and treat its findings as candidates for the lenses
   below: verify each one, then sort it like any other finding. If it isn't available, do your own
   correctness pass under §4.

Don't run typecheck, lint, or tests. CI already covers those and the result is on the PR.

## What to look for

### 1. Regressions to existing behaviour (highest priority)

For each changed file outside the feature's own new code, ask: what does this do differently for
the flows that already work?

- **Shared code paths.** A change to code every existing flow runs through (entry points, shared
  handlers, claim or auth helpers). Confirm the old path behaves exactly as before, or flag the
  difference.
- **Riders.** Behaviour changes to existing flows that the goal doesn't need: a side-fix to another
  path, new copy in an existing user-facing message, a changed default. Even good ones belong in
  their own PR. Ask for them to be dropped.
- **Prompt and config edits** that reach more than the feature: a shared system prompt, a global
  config default, a shared CI step.
- **Deploy wiring.** A new secret, env var, or permission the deploy needs before it can succeed.
  Flag it only if the PR doesn't already say how that's sequenced.
- **Contracts.** API shapes, stored-data formats and field names, cache versions, metrics that
  silently stop counting something.

### 2. Does it do what the ticket asks, and is the ticket right?

- Parts left undone, and parts built that nobody asked for.
- If the ticket prescribes an approach that the code or the real system contradicts, say so and
  describe the simpler thing that meets the ticket's *goal*.

### 3. Size and reuse

- New code that duplicates an existing helper. Name the helper to use instead.
- New state that something else already knows. Don't store what you can look up.
- Scaffolding nothing runs: validation scripts, smoke files, dead exports, interfaces with no
  caller.
- Renames and doc rewrites that don't change behaviour but grow the diff.
- Constants hardcoded in several places that should come from one.
- **Comments that don't earn their place.** A comment should be short and direct, and only exist
  where the code isn't self-explanatory or where it stops the next reader (often a coding agent)
  from getting something wrong. Use the repo's comment rules if it has them. Flag:
  - restating what the code plainly does;
  - narrating the change or its history ("now also…", "kept byte-for-byte", "review follow-up");
  - notes to self or proof of work ("verified live against the sandbox", "confirmed against the
    docs");
  - arguing a design choice or answering a reviewer, which belongs in the docs or the commit
    message;
  - docstrings on ordinary functions that stack mechanism, rationale and consequence.

  Check every comment that states a fact about other code against that code. Report the noise as
  one **Smaller asks** finding listing the locations, not one finding per comment.
  A comment that's **wrong** (it misdescribes the code, or justifies a choice with a false claim)
  is a **Please fix**, since the next agent will believe it. That includes an unchanged comment
  that this PR's edits made wrong.
- New entry points should go through the existing shared path, not copy its sequence. Per-service
  orchestration around it is fine (see Mindset).

### 4. Correctness and safety

- **Side effects survive redelivery.** Webhooks and queues are at-least-once. Filing a ticket,
  opening a PR, or posting a comment needs an idempotency claim first, or a redelivery does it
  twice.
- **No proceeding on partial data.** A swallowed failure that feeds something user-visible is an
  error state, not a shrug.
- **No parsing LLM prose.** Anything code acts on needs a deterministic contract: structured
  output, a tool call, or an explicit field.
- **Leaks on the failure path.** Uploads, locks, claims and records left behind. Check the
  `catch`/`finally` and what sits outside the `try`.
- **Degrade, don't die.** An optional capability that's missing should log a warning and leave the
  rest running.
- **Credentials only go where they belong.** A key must never be sent to a URL taken from user
  content.

### 5. PR metadata

Only report these when they're wrong:
- **Stray ticket keys.** Tracker integrations link (and can transition) every key they find in
  commit messages and the PR body. Scan both for any key other than the PR's own, including other
  projects' keys and ones used as test evidence. Each stray key is a **Please fix**. Follow the
  repo's rules on which key the PR must carry.
- **Labels** the repo expects but the PR is missing.
- **Title or body** describing something the diff doesn't do.

## Output

Sort every finding into one of four sections. Leave out any section with nothing in it.

| Section | What goes in it |
|---|---|
| **Please fix** | Must change before merge: regressions (§1), correctness/safety (§4), duplicated pipelines or bypassed shared paths (§3), the PR not doing what the ticket asks (§2), wrong comments, and wrong ticket keys (§5). A rider, meaning any change (new code included) to how an *existing* flow behaves that the goal doesn't need (even a good fix), goes here as "drop it". |
| **Please split** | New, standalone work that doesn't change existing flows but isn't needed for this PR's goal: a second trigger path, dashboard work. Say where it should go instead. |
| **Please verify** | Concerns you couldn't check yourself, most costly first. Each says what to check and what breaks if it's wrong. |
| **Smaller asks** | Non-blocking cleanups: renames, hardcoded constants, comment noise, a missing label, a body that describes an earlier version, and "update the ticket" when the ticket is wrong but the PR took the simpler, right path. |

Within a section, put the most severe first. Each finding is 2–4 sentences: what's wrong, how it
goes wrong concretely, and the fix. When one problem shows up at several call sites, make it one
finding that lists them. Anchor it with `file:line` and add a code snippet only when it's clearer
than a sentence. There's no cap on the number of findings, as long as each one is valid and asks
for a change. Plain words; no `robust`, `comprehensive`, `leveraged`.

Template:

```markdown
> An AI agent taking a first pass at this review.

## Please fix

1. **<one-line problem>** (`path/to/file.ts:123`). <how it goes wrong>. <the fix>.

## Please split

1. **<what>.** <why it's outside this PR's goal, and where it should go>.

## Please verify

1. **<claim or assumption>.** <what to check>. If it's wrong, <what breaks>.

## Smaller asks

1. <ask>.
```

Nothing goes outside these sections: no ticket summary, no metadata section, no closing note. Use
the disclosure line only when posting to GitHub; leave it off a local draft.

**Verdict:** `REQUEST_CHANGES` if **Please fix** has anything in it, otherwise `COMMENT`. Never
`APPROVE`.

**When nothing needs changing**, the whole review is:

> An AI agent taking a first pass at this review.
>
> Thanks for the contribution! Nothing to change from me. LGTM.

## Posting

Without `--post` (or an explicit ask to post), print the draft and the verdict and stop.

With it, post **one review**: the summary plus any inline comments together, not separate
comments. Every finding lives in the summary. Add an inline comment only when you're suggesting a
specific code change on a line inside a diff hunk (changed or context); any other `line` fails the
whole call with a 422.

Review the PR as it stands: don't push commits, edit the branch, or change the PR title, body, or
labels. If you can't post the review, say what blocked it rather than falling back to a plain issue
comment.

## Notes

Many PRs are agent-authored. The usual tells:
- files created to validate the work and left behind;
- state stored that something else already knows;
- renames and doc rewrites riding along with a feature;
- comments that justify a reinvention without checking the existing helper;
- confident claims in the body about external API behaviour that nobody checked.
