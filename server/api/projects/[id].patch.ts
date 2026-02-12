/**
 * PATCH /api/projects/:id
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'

const ALLOWED_FIELDS = ['name', 'description', 'type', 'status', 'state', 'progress', 'lead', 'channel', 'channel_id', 'workspace', 'github_repo', 'github_created', 'current_phase', 'last_nudge_at']
const FIELD_MAP: Record<string, string> = {
  channelId: 'channel_id', githubRepo: 'github_repo', githubCreated: 'github_created',
  currentPhase: 'current_phase', lastNudgeAt: 'last_nudge_at',
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const body = await readBody(event)
  const db = getDb()

  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })

  // Build SET clause from allowed fields
  const sets: string[] = ['updated_at = datetime(\'now\')']
  const params: any[] = []

  for (const [key, val] of Object.entries(body)) {
    const col = FIELD_MAP[key] || key
    if (ALLOWED_FIELDS.includes(col)) {
      sets.push(`${col} = ?`)
      params.push(val)
    }
  }

  if (sets.length > 1) {
    params.push(id)
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  }

  // Handle team/agents update
  if (body.team || body.agents) {
    db.prepare('DELETE FROM project_agents WHERE project_id = ?').run(id)
    const insertPA = db.prepare('INSERT OR IGNORE INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')
    const agents = body.team || body.agents?.map((a: string) => ({ agent: a, role: null })) || []
    for (const a of agents) {
      const agentId = typeof a === 'string' ? a : a.agent
      const role = typeof a === 'string' ? null : a.role
      insertPA.run(id, agentId, role)
    }
  }

  // Handle phases update
  if (body.phases) {
    db.prepare('DELETE FROM project_phases WHERE project_id = ?').run(id)
    const insertPhase = db.prepare('INSERT INTO project_phases (project_id, name, status, started_at, completed_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    body.phases.forEach((ph: any, i: number) => {
      insertPhase.run(id, ph.name, ph.status || 'pending', ph.startedAt || null, ph.completedAt || null, i)
    })
  }

  // Handle updates append
  if (body.updates && Array.isArray(body.updates)) {
    const insertUpdate = db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    for (const u of body.updates) {
      insertUpdate.run(id, u.agentId || null, u.message, u.type || 'note', u.timestamp || new Date().toISOString())
    }
  }

  // Handle single message (from UI "add update")
  if (body.message && !body.updates) {
    db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
      id, 'dashboard', body.message, 'note'
    )
  }

  // Return full project (same format as GET)
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  const team = db.prepare('SELECT agent_id, role FROM project_agents WHERE project_id = ?').all(id) as any[]
  const phases = db.prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY sort_order').all(id) as any[]
  const updates = db.prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC').all(id) as any[]

  return {
    id: p.id, name: p.name, description: p.description, type: p.type,
    status: p.status, state: p.state, progress: p.progress, lead: p.lead,
    channel: p.channel, channelId: p.channel_id, workspace: p.workspace,
    github: { repo: p.github_repo, created: !!p.github_created },
    currentPhase: p.current_phase, lastNudgeAt: p.last_nudge_at,
    createdAt: p.created_at, updatedAt: p.updated_at,
    team: team.map(a => ({ agent: a.agent_id, role: a.role })),
    agents: team.map(a => a.agent_id),
    assignees: team.map(a => a.agent_id),
    phases: phases.map(ph => ({ name: ph.name, status: ph.status, startedAt: ph.started_at, completedAt: ph.completed_at })),
    updates: updates.map(u => ({ timestamp: u.created_at, agentId: u.agent_id, message: u.message, type: u.type })),
  }
})
