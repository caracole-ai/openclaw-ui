/**
 * GET /api/projects/:id/docs/:filename
 * Source de vérité: sources/projects.json → workspace
 */
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, normalize, resolve } from 'path'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const filename = getRouterParam(event, 'filename')

  if (!id || !filename) throw createError({ statusCode: 400, statusMessage: 'ID et filename requis' })

  const decodedPath = decodeURIComponent(filename)
  if (!decodedPath.endsWith('.md')) throw createError({ statusCode: 400, statusMessage: 'Seuls les .md sont autorisés' })

  const normalizedPath = normalize(decodedPath)
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Chemin invalide' })
  }

  try {
    const raw = await readFile(join(SOURCES_DIR, 'projects.json'), 'utf-8')
    const { projects } = JSON.parse(raw)
    const project = projects.find((p: any) => p.id === id)

    if (!project) throw createError({ statusCode: 404, statusMessage: 'Projet non trouvé' })

    const docsPath = project.workspace
    if (!docsPath || !existsSync(docsPath)) {
      throw createError({ statusCode: 404, statusMessage: 'Workspace projet introuvable' })
    }

    const filePath = join(docsPath, normalizedPath)
    if (!resolve(filePath).startsWith(resolve(docsPath))) {
      throw createError({ statusCode: 400, statusMessage: 'Accès refusé' })
    }

    if (!existsSync(filePath)) {
      throw createError({ statusCode: 404, statusMessage: 'Document non trouvé' })
    }

    const [content, stats] = await Promise.all([
      readFile(filePath, 'utf-8'),
      stat(filePath)
    ])

    return {
      name: basename(normalizedPath),
      path: normalizedPath,
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture document' })
  }
})
