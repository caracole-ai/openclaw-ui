import { readFile } from 'fs/promises'
import { join } from 'path'

const ALLOWED_SOURCES = ['agents', 'projects', 'teams', 'skills', 'tokens', 'events']
const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename || !ALLOWED_SOURCES.includes(filename)) {
    throw createError({ statusCode: 400, statusMessage: `Source invalide. Autorisées: ${ALLOWED_SOURCES.join(', ')}` })
  }

  try {
    const content = await readFile(join(SOURCES_DIR, `${filename}.json`), 'utf-8')
    return JSON.parse(content)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: `Source '${filename}.json' introuvable` })
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture source', data: { error: err.message } })
  }
})
