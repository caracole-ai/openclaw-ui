/**
 * GET /api/projects/:id/docs/:filename - Get content of a documentation file
 * Supports files in subdirectories (path URL-encoded)
 */

import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, normalize, resolve } from 'path'
import type { ProjectsData } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'
const ACTIVE_PROJECTS_DIR = process.env.HOME + '/.openclaw/projects/active'

interface DocContent {
  name: string
  path: string
  content: string
  size: number
  modifiedAt: string
}

export default defineEventHandler(async (event): Promise<DocContent> => {
  const id = getRouterParam(event, 'id')
  const filename = getRouterParam(event, 'filename')

  if (!id || !filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID and filename required'
    })
  }

  // Decode URL-encoded path (supports subdirectories like "deliverables/NOVEL.md")
  const decodedPath = decodeURIComponent(filename)
  
  // Security: only allow .md files, prevent path traversal
  if (!decodedPath.endsWith('.md')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid filename - only .md files allowed'
    })
  }
  
  // Normalize and check for path traversal
  const normalizedPath = normalize(decodedPath)
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid path - path traversal not allowed'
    })
  }

  try {
    // Get project to find docsPath
    if (!existsSync(PROJECTS_FILE)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
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

    // Determine docs path
    let docsPath = (project as any).docsPath

    if (!docsPath && existsSync(ACTIVE_PROJECTS_DIR)) {
      const activeDirs = await readdir(ACTIVE_PROJECTS_DIR)
      
      const projectSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      
      const matchedDir = activeDirs.find(dir => {
        const dirLower = dir.toLowerCase()
        return dirLower.includes(projectSlug) || 
               projectSlug.includes(dirLower) ||
               dir.includes(id.split('-').slice(-1)[0])
      })

      if (matchedDir) {
        docsPath = join(ACTIVE_PROJECTS_DIR, matchedDir)
      }
    }

    if (!docsPath || !existsSync(docsPath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Documentation folder not found'
      })
    }

    // Build full path and verify it's within docsPath (security check)
    const filePath = join(docsPath, normalizedPath)
    const resolvedDocsPath = resolve(docsPath)
    const resolvedFilePath = resolve(filePath)
    
    if (!resolvedFilePath.startsWith(resolvedDocsPath)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid path - access denied'
      })
    }
    
    if (!existsSync(filePath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Document not found'
      })
    }

    const [content, stats] = await Promise.all([
      readFile(filePath, 'utf-8'),
      stat(filePath)
    ])

    return {
      name: basename(normalizedPath),
      path: normalizedPath,
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[GET /api/projects/:id/docs/:filename] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load document',
      data: { error: error.message }
    })
  }
})
