import type { EngineInterface, Register } from 'claude-code'
import { atom, read, update } from 'claude-code'

import type { SessionGist, SessionGistSnapshot } from '../types'
import { digest, parseGist, SYSTEM } from './gist'
import {
  byChurn,
  collectTasks,
  oneLine,
  parseNumstat,
  parseUntracked,
  tilde,
} from './snapshot'

const PANE = 'session-gist'
const REFRESH_EVERY_TURNS = 3

// Muted palette that sits next to Claude Code's own dim UI
const C = {
  border: '#3b4261',
  muted: '#565f89',
  text: '#a9b1d6',
  accent: '#7aa2f7',
  green: '#9ece6a',
  amber: '#e0af68',
  red: '#f7768e',
  chip: '#24283b',
}

const snapshot = atom(
  { plugin: 'session-gist', key: 'snapshot' } as const,
  null as SessionGistSnapshot | null,
)
const gist = atom(
  { plugin: 'session-gist', key: 'gist' } as const,
  null as SessionGist | null,
)

const git = async ($: EngineInterface, cwd: string, args: string[]) => {
  try {
    const r = await $.process.run(['git', ...args], { cwd })
    return r.exitCode === 0 ? r.stdout.trim() : null
  } catch {
    return null
  }
}

const lineCounts = async ($: EngineInterface, cwd: string, paths: string[]) => {
  try {
    const r = await $.process.run(['wc', '-l', '--', ...paths], { cwd })
    return r.stdout
  } catch {
    return null
  }
}

const takeSnapshot = async (
  $: EngineInterface,
): Promise<SessionGistSnapshot> => {
  const cwd = await $.session.cwd()
  const [messages, usage, turns, gitRoot, branch, numstat] = await Promise.all([
    $.session.messages(),
    $.session.usage(),
    $.session.turns(),
    git($, cwd, ['rev-parse', '--show-toplevel']),
    git($, cwd, ['branch', '--show-current']),
    git($, cwd, ['diff', '--numstat', 'HEAD']),
  ])
  const untracked = gitRoot
    ? await git($, gitRoot, ['ls-files', '--others', '--exclude-standard'])
    : null
  const newPaths = (untracked ?? '').split('\n').filter(Boolean).slice(0, 50)
  const wc = newPaths.length
    ? await lineCounts($, gitRoot ?? cwd, newPaths)
    : null
  const firstPrompt = messages.find(m => m.role === 'user' && m.text.trim())

  return {
    firstPrompt: oneLine(firstPrompt?.text ?? '', 200),
    cwd,
    gitRoot,
    branch: branch || null,
    usd: usage.cost?.usd ?? null,
    contextPercent: usage.context.percent ?? null,
    rateLimits: usage.rateLimits.map(limit => ({
      kind: limit.kind,
      percentUsed: limit.percentUsed,
      resetsAt: limit.resetsAt ? Date.parse(limit.resetsAt) || null : null,
    })),
    turns,
    tasks: collectTasks(messages),
    files: byChurn([
      ...(numstat ? parseNumstat(numstat) : []),
      ...parseUntracked(newPaths, wc),
    ]),
  }
}

const generateGist = async (
  $: EngineInterface,
  turn: number,
): Promise<SessionGist | null> => {
  const messages = await $.session.messages()
  if (!messages.some(m => m.role === 'user' && m.text.trim())) return null

  const result = await $.model.complete({
    model: 'haiku',
    system: SYSTEM,
    prompt: digest(messages),
    maxTokens: 400,
    effort: 'low',
    timeoutMs: 30000,
  })
  if (!result.isAnswered) return null

  const parsed = parseGist(result.text)
  if (!parsed) return null

  return {
    ...parsed,
    atTurn: turn,
    at: await $.clock.now(),
  }
}

const until = (at: number, now: number) => {
  const min = Math.max(0, Math.round((at - now) / 60000))
  if (min < 60) return `${min}m`
  const hours = Math.floor(min / 60)
  return hours < 24
    ? `${hours}h ${min % 60}m`
    : `${Math.floor(hours / 24)}d ${hours % 24}h`
}

const LIMIT_LABELS: Record<string, string> = {
  five_hour: '5-hour',
  seven_day: 'weekly',
  spend_limit: 'spend',
}

const limitColor = (percent: number) =>
  percent >= 90 ? C.red : percent >= 75 ? C.amber : C.muted

const openPane = ($: EngineInterface) =>
  $.ui.open({ id: PANE, title: 'Session' })

const refreshSnapshot = async ($: EngineInterface) => {
  const next = await takeSnapshot($)
  await update($, snapshot, () => next)
  return next
}

// Module state: a hot reload clears it, which at worst allows one extra call
let isSummarizing = false

const refreshGist = async ($: EngineInterface, force: boolean) => {
  // Claimed before the first await so a turn.complete refresh and a
  // /gist refresh landing together can't both call Haiku
  if (isSummarizing) return
  isSummarizing = true
  try {
    const turn = await $.session.turns()
    const last = await read($, gist)
    if (!force && last && turn - last.atTurn < REFRESH_EVERY_TURNS) return

    const next = await generateGist($, turn)
    if (next) await update($, gist, () => next)
  } finally {
    isSummarizing = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'gist',
      description: 'Open the session gist pane (/gist refresh to re-summarize)',
    })
    const result = await next(e)
    void refreshSnapshot($)

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      void refreshSnapshot($)
      void refreshGist($, false)
    }

    return result
  })

  on('command.run', { command: 'gist' }, async ($, e) => {
    await refreshSnapshot($)
    await openPane($)
    if (e.args.trim() === 'refresh') {
      void refreshGist($, true)
      return { text: 'Session gist opened; re-summarizing with Haiku.' }
    }

    return { text: 'Session gist opened.' }
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const g = await read($, gist)
    const s = await read($, snapshot)
    const label = g?.title ?? s?.firstPrompt
    if (!label) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const modes = e.props.modes.join(' & ')

    return (
      <Box gap={1}>
        {modes && <Text dimColor>{modes} ·</Text>}
        <Button
          key="open-gist"
          plain
          label={oneLine(label, 48)}
          onPress={() => void openPane($)}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const s = await read($, snapshot)
    const g = await read($, gist)
    if (!s) return <Text color={C.muted}>Gathering session details…</Text>

    const now = await $.clock.now()
    // Subscription accounts report rate-limit windows; for them the dollar
    // figure is an API-price estimate, not a bill, so limits replace it
    const hasLimits = s.rateLimits.length > 0
    const context =
      s.contextPercent === null
        ? null
        : `${Math.round(s.contextPercent)}% context`
    const turnsLeft = g ? REFRESH_EVERY_TURNS - (s.turns - g.atTurn) : 0
    const refreshNote =
      turnsLeft <= 0
        ? 'Refreshes after this turn'
        : `Refreshes in ${turnsLeft} turn${turnsLeft === 1 ? '' : 's'}`
    const inRoot =
      s.gitRoot && s.cwd.startsWith(s.gitRoot)
        ? { root: s.gitRoot, rest: s.cwd.slice(s.gitRoot.length) }
        : { root: s.cwd, rest: '' }

    return (
      <Box flexDirection="column" gap={1}>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={C.border}
          paddingX={1}
        >
          <Text bold color={C.text} wrap="truncate-end">
            {g?.title ?? (s.firstPrompt || 'New session')}
          </Text>
          <Text color={C.muted}>
            {context}
            {hasLimits ? (
              // "27% context · You've used 37% of your 5-hour limit (resets
              // in 50m) and 46% of your weekly limit (resets in 1d 3h)."
              <Text>
                {context ? ' · ' : ''}You've used{' '}
                {s.rateLimits.map((limit, i) => (
                  <Text key={limit.kind}>
                    {i === 0
                      ? ''
                      : i === s.rateLimits.length - 1
                        ? ' and '
                        : ', '}
                    <Text color={limitColor(limit.percentUsed)}>
                      {limit.percentUsed}%
                    </Text>
                    {` of your ${LIMIT_LABELS[limit.kind] ?? limit.kind} limit`}
                    {limit.resetsAt === null
                      ? ''
                      : ` (resets in ${until(limit.resetsAt, now)})`}
                  </Text>
                ))}
                .
              </Text>
            ) : s.usd === null ? (
              ''
            ) : (
              `${context ? ' · ' : ''}$${s.usd.toFixed(2)}`
            )}
          </Text>
        </Box>

        <Box flexDirection="column" gap={1} paddingX={1}>
          <Box flexDirection="column">
            <Box>
              <Text color={C.muted} wrap="truncate-start">
                {tilde(inRoot.root)}
              </Text>
              <Text color={C.text}>{inRoot.rest}</Text>
            </Box>
            {s.branch && <Text color={C.accent}>⎇ {s.branch}</Text>}
          </Box>

          {g?.summary && (
            <Box flexDirection="column">
              <Markdown key="summary" text={g.summary} />
              <Text color={C.muted}>{refreshNote}</Text>
            </Box>
          )}

          {s.tasks.length > 0 && (
            <Box flexDirection="column">
              {s.tasks.slice(0, 12).map(task => (
                <Text
                  key={task.id}
                  color={
                    task.status === 'in_progress'
                      ? C.accent
                      : task.status === 'completed'
                        ? C.muted
                        : C.text
                  }
                  strikethrough={task.status === 'completed'}
                  wrap="truncate-end"
                >
                  {task.status === 'completed'
                    ? '●'
                    : task.status === 'in_progress'
                      ? '◐'
                      : '○'}{' '}
                  {task.title}
                </Text>
              ))}
            </Box>
          )}

          {s.files.length > 0 && (
            <Box flexDirection="column">
              {s.files.slice(0, 12).map(f => (
                <Box key={f.path} justifyContent="space-between" gap={1}>
                  <Text color={C.text} wrap="truncate-start">
                    {f.path}
                  </Text>
                  <Box gap={1}>
                    <Text color={f.add ? C.green : C.border}>+{f.add}</Text>
                    {f.isUntracked ? (
                      <Text color={C.muted}>new</Text>
                    ) : (
                      <Text color={f.del ? C.red : C.border}>-{f.del}</Text>
                    )}
                  </Box>
                </Box>
              ))}
              {s.files.length > 12 && (
                <Text color={C.muted}>+{s.files.length - 12} more files</Text>
              )}
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
