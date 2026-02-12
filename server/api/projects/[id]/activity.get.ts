/**
 * GET /api/projects/:id/activity
 * Source: SQLite + live session stores
 */
import { getDb, getLiveStats } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'Project ID required' })

  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Project ${projectId} not found` })

  // Get assigned agents
  const agents = db.prepare('SELECT agent_id, role FROM project_agents WHERE project_id = ?').all(projectId) as any[]
  const assignees = agents.map(a => a.agent_id)

  // Token stats per agent (from live session stores)
  const byAgent = assignees.map(agentId => {
    const live = getLiveStats(agentId)
    return { agentId, ...live }
  }).filter(a => a.totalTokens > 0)

  const totalTokens = byAgent.reduce((sum, a) => sum + a.totalTokens, 0)

  // Burn rate estimate
  const projectAgeHours = (Date.now() - new Date(project.created_at).getTime()) / 3600000
  const burnRate = projectAgeHours > 0 ? Math.round(totalTokens / projectAgeHours) : 0

  // Token cost from DB
  const costRow = db.prepare('SELECT SUM(total_cost) as cost FROM token_events WHERE project_id = ?').get(projectId) as any
  const totalCost = costRow?.cost || 0

  // Recent updates
  const updates = db.prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 10').all(projectId) as any[]

  return {
    projectId,
    projectName: project.name,
    assignees,
    tokens: { total: totalTokens, byAgent, burnRate, totalCost },
    recentUpdates: updates.map(u => ({ timestamp: u.created_at, agentId: u.agent_id, message: u.message, type: u.type })),
    timestamp: new Date().toISOString(),
  }
})
