/**
 * POST /api/projects
 * Source de vérité unique : sources/projects.json
 */
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const SOURCES_FILE = join(process.env.HOME || '', '.openclaw/sources/projects.json')

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.id || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'id et name requis' })
  }

  try {
    const raw = await readFile(SOURCES_FILE, 'utf-8')
    const data = JSON.parse(raw)

    if (data.projects.some((p: any) => p.id === body.id)) {
      throw createError({ statusCode: 409, statusMessage: `Projet '${body.id}' existe déjà` })
    }

    const project = {
      state: 'backlog',
      agents: [],
      lead: null,
      channel: null,
      channelId: null,
      github: { repo: null, created: false },
      transitions: [],
      createdAt: new Date().toISOString(),
      ...body
    }

    data.projects.push(project)
    await writeFile(SOURCES_FILE, JSON.stringify(data, null, 2))
    return project
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Erreur création projet' })
  }
})
