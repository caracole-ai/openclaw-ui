/**
 * GET /api/projects/:id/docs
 * Liste les fichiers .md du workspace projet (source de vérité: sources/projects.json → workspace)
 */
import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative } from 'path'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

interface DocFile {
  name: string
  path: string
  size: number
  modifiedAt: string
  folder: string
}

async function walkDir(dir: string, baseDir: string): Promise<DocFile[]> {
  const results: DocFile[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...await walkDir(fullPath, baseDir))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const stats = await stat(fullPath)
      const folder = relative(baseDir, dir) || '/'
      results.push({
        name: entry.name,
        path: relative(baseDir, fullPath),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        folder: folder === '' ? '/' : folder
      })
    }
  }
  return results
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  try {
    const raw = await readFile(join(SOURCES_DIR, 'projects.json'), 'utf-8')
    const { projects } = JSON.parse(raw)
    const project = projects.find((p: any) => p.id === id)

    if (!project) throw createError({ statusCode: 404, statusMessage: 'Projet non trouvé' })

    const docsPath = project.workspace
    if (!docsPath || !existsSync(docsPath)) {
      return { docs: [], docsPath: null }
    }

    const docs = await walkDir(docsPath, docsPath)
    docs.sort((a, b) => {
      if (a.folder === '/' && b.folder !== '/') return -1
      if (a.folder !== '/' && b.folder === '/') return 1
      if (a.folder !== b.folder) return a.folder.localeCompare(b.folder)
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    })

    return { docs, docsPath }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture docs' })
  }
})
