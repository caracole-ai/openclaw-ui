/**
 * GET /api/agents/live
 * Aggregated live stats for all agents from gateway session stores
 * Source of truth: ~/.openclaw/agents/{id}/sessions/sessions.json
 */
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

const HOME = process.env.HOME || ''
const AGENTS_DIR = join(HOME, '.openclaw/agents')
const SOURCES_DIR = join(HOME, '.openclaw/sources')
const DEFAULT_CTX = 200000

export default defineEventHandler(async () => {
  // Get agent list from source of truth
  let agentIds: string[] = []
  try {
    const raw = await readFile(join(SOURCES_DIR, 'agents.json'), 'utf-8')
    agentIds = JSON.parse(raw).agents.map((a: any) => a.id)
  } catch {
    // Fallback: scan agents dir
    try { agentIds = readdirSync(AGENTS_DIR).filter(d => !d.startsWith('.')) } catch {}
  }

  const agents: Record<string, { totalTokens: number; activeSessions: number; maxPercentUsed: number }> = {}
  let globalTokens = 0
  let globalSessions = 0
  let globalMaxPercent = 0

  for (const id of agentIds) {
    const sessFile = join(AGENTS_DIR, id, 'sessions', 'sessions.json')
    if (!existsSync(sessFile)) {
      agents[id] = { totalTokens: 0, activeSessions: 0, maxPercentUsed: 0 }
      continue
    }
    try {
      const sess = JSON.parse(await readFile(sessFile, 'utf-8'))
      let totalTokens = 0
      let activeSessions = 0
      let maxPercent = 0

      for (const val of Object.values(sess) as any[]) {
        const t = val.totalTokens || 0
        totalTokens += t
        if (t > 0) activeSessions++
        const ctx = val.contextTokens || DEFAULT_CTX
        const pct = ctx > 0 ? Math.round((t / ctx) * 100) : 0
        if (pct > maxPercent) maxPercent = pct
      }

      agents[id] = { totalTokens, activeSessions, maxPercentUsed: maxPercent }
      globalTokens += totalTokens
      globalSessions += activeSessions
      if (maxPercent > globalMaxPercent) globalMaxPercent = maxPercent
    } catch {
      agents[id] = { totalTokens: 0, activeSessions: 0, maxPercentUsed: 0 }
    }
  }

  return {
    agents,
    totalTokens: globalTokens,
    totalSessions: globalSessions,
    maxPercentUsed: globalMaxPercent,
    nearLimit: Object.values(agents).filter(a => a.maxPercentUsed >= 80).length,
  }
})
