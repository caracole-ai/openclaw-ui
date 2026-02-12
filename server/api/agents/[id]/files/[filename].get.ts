import { readFile, stat } from 'fs/promises'
import { join } from 'path'

const WORKSPACES_DIR = join(process.env.HOME || '', '.openclaw/workspaces')
const ALLOWED_FILES = ['SOUL.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'BOOTSTRAP.md']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const filename = getRouterParam(event, 'filename')

  if (!id || !filename) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID et filename requis' })
  }

  if (!ALLOWED_FILES.includes(filename)) {
    throw createError({ statusCode: 400, statusMessage: `Fichier non autorisé. Autorisés: ${ALLOWED_FILES.join(', ')}` })
  }

  const filePath = join(WORKSPACES_DIR, id, filename)

  try {
    const [content, stats] = await Promise.all([
      readFile(filePath, 'utf-8'),
      stat(filePath)
    ])
    return { content, modified: stats.mtime.toISOString() }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: `Fichier '${filename}' introuvable pour l'agent '${id}'` })
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture fichier', data: { error: err.message } })
  }
})
