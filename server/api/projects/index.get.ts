/**
 * GET /api/projects
 * Source de vérité unique : sources/projects.json
 */
import { readFile } from 'fs/promises'
import { join } from 'path'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async () => {
  try {
    const raw = await readFile(join(SOURCES_DIR, 'projects.json'), 'utf-8')
    const data = JSON.parse(raw)
    return {
      projects: data.projects || [],
      states: data.states || [],
      total: (data.projects || []).length,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { projects: [], states: [], total: 0, timestamp: new Date().toISOString() }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture projets' })
  }
})
