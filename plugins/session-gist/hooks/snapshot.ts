import type { SessionMessage } from 'claude-code'

import type { SessionGistFile, SessionGistTask } from '../types'

export const oneLine = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export const tilde = (path: string) =>
  path.replace(/^\/(Users|home)\/[^/]+/, '~')

const isStatus = (s: unknown): s is SessionGistTask['status'] =>
  s === 'pending' || s === 'in_progress' || s === 'completed'

// TodoWrite sends the whole list each time; TaskCreate/TaskUpdate change one
// task at a time, and a new task's id only appears in TaskCreate's result.
export const collectTasks = (messages: SessionMessage[]) => {
  let todos: SessionGistTask[] = []
  const tasks = new Map<string, SessionGistTask>()

  for (const use of messages.flatMap(m => m.toolUses)) {
    const input = use.input
    if (use.tool === 'TodoWrite' && Array.isArray(input.todos)) {
      todos = input.todos.flatMap((t, i) =>
        typeof t?.content === 'string' && isStatus(t.status)
          ? [{ id: String(i), title: t.content, status: t.status }]
          : [],
      )
    } else if (use.tool === 'TaskCreate' && typeof input.subject === 'string') {
      const id = use.text?.match(/#?(\d+)/)?.[1] ?? String(tasks.size + 1)
      tasks.set(id, { id, title: input.subject, status: 'pending' })
    } else if (use.tool === 'TaskUpdate' && typeof input.taskId === 'string') {
      const task = tasks.get(input.taskId)
      if (!task) continue
      if (input.status === 'deleted') tasks.delete(task.id)
      else if (isStatus(input.status)) task.status = input.status
      if (typeof input.subject === 'string') task.title = input.subject
    }
  }

  return tasks.size ? [...tasks.values()] : todos
}

// `git diff --numstat HEAD`: "<add>\t<del>\t<path>", "-" for binary files
export const parseNumstat = (out: string): SessionGistFile[] =>
  out
    .split('\n')
    .map(line => line.split('\t'))
    .flatMap(([add, del, path]) =>
      path
        ? [
            {
              path,
              add: Number(add) || 0,
              del: Number(del) || 0,
              isUntracked: false,
            },
          ]
        : [],
    )

// `wc -l a b`: "  12 a\n   3 b\n  15 total"; the total line only with 2+ files
export const parseUntracked = (
  paths: string[],
  wc: string | null,
): SessionGistFile[] => {
  const counts = new Map<string, number>()
  for (const line of (wc ?? '').split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/)
    if (match?.[1] && match[2]) counts.set(match[2], Number(match[1]))
  }
  return paths.map(path => ({
    path,
    add: counts.get(path) ?? 0,
    del: 0,
    isUntracked: true,
  }))
}

export const byChurn = (files: SessionGistFile[]) =>
  [...files].sort((a, b) => b.add + b.del - (a.add + a.del))
