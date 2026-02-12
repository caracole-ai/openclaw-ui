/**
 * GET /api/tokens/timeline
 * Source: SQLite — computed aggregation, no pre-calculated aggregates needed
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const from = query.from as string | undefined
  const to = query.to as string | undefined
  const groupBy = (query.groupBy as string) || 'day'
  const agentFilter = query.agent as string | undefined

  const db = getDb()

  // Build GROUP BY expression
  let groupExpr: string
  switch (groupBy) {
    case 'hour': groupExpr = "strftime('%Y-%m-%dT%H', created_at)"; break
    case 'week': groupExpr = "strftime('%Y-%W', created_at)"; break
    case 'month': groupExpr = "strftime('%Y-%m', created_at)"; break
    default: groupExpr = "date(created_at)"; break
  }

  let sql = `SELECT ${groupExpr} as period, SUM(total_tokens) as tokens, SUM(total_cost) as cost, COUNT(*) as count FROM token_events WHERE 1=1`
  const params: any[] = []

  if (from) { sql += ' AND created_at >= ?'; params.push(from) }
  if (to) { sql += ' AND created_at <= ?'; params.push(to) }
  if (agentFilter) { sql += ' AND agent_id = ?'; params.push(agentFilter) }

  sql += ` GROUP BY period ORDER BY period`

  const timeline = db.prepare(sql).all(...params) as any[]

  return {
    timeline: timeline.map(t => ({ period: t.period, tokens: t.tokens, cost: t.cost, count: t.count })),
    groupBy,
    totalEvents: timeline.reduce((s, t) => s + t.count, 0),
    timestamp: new Date().toISOString(),
  }
})
