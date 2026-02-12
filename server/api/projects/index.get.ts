/**
 * GET /api/projects
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'
import { serializeProject } from '~/server/utils/serializers'
import type { DbProject, DbProjectAgent, DbProjectPhase, DbProjectUpdate } from '~/server/types/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const stateFilter = query.state as string | undefined
  const statusFilter = query.status as string | undefined  // deprecated, use state

  const db = getDb()

  let sql = 'SELECT * FROM projects WHERE 1=1'
  const params: any[] = []
  if (stateFilter) { sql += ' AND state = ?'; params.push(stateFilter) }
  if (statusFilter) { sql += ' AND status = ?'; params.push(statusFilter) }
  sql += ' ORDER BY updated_at DESC'

  const rows = db.prepare(sql).all(...params) as DbProject[]

  if (rows.length === 0) {
    return { projects: [], total: 0, timestamp: new Date().toISOString() }
  }

  // Batch queries to avoid N+1
  const ids = rows.map(p => p.id)
  const placeholders = ids.map(() => '?').join(',')

  const allAgents = db.prepare(`SELECT * FROM project_agents WHERE project_id IN (${placeholders})`).all(...ids) as DbProjectAgent[]
  const allPhases = db.prepare(`SELECT * FROM project_phases WHERE project_id IN (${placeholders}) ORDER BY sort_order`).all(...ids) as DbProjectPhase[]
  const allUpdates = db.prepare(`SELECT * FROM project_updates WHERE project_id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids) as DbProjectUpdate[]

  // Group by project_id
  const agentsByProject = new Map<string, DbProjectAgent[]>()
  const phasesByProject = new Map<string, DbProjectPhase[]>()
  const updatesByProject = new Map<string, DbProjectUpdate[]>()

  for (const a of allAgents) {
    const list = agentsByProject.get(a.project_id) || []
    list.push(a)
    agentsByProject.set(a.project_id, list)
  }
  for (const ph of allPhases) {
    const list = phasesByProject.get(ph.project_id) || []
    list.push(ph)
    phasesByProject.set(ph.project_id, list)
  }
  for (const u of allUpdates) {
    const list = updatesByProject.get(u.project_id) || []
    if (list.length < 20) list.push(u)  // LIMIT 20 per project
    updatesByProject.set(u.project_id, list)
  }

  const projects = rows.map(p => serializeProject(p, {
    team: agentsByProject.get(p.id) || [],
    phases: phasesByProject.get(p.id) || [],
    updates: updatesByProject.get(p.id) || [],
  }))

  return { projects, total: projects.length, timestamp: new Date().toISOString() }
})
