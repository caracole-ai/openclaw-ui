import { readFile } from 'fs/promises'
import { join } from 'path'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  try {
    const raw = await readFile(join(SOURCES_DIR, 'agents.json'), 'utf-8')
    return JSON.parse(raw)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { agents: [] }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture agents' })
  }
})
