declare module 'claude-code' {
  interface PluginState {
    'session-gist': {
      snapshot: SessionGistSnapshot | null
      gist: SessionGist | null
    }
  }
}

export type SessionGistTask = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
}

export type SessionGistRateLimit = {
  kind: string
  percentUsed: number
  resetsAt: number | null
}

export type SessionGistFile = {
  path: string
  add: number
  del: number
  isUntracked: boolean
}

export type SessionGistSnapshot = {
  firstPrompt: string
  cwd: string
  gitRoot: string | null
  branch: string | null
  usd: number | null
  contextPercent: number | null
  rateLimits: SessionGistRateLimit[]
  turns: number
  tasks: SessionGistTask[]
  files: SessionGistFile[]
}

export type SessionGist = {
  title: string
  summary: string
  atTurn: number
  at: number
}
