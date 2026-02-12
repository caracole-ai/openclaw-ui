/**
 * GET /api/projects/:id/docs
 * Lists .md files in project workspace. Path from DB.
 */
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()
  const project = db.prepare('SELECT workspace FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
  if (!project.workspace || !existsSync(project.workspace)) return { docs: [] }

  try {
    const files = await readdir(project.workspace)
    const docs = []
    for (const f of files.filter(f => f.endsWith('.md'))) {
      const s = await stat(join(project.workspace, f))
      docs.push({ name: f, path: f, filename: f, size: s.size, modified: s.mtime.toISOString(), modifiedAt: s.mtime.toISOString() })
    }
    return { docs }
  } catch {
    return { docs: [] }
  }
})
