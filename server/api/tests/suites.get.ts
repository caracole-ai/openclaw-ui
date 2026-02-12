/**
 * GET /api/tests/suites
 * Returns test suites: API endpoints health + data integrity + cross-refs
 */
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const HOME = process.env.HOME || ''
const SOURCES_DIR = join(HOME, '.openclaw/sources')
const AGENTS_DIR = join(HOME, '.openclaw/agents')

interface TestResult {
  id: string
  suite: string
  name: string
  status: 'pass' | 'fail' | 'skip'
  message?: string
  durationMs?: number
}

async function runApiTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test source files exist and are valid JSON
  const sourceFiles = ['agents.json', 'projects.json', 'skills.json', 'tokens.json', 'teams.json', 'events.json']
  for (const file of sourceFiles) {
    const path = join(SOURCES_DIR, file)
    const start = Date.now()
    try {
      if (!existsSync(path)) {
        results.push({ id: `src-${file}`, suite: 'sources', name: `${file} exists`, status: 'fail', message: 'File not found' })
        continue
      }
      const raw = await readFile(path, 'utf-8')
      JSON.parse(raw)
      results.push({ id: `src-${file}`, suite: 'sources', name: `${file} valid JSON`, status: 'pass', durationMs: Date.now() - start })
    } catch (e: any) {
      results.push({ id: `src-${file}`, suite: 'sources', name: `${file} valid JSON`, status: 'fail', message: e.message, durationMs: Date.now() - start })
    }
  }

  return results
}

async function runIntegrityTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  try {
    const agents = JSON.parse(await readFile(join(SOURCES_DIR, 'agents.json'), 'utf-8')).agents || []
    const projects = JSON.parse(await readFile(join(SOURCES_DIR, 'projects.json'), 'utf-8')).projects || []
    const skills = JSON.parse(await readFile(join(SOURCES_DIR, 'skills.json'), 'utf-8'))

    const agentIds = new Set(agents.map((a: any) => a.id))
    const projectIds = new Set(projects.map((p: any) => p.id))

    // Agent workspace exists
    for (const a of agents) {
      const wsExists = a.workspace && existsSync(a.workspace)
      const soulExists = wsExists && existsSync(join(a.workspace, 'SOUL.md'))
      const idExists = wsExists && existsSync(join(a.workspace, 'IDENTITY.md'))

      results.push({ id: `ws-${a.id}`, suite: 'integrity', name: `Agent ${a.id} workspace`, status: wsExists ? 'pass' : 'fail', message: wsExists ? a.workspace : 'Missing' })
      results.push({ id: `soul-${a.id}`, suite: 'integrity', name: `Agent ${a.id} SOUL.md`, status: soulExists ? 'pass' : 'fail' })
      results.push({ id: `id-${a.id}`, suite: 'integrity', name: `Agent ${a.id} IDENTITY.md`, status: idExists ? 'pass' : 'fail' })
    }

    // Project team refs valid
    for (const p of projects) {
      for (const t of (p.team || [])) {
        const valid = agentIds.has(t.agent)
        results.push({ id: `pref-${p.id}-${t.agent}`, suite: 'integrity', name: `Project ${p.id} → agent ${t.agent}`, status: valid ? 'pass' : 'fail', message: valid ? undefined : 'Unknown agent' })
      }
    }

    // Agent project refs valid
    for (const a of agents) {
      for (const pid of (a.projects || [])) {
        const valid = projectIds.has(pid)
        results.push({ id: `aref-${a.id}-${pid}`, suite: 'integrity', name: `Agent ${a.id} → project ${pid}`, status: valid ? 'pass' : 'fail', message: valid ? undefined : 'Unknown project' })
      }
    }

    // Skills assignments ref valid agents
    for (const [agentId] of Object.entries(skills.assignments || {})) {
      const valid = agentIds.has(agentId)
      results.push({ id: `skill-assign-${agentId}`, suite: 'integrity', name: `Skill assignment → ${agentId}`, status: valid ? 'pass' : 'fail', message: valid ? undefined : 'Unknown agent' })
    }

  } catch (e: any) {
    results.push({ id: 'integrity-error', suite: 'integrity', name: 'Parse sources', status: 'fail', message: e.message })
  }

  return results
}

async function runLiveTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  try {
    const agents = JSON.parse(await readFile(join(SOURCES_DIR, 'agents.json'), 'utf-8')).agents || []

    for (const a of agents) {
      const sessFile = join(AGENTS_DIR, a.id, 'sessions', 'sessions.json')
      const exists = existsSync(sessFile)
      results.push({ id: `sess-${a.id}`, suite: 'live', name: `Agent ${a.id} session store`, status: exists ? 'pass' : 'skip', message: exists ? undefined : 'No sessions yet' })

      if (exists) {
        try {
          const sess = JSON.parse(await readFile(sessFile, 'utf-8'))
          const count = Object.keys(sess).length
          const tokens = Object.values(sess).reduce((s: number, v: any) => s + (v.totalTokens || 0), 0)
          results.push({ id: `sess-data-${a.id}`, suite: 'live', name: `Agent ${a.id}: ${count} sessions, ${tokens} tokens`, status: 'pass' })
        } catch (e: any) {
          results.push({ id: `sess-data-${a.id}`, suite: 'live', name: `Agent ${a.id} session parse`, status: 'fail', message: e.message })
        }
      }
    }
  } catch (e: any) {
    results.push({ id: 'live-error', suite: 'live', name: 'Read agents', status: 'fail', message: e.message })
  }

  return results
}

export default defineEventHandler(async () => {
  const start = Date.now()

  const [sourceTests, integrityTests, liveTests] = await Promise.all([
    runApiTests(),
    runIntegrityTests(),
    runLiveTests(),
  ])

  const all = [...sourceTests, ...integrityTests, ...liveTests]
  const pass = all.filter(t => t.status === 'pass').length
  const fail = all.filter(t => t.status === 'fail').length
  const skip = all.filter(t => t.status === 'skip').length

  return {
    suites: [
      { id: 'sources', name: 'Sources JSON', icon: '📦', tests: sourceTests },
      { id: 'integrity', name: 'Intégrité & Cross-refs', icon: '🔗', tests: integrityTests },
      { id: 'live', name: 'Données Live (Gateway)', icon: '⚡', tests: liveTests },
    ],
    summary: { total: all.length, pass, fail, skip },
    durationMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  }
})
