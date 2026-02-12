/**
 * GET /api/projects/:id
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'
import { serializeProject } from '~/server/utils/serializers'
import type { DbProject, DbProjectAgent, DbProjectPhase, DbProjectUpdate } from '~/server/types/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as DbProject | undefined
  if (!p) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })

  const team = db.prepare('SELECT * FROM project_agents WHERE project_id = ?').all(id) as DbProjectAgent[]
  const phases = db.prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY sort_order').all(id) as DbProjectPhase[]
  const updates = db.prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC').all(id) as DbProjectUpdate[]

  return serializeProject(p, { team, phases, updates })
})
