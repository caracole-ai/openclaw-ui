/**
 * GET /api/projects/:id/docs
 * Lists .md files in project workspace (recursive).
 */
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative } from 'path'
import { getDb } from '~/server/utils/db'

async function scanDir(dir: string, base: string): Promise<any[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: any[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await scanDir(fullPath, base))
    } else if (entry.name.endsWith('.md')) {
      const s = await stat(fullPath)
      const relPath = relative(base, fullPath)
      const folder = relative(base, dir) || null
      results.push({
        name: entry.name,
        path: relPath,
        filename: entry.name,
        folder,
        size: s.size,
        modified: s.mtime.toISOString(),
        modifiedAt: s.mtime.toISOString(),
      })
    }
  }
  return results
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()
  const project = db.prepare('SELECT workspace FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
  if (!project.workspace || !existsSync(project.workspace)) return { docs: [] }

  try {
    const docs = await scanDir(project.workspace, project.workspace)
    return { docs }
  } catch {
    return { docs: [] }
  }
})
