/**
 * GET /api/projects/:id/docs/:filename
 * Reads a doc from project workspace. Path from DB.
 */
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const filename = getRouterParam(event, 'filename')
  if (!id || !filename) throw createError({ statusCode: 400, statusMessage: 'Project ID et filename requis' })
  if (!filename.endsWith('.md')) throw createError({ statusCode: 400, statusMessage: 'Seuls les fichiers .md sont autorisés' })

  const db = getDb()
  const project = db.prepare('SELECT workspace FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })

  const filePath = join(project.workspace, filename)
  if (!existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: `Doc '${filename}' non trouvé` })

  const content = await readFile(filePath, 'utf-8')
  return { filename, content }
})
