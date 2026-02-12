/**
 * GET /api/agents
 * Source: SQLite + live session stores
 */
import { getDb, getLiveStats } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const teamFilter = query.team as string | undefined
  const statusFilter = query.status as string | undefined

  const db = getDb()

  let sql = 'SELECT * FROM agents WHERE 1=1'
  const params: any[] = []
  if (teamFilter) { sql += ' AND team = ?'; params.push(teamFilter) }
  if (statusFilter) { sql += ' AND status = ?'; params.push(statusFilter) }

  const rows = db.prepare(sql).all(...params) as any[]

  // Enrich with skills and live data
  const getSkills = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?')

  const agents = rows.map(a => {
    const skills = getSkills.all(a.id).map((r: any) => r.skill_id)
    const live = getLiveStats(a.id)
    return {
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      team: a.team,
      role: a.role,
      model: a.model,
      workspace: a.workspace,
      status: a.status,
      skills,
      mattermost: { username: a.mm_username, userId: a.mm_user_id, token: a.mm_token },
      permissions: a.permissions ? JSON.parse(a.permissions) : null,
      createdAt: a.created_at,
      ...live,
    }
  })

  return { agents, timestamp: new Date().toISOString() }
})
