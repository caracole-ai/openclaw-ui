/**
 * PUT /api/agents/:id/files/:filename
 * Writes workspace file. Path resolved from DB.
 */
import { writeFile, mkdir } from 'fs/promises'
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

  const body = await readBody(event)
  const content = typeof body === 'string' ? body : body?.content
  if (typeof content !== 'string') throw createError({ statusCode: 400, statusMessage: 'Content (string) requis dans le body' })

  await mkdir(agent.workspace, { recursive: true })
  await writeFile(join(agent.workspace, filename), content, 'utf-8')

  return { success: true, modified: new Date().toISOString() }
})
