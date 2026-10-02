import { expect, test } from 'claude-code/testing'

import { digest, parseGist } from './gist'
import { byChurn, parseNumstat, parseUntracked } from './snapshot'

test('parseGist reads the JSON even with prose around it', async () => {
  const gist = parseGist(
    'Here you go:\n{"title":"Migrate auth to JWT","summary":"Swapping cookies."}',
  )
  expect(gist?.title).toBe('Migrate auth to JWT')
  expect(gist?.summary).toBe('Swapping cookies.')
  expect(parseGist('no json here')).toBeNull()
  expect(parseGist('{"summary":"missing title"}')).toBeNull()
})

test('parseNumstat handles binary files, byChurn sorts', async () => {
  const files = byChurn(
    parseNumstat('1\t0\tpackage.json\n-\t-\tlogo.png\n64\t31\tapi/auth.ts'),
  )
  expect(files.map(f => f.path)).toEqual([
    'api/auth.ts',
    'package.json',
    'logo.png',
  ])
  expect(files[2]).toEqual({
    path: 'logo.png',
    add: 0,
    del: 0,
    isUntracked: false,
  })
})

test('parseUntracked takes line counts from wc and skips the total', async () => {
  const files = parseUntracked(
    ['a.ts', 'dir/b.ts'],
    '      12 a.ts\n       3 dir/b.ts\n      15 total',
  )
  expect(files).toEqual([
    { path: 'a.ts', add: 12, del: 0, isUntracked: true },
    { path: 'dir/b.ts', add: 3, del: 0, isUntracked: true },
  ])
  expect(parseUntracked(['x'], null)[0]?.add).toBe(0)
})

test('digest keeps the first prompt and the newest messages', async () => {
  const msg = (role: 'user' | 'assistant', text: string) => ({
    role,
    text,
    toolUses: [],
  })
  const out = digest([
    msg('user', 'first goal'),
    ...Array.from({ length: 200 }, (_, i) =>
      msg('assistant', `step ${i} ${'x'.repeat(200)}`),
    ),
    msg('user', 'latest ask'),
  ])
  expect(out.startsWith('USER: first goal')).toBe(true)
  expect(out.endsWith('USER: latest ask')).toBe(true)
  expect(out).toContain('earlier messages')
})

test('pane and footer draw before any summary exists', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'session-gist',
      surface,
      component: 'Pane',
      requestId: 'session-gist',
      props: { title: 'Session', isFocused: true, bodyColumns: 60 } as never,
    })
    expect(await ui.find({ type: 'Text' })).toBeDefined()
    await ui.unmount()
  }
})
