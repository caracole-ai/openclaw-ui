/**
 * DELETE /api/projects/:id
 * Source: SQLite
 * Deletes project and all related data
 */
import { getDb } from '~/server/utils/db'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()

  // Check if project exists
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
  }

  // Delete in transaction
  const transaction = db.transaction(() => {
    // Delete related data (cascade)
    db.prepare('DELETE FROM project_updates WHERE project_id = ?').run(id)
    db.prepare('DELETE FROM project_phases WHERE project_id = ?').run(id)
    db.prepare('DELETE FROM project_agents WHERE project_id = ?').run(id)
    
    // Delete project
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    
    // Log event
    db.prepare('INSERT INTO events (type, project_id, details, created_at) VALUES (?, ?, ?, datetime(\'now\'))').run(
      'project:deleted',
      id,
      `Project ${id} deleted`
    )
  })

  transaction()

  // Optional: Delete project workspace folder
  const projectsDir = join(process.env.HOME || '', '.openclaw', 'projects', id)
  if (existsSync(projectsDir)) {
    try {
      rmSync(projectsDir, { recursive: true, force: true })
    } catch (err) {
      console.error(`[delete] Failed to remove project directory ${projectsDir}:`, err)
      // Non-fatal - project is already deleted from DB
    }
  }

  return { success: true, deleted: id }
})
