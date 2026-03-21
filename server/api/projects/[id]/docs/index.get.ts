/**
 * GET /api/projects/:id/docs
 * Lists .md files in project workspace (recursive).
 */
import { readdir, stat } from 'fs/promises'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { getDb } from '~/server/utils/db'

async function scanDir(dir: string, base: string, depth: number = 0): Promise<any[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: any[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relPath = relative(base, fullPath)
    
    if (entry.isDirectory()) {
      // Exclure node_modules, .git, et autres dossiers système
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
        continue
      }
      
      // Autoriser uniquement racine (depth=0) et /docs ou /doc
      if (depth === 0 && (entry.name === 'docs' || entry.name === 'doc')) {
        results.push(...await scanDir(fullPath, base, depth + 1))
      } else if (depth > 0 && relPath.startsWith('docs/') || relPath.startsWith('doc/')) {
        // Continuer dans les sous-dossiers de docs/doc
        results.push(...await scanDir(fullPath, base, depth + 1))
      }
    } else if (entry.name.endsWith('.md')) {
      // Accepter les .md à la racine (depth=0) ou dans docs/doc
      if (depth === 0 || relPath.startsWith('docs/') || relPath.startsWith('doc/')) {
        const s = await stat(fullPath)
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
  }
  return results
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()
  const project = db.prepare('SELECT workspace FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
  try {
    // Scan workspace if it exists
    const docs = (project.workspace && existsSync(project.workspace))
      ? await scanDir(project.workspace, project.workspace)
      : []

    // Scan Obsidian vault for related docs
    const vaultBase = join(process.env.HOME || '', 'Documents/ObsidianVault')
    const vaultDocs: typeof docs = []

    // 1. Fiche projet + specs in Projets/
    const projetsDir = join(vaultBase, 'Projets')
    if (existsSync(projetsDir)) {
      const files = readdirSync(projetsDir)
      for (const file of files) {
        if (file.endsWith('.md') && (file.startsWith(id) || file.includes(id))) {
          const filePath = join(projetsDir, file)
          const stat = statSync(filePath)
          vaultDocs.push({
            name: file,
            path: filePath,
            folder: 'Obsidian/Projets',
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            source: 'vault',
          })
        }
      }
    }

    // 2. MetaFlow docs (shared pipeline documentation)
    const metaflowDir = join(vaultBase, 'MetaFlow')
    if (existsSync(metaflowDir)) {
      const files = readdirSync(metaflowDir)
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = join(metaflowDir, file)
          const stat = statSync(filePath)
          vaultDocs.push({
            name: file,
            path: filePath,
            folder: 'Obsidian/MetaFlow',
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            source: 'vault',
          })
        }
      }
    }

    // Merge: vault docs first (source of truth), then workspace docs
    return { docs: [...vaultDocs, ...docs] }
  } catch {
    return { docs: [] }
  }
})
