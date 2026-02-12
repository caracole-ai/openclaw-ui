/**
 * GET /api/projects
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const stateFilter = query.state as string | undefined
  const statusFilter = query.status as string | undefined

  const db = getDb()

  let sql = 'SELECT * FROM projects WHERE 1=1'
  const params: any[] = []
  if (stateFilter) { sql += ' AND state = ?'; params.push(stateFilter) }
  if (statusFilter) { sql += ' AND status = ?'; params.push(statusFilter) }
  sql += ' ORDER BY updated_at DESC'

  const rows = db.prepare(sql).all(...params) as any[]

  const getAgents = db.prepare('SELECT agent_id, role FROM project_agents WHERE project_id = ?')
  const getPhases = db.prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY sort_order')
  const getUpdates = db.prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 20')

  const projects = rows.map(p => ({
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
    team: getAgents.all(p.id).map((a: any) => ({ agent: a.agent_id, role: a.role })),
    agents: getAgents.all(p.id).map((a: any) => a.agent_id),
    assignees: getAgents.all(p.id).map((a: any) => a.agent_id),
    phases: getPhases.all(p.id).map((ph: any) => ({
      name: ph.name, status: ph.status, startedAt: ph.started_at, completedAt: ph.completed_at,
    })),
    updates: getUpdates.all(p.id).map((u: any) => ({
      timestamp: u.created_at, agentId: u.agent_id, message: u.message, type: u.type,
    })),
  }))

  return { projects, total: projects.length, timestamp: new Date().toISOString() }
})
