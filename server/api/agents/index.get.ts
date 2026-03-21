/**
 * GET /api/agents
 * Source: SQLite + live session stores
 */
import { getDb, getLiveStats } from '~/server/utils/db'
import { serializeAgent } from '~/server/utils/serializers'
import type { DbAgent, DbAgentSkill, DbAgentMcp } from '~/server/types/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const teamFilter = query.team as string | undefined
  const statusFilter = query.status as string | undefined

  const db = getDb()

  let sql = 'SELECT * FROM agents WHERE 1=1'
  const params: any[] = []
  if (teamFilter) { sql += ' AND team = ?'; params.push(teamFilter) }
  if (statusFilter) { sql += ' AND status = ?'; params.push(statusFilter) }

  const rows = db.prepare(sql).all(...params) as DbAgent[]

  const getSkills = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?')
  const getMcps = db.prepare('SELECT mcp_id FROM agent_mcps WHERE agent_id = ?')

  const agents = rows.map(a => {
    const skills = (getSkills.all(a.id) as DbAgentSkill[]).map(r => r.skill_id)
    const mcps = (getMcps.all(a.id) as DbAgentMcp[]).map(r => r.mcp_id)
    const live = getLiveStats(a.id)
    return serializeAgent(a, { skills, mcps, live })
  })

  return { agents, timestamp: new Date().toISOString() }
})
