/**
 * GET /api/agents/:id/files/:filename
 * Reads workspace file. Path resolved from DB.
 */
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { getDb } from '~/server/utils/db'

const ALLOWED_FILES = ['SOUL.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'BOOTSTRAP.md']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const filename = getRouterParam(event, 'filename')

  if (!id || !filename) throw createError({ statusCode: 400, statusMessage: 'Agent ID et filename requis' })
  if (!ALLOWED_FILES.includes(filename)) throw createError({ statusCode: 400, statusMessage: `Fichier non autorisé. Autorisés: ${ALLOWED_FILES.join(', ')}` })

  const db = getDb()
  const agent = db.prepare('SELECT workspace FROM agents WHERE id = ?').get(id) as any
  if (!agent) throw createError({ statusCode: 404, statusMessage: `Agent '${id}' non trouvé` })

  const filePath = join(agent.workspace, filename)
  if (!existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: `Fichier '${filename}' non trouvé` })

  const content = await readFile(filePath, 'utf-8')
  return { filename, content, modified: new Date().toISOString() }
})
