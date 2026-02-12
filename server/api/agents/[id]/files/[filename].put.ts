import { writeFile, mkdir } from 'fs/promises'
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

  const body = await readBody(event)
  const content = typeof body === 'string' ? body : body?.content

  if (typeof content !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Content (string) requis dans le body' })
  }

  const dirPath = join(WORKSPACES_DIR, id)
  const filePath = join(dirPath, filename)

  try {
    await mkdir(dirPath, { recursive: true })
    await writeFile(filePath, content, 'utf-8')
    return { success: true, modified: new Date().toISOString() }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur écriture fichier', data: { error: err.message } })
  }
})
