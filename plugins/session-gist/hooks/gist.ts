import type { SessionMessage } from 'claude-code'

import { oneLine } from './snapshot'

const DIGEST_CHARS = 12000

export const SYSTEM = `You summarize a coding agent's session for a glanceable status pane.
Reply with one JSON object and nothing else:
{"title": string, "summary": string}
- title: the session's overall goal in at most 6 words, no trailing period
- summary: 1-2 plain sentences on the goal and where it stands; **bold** at most one phrase.
  If there is an open problem, blocker or undecided question, end with one short sentence naming it.
  Describe the state of the work, not the step in progress this minute.
Describe the latest goal when the session has moved on from its first request.`

const describeTool = (use: SessionMessage['toolUses'][number]) => {
  const input = use.input
  const target =
    input.file_path ?? input.notebook_path ?? input.command ?? input.pattern
  return typeof target === 'string'
    ? `${use.tool}(${oneLine(target, 80)})`
    : use.tool
}

// Newest messages win; the first prompt always stays so the original goal
// survives on long sessions.
export const digest = (messages: SessionMessage[]) => {
  const lines = messages
    .map(m => {
      const tools = m.toolUses.map(describeTool).join(', ')
      const text = oneLine(m.text, m.role === 'user' ? 600 : 300)
      return `${m.role === 'user' ? 'USER' : 'AGENT'}: ${text}${tools ? ` [${tools}]` : ''}`
    })
    .filter(line => !/^(USER|AGENT): $/.test(line))

  const first = lines[0] ?? ''
  const kept: string[] = []
  let size = first.length
  for (const line of lines.slice(1).reverse()) {
    if (size + line.length > DIGEST_CHARS) break
    kept.unshift(line)
    size += line.length
  }
  const skipped = lines.length - 1 - kept.length

  return [first, skipped ? `… ${skipped} earlier messages …` : '', ...kept]
    .filter(Boolean)
    .join('\n')
}

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? oneLine(v, max) : ''

export const parseGist = (text: string) => {
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  try {
    const raw: Record<string, unknown> = JSON.parse(json)
    const title = str(raw.title, 60)
    if (!title) return null
    return {
      title,
      summary: str(raw.summary, 500),
    }
  } catch {
    return null
  }
}
