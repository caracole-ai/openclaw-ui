/**
 * POST /api/projects
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.id || !body.name) throw createError({ statusCode: 400, statusMessage: 'id et name requis' })

  const db = getDb()
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(body.id)
  if (existing) throw createError({ statusCode: 409, statusMessage: `Projet '${body.id}' existe déjà` })

  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO projects (id, name, description, type, status, state, progress, lead, channel, channel_id, workspace, github_repo, github_created, current_phase, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.id, body.name, body.description || null, body.type || null,
    body.status || 'backlog', body.state || 'backlog', body.progress || 0,
    body.lead || null, body.channel || null, body.channelId || null,
    body.workspace || null, body.github?.repo || null, body.github?.created ? 1 : 0,
    body.currentPhase || null, now, now
  )

  // Agents
  if (body.agents?.length || body.team?.length) {
    const insertPA = db.prepare('INSERT OR IGNORE INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')
    const agents = body.team || body.agents?.map((a: string) => ({ agent: a, role: null })) || []
    for (const a of agents) {
      const agentId = typeof a === 'string' ? a : a.agent
      const role = typeof a === 'string' ? null : a.role
      insertPA.run(body.id, agentId, role)
    }
  }

  // Log event
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `evt-${Date.now()}`, 'project.created', 'dashboard', JSON.stringify({ projectId: body.id }), now
  )

  return { id: body.id, name: body.name, status: body.status || 'backlog', createdAt: now }
})
