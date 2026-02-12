/**
 * GET /api/projects/:id/docs/:filename
 * Reads a doc from project workspace. Supports subfolders via ?path=reviews/file.md
 */
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve, relative } from 'path'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const filename = getRouterParam(event, 'filename')
  if (!id || !filename) throw createError({ statusCode: 400, statusMessage: 'Project ID et filename requis' })

  const query = getQuery(event)
  const docPath = (query.path as string) || filename

  if (!docPath.endsWith('.md')) throw createError({ statusCode: 400, statusMessage: 'Seuls les fichiers .md sont autorisés' })

  const db = getDb()
  const project = db.prepare('SELECT workspace FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })

  // Security: ensure resolved path stays within workspace
  const filePath = resolve(project.workspace, docPath)
  if (!filePath.startsWith(resolve(project.workspace))) {
    throw createError({ statusCode: 403, statusMessage: 'Accès interdit' })
  }

  if (!existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: `Doc '${docPath}' non trouvé` })

  const content = await readFile(filePath, 'utf-8')
  return { filename: docPath, content }
})
