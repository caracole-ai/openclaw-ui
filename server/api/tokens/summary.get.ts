/**
 * GET /api/tokens/summary
 * Source: SQLite (cost data) + live session stores (real-time tokens)
 */
import { getDb, getLiveStats } from '~/server/utils/db'

export default defineEventHandler(() => {
  const db = getDb()

  // Live tokens from session stores
  const agents = db.prepare('SELECT id FROM agents').all() as any[]
  let liveTotalTokens = 0
  let liveTotalSessions = 0
  const liveByAgent = agents.map(a => {
    const live = getLiveStats(a.id)
    liveTotalTokens += live.totalTokens
    liveTotalSessions += live.activeSessions
    return { agentId: a.id, tokens: live.totalTokens, sessions: live.activeSessions }
  })

  // Cost data from DB
  const costByAgent = db.prepare(`
    SELECT agent_id, SUM(total_cost) as cost, SUM(total_tokens) as tokens, COUNT(*) as events
    FROM token_events GROUP BY agent_id ORDER BY cost DESC
  `).all() as any[]

  const costByProject = db.prepare(`
    SELECT project_id, SUM(total_cost) as cost, SUM(total_tokens) as tokens
    FROM token_events WHERE project_id IS NOT NULL GROUP BY project_id ORDER BY cost DESC
  `).all() as any[]

  const totals = db.prepare('SELECT SUM(total_cost) as cost, SUM(total_tokens) as tokens, COUNT(*) as events FROM token_events').get() as any

  // Merge live + cost for topAgents
  const costMap: Record<string, number> = {}
  for (const c of costByAgent) costMap[c.agent_id] = c.cost

  const topAgents = liveByAgent
    .map(a => ({ ...a, cost: costMap[a.agentId] || 0 }))
    .sort((a, b) => b.tokens - a.tokens)

  const topProjects = costByProject.map(p => ({
    projectId: p.project_id, tokens: p.tokens, cost: p.cost,
  }))

  // Today aggregate from DB
  const today = new Date().toISOString().split('T')[0]
  const todayRow = db.prepare(`
    SELECT SUM(total_tokens) as tokens, SUM(total_cost) as cost, COUNT(*) as events
    FROM token_events WHERE created_at >= ?
  `).get(today) as any

  return {
    totalTokens: liveTotalTokens,
    totalSessions: liveTotalSessions,
    totalCost: totals?.cost || 0,
    totalEvents: totals?.events || 0,
    todayAggregate: todayRow?.tokens ? { totalTokens: todayRow.tokens, totalCost: todayRow.cost, events: todayRow.events } : null,
    topAgents,
    topProjects,
    timestamp: new Date().toISOString(),
  }
})
