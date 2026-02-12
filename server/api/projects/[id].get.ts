/**
 * GET /api/projects/:id
 * Source de vérité unique : sources/projects.json
 */
import { readFile } from 'fs/promises'
import { join } from 'path'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })
  }

  try {
    const raw = await readFile(join(SOURCES_DIR, 'projects.json'), 'utf-8')
    const { projects } = JSON.parse(raw)
    const project = projects.find((p: any) => p.id === id)

    if (!project) {
      throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
    }

    return project
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture projet' })
  }
})
