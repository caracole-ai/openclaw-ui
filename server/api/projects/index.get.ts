/**
 * GET /api/projects - List all projects
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { ProjectsResponse, ProjectsData } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'

export default defineEventHandler(async (): Promise<ProjectsResponse> => {
  try {
    if (!existsSync(PROJECTS_FILE)) {
      return {
        projects: [],
        total: 0,
        timestamp: new Date().toISOString()
      }
    }

    const data = await readFile(PROJECTS_FILE, 'utf-8')
    const projectsData: ProjectsData = JSON.parse(data)

    // Calculate staleHours for each project
    const now = Date.now()
    const enrichedProjects = projectsData.projects.map(project => {
      const updatedAt = new Date(project.updatedAt).getTime()
      const staleHours = Math.floor((now - updatedAt) / (1000 * 60 * 60))
      const isStale = staleHours > 24 && !['completed', 'archived', 'paused'].includes(project.status)
      return { ...project, staleHours, isStale }
    })

    // Sort by: stale first, then status priority, then updatedAt
    const statusPriority: Record<string, number> = {
      'in-progress': 0,
      'review': 1,
      'planning': 2,
      'paused': 3,
      'completed': 4,
      'archived': 5
    }

    const sortedProjects = enrichedProjects.sort((a, b) => {
      // Stale projects first (attention needed)
      if (a.isStale && !b.isStale) return -1
      if (!a.isStale && b.isStale) return 1
      
      // Then by status priority
      const statusDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99)
      if (statusDiff !== 0) return statusDiff
      
      // Then by updatedAt
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return {
      projects: sortedProjects,
      total: sortedProjects.length,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    console.error('[/api/projects] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load projects',
      data: { error: error.message }
    })
  }
})
