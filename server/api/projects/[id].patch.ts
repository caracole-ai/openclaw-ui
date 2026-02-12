/**
 * PATCH /api/projects/:id
 * Source de vérité unique : sources/projects.json
 */
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const SOURCES_FILE = join(process.env.HOME || '', '.openclaw/sources/projects.json')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })
  }

  try {
    const raw = await readFile(SOURCES_FILE, 'utf-8')
    const data = JSON.parse(raw)
    const idx = data.projects.findIndex((p: any) => p.id === id)

    if (idx === -1) {
      throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
    }

    // Merge updates
    data.projects[idx] = { ...data.projects[idx], ...body, id } // id immutable

    await writeFile(SOURCES_FILE, JSON.stringify(data, null, 2))
    return data.projects[idx]
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Erreur mise à jour projet' })
  }
})
