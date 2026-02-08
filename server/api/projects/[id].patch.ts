/**
 * PATCH /api/projects/:id - Update project status/progress
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { Project, ProjectsData, ProjectUpdateRequest } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'

export default defineEventHandler(async (event): Promise<Project> => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<ProjectUpdateRequest>(event)

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

    const projectIndex = projectsData.projects.findIndex(p => p.id === id)

    if (projectIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }

    const project = projectsData.projects[projectIndex]
    const now = new Date().toISOString()

    // Update fields
    if (body.status) {
      project.status = body.status
      if (body.status === 'in-progress' && !project.startedAt) {
        project.startedAt = now
      }
      if (body.status === 'completed') {
        project.completedAt = now
        project.progress = 100
      }
    }

    if (body.progress !== undefined) {
      project.progress = Math.min(100, Math.max(0, body.progress))
    }

    if (body.currentPhase) {
      project.currentPhase = body.currentPhase
      // Update phase statuses
      let foundCurrent = false
      project.phases = project.phases.map(phase => {
        if (phase.name === body.currentPhase) {
          foundCurrent = true
          return { ...phase, status: 'in-progress', startedAt: phase.startedAt || now }
        }
        if (!foundCurrent) {
          return { ...phase, status: 'completed', completedAt: phase.completedAt || now }
        }
        return { ...phase, status: 'pending' }
      })
    }

    // Add update log entry
    if (body.message) {
      project.updates.push({
        timestamp: now,
        agentId: getHeader(event, 'x-agent-id') || 'api',
        message: body.message,
        phase: body.currentPhase,
        status: body.status
      })
    }

    project.updatedAt = now
    projectsData.projects[projectIndex] = project
    projectsData.lastUpdated = now

    // Save
    await writeFile(PROJECTS_FILE, JSON.stringify(projectsData, null, 2))

    return project
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('[PATCH /api/projects/:id] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update project',
      data: { error: error.message }
    })
  }
})
