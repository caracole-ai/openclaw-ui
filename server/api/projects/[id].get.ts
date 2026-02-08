/**
 * GET /api/projects/:id - Get project details
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { Project, ProjectsData } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'

export default defineEventHandler(async (event): Promise<Project> => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID required'
    })
  }

  try {
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

    // Calculate stale indicators
    const now = Date.now()
    const updatedAt = new Date(project.updatedAt).getTime()
    const staleHours = Math.floor((now - updatedAt) / (1000 * 60 * 60))
    const isStale = staleHours > 24 && !['completed', 'archived', 'paused'].includes(project.status)

    return { ...project, staleHours, isStale }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[GET /api/projects/:id] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load project',
      data: { error: error.message }
    })
  }
})
