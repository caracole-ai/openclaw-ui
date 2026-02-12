/**
 * GET /api/projects/:id
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  if (!p) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })

  const team = db.prepare('SELECT agent_id, role FROM project_agents WHERE project_id = ?').all(id) as any[]
  const phases = db.prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY sort_order').all(id) as any[]
  const updates = db.prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC').all(id) as any[]

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    status: p.status,
    state: p.state,
    progress: p.progress,
    lead: p.lead,
    channel: p.channel,
    channelId: p.channel_id,
    workspace: p.workspace,
    github: { repo: p.github_repo, created: !!p.github_created },
    currentPhase: p.current_phase,
    lastNudgeAt: p.last_nudge_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    team: team.map(a => ({ agent: a.agent_id, role: a.role })),
    agents: team.map(a => a.agent_id),
    assignees: team.map(a => a.agent_id),
    phases: phases.map(ph => ({ name: ph.name, status: ph.status, startedAt: ph.started_at, completedAt: ph.completed_at })),
    updates: updates.map(u => ({ timestamp: u.created_at, agentId: u.agent_id, message: u.message, type: u.type })),
  }
})
