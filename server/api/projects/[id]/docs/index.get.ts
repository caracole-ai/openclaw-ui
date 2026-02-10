/**
 * GET /api/projects/:id/docs - List documentation files for a project
 * Recursively scans directories for .md files
 */

import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative } from 'path'
import type { ProjectsData } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'
const ACTIVE_PROJECTS_DIR = process.env.HOME + '/.openclaw/projects/active'
const ARCHIVED_PROJECTS_DIR = process.env.HOME + '/.openclaw/projects/archived'

interface DocFile {
  name: string
  path: string
  size: number
  modifiedAt: string
  folder?: string  // Added: folder path relative to docsPath
}

/**
 * Recursively walk directory and find all .md files
 */
async function walkDir(dir: string, baseDir: string): Promise<DocFile[]> {
  const results: DocFile[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    
    if (entry.isDirectory()) {
      // Skip hidden directories
      if (!entry.name.startsWith('.')) {
        const subResults = await walkDir(fullPath, baseDir)
        results.push(...subResults)
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const stats = await stat(fullPath)
      const relativePath = relative(baseDir, fullPath)
      const folder = relative(baseDir, dir) || '/'
      
      results.push({
        name: entry.name,
        path: relativePath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        folder: folder === '' ? '/' : folder
      })
    }
  }

  return results
}

export default defineEventHandler(async (event): Promise<{ docs: DocFile[], docsPath: string | null }> => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID required'
    })
  }

  try {
    // Get project to find docsPath
    if (!existsSync(PROJECTS_FILE)) {
      return { docs: [], docsPath: null }
    }

    const data = await readFile(PROJECTS_FILE, 'utf-8')
    const projectsData: ProjectsData = JSON.parse(data)
    const project = projectsData.projects.find(p => p.id === id)

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }

    // Determine docs path - check project.sourceDir, docsPath, or try to find in active/archived
    let docsPath = (project as any).sourceDir || (project as any).docsPath

    // If no path yet, try to find by slug pattern in active/ then archived/
    if (!docsPath) {
      const projectSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      
      for (const searchDir of [ACTIVE_PROJECTS_DIR, ARCHIVED_PROJECTS_DIR]) {
        if (!existsSync(searchDir)) continue
        
        const dirs = await readdir(searchDir)
        const matchedDir = dirs.find(dir => {
          const dirLower = dir.toLowerCase()
          return dirLower.includes(projectSlug) || 
                 projectSlug.includes(dirLower) ||
                 dir.includes(id.split('-').slice(-1)[0])
        })

        if (matchedDir) {
          docsPath = join(searchDir, matchedDir)
          break
        }
      }
    }

    if (!docsPath || !existsSync(docsPath)) {
      return { docs: [], docsPath: null }
    }

    // Recursively find all .md files
    const docs = await walkDir(docsPath, docsPath)

    // Sort by folder then by modified date (newest first)
    docs.sort((a, b) => {
      // Root files first
      if (a.folder === '/' && b.folder !== '/') return -1
      if (a.folder !== '/' && b.folder === '/') return 1
      // Then by folder name
      if (a.folder !== b.folder) return a.folder!.localeCompare(b.folder!)
      // Then by date
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    })

    return { docs, docsPath }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[GET /api/projects/:id/docs] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load project docs',
      data: { error: error.message }
    })
  }
})
