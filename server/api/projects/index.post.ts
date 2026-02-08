/**
 * POST /api/projects - Create a new project
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import type { Project, ProjectsData, ProjectCreateRequest } from '~/types/projects'

const PROJECTS_DIR = process.env.HOME + '/.openclaw/projects'
const PROJECTS_FILE = PROJECTS_DIR + '/projects.json'

function generateId(): string {
  return `proj-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`
}

export default defineEventHandler(async (event): Promise<Project> => {
  try {
    const body = await readBody<ProjectCreateRequest>(event)

    if (!body.name || !body.type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'name and type are required'
      })
    }

    // Ensure directory exists
    if (!existsSync(PROJECTS_DIR)) {
      mkdirSync(PROJECTS_DIR, { recursive: true })
    }

    // Load existing projects
    let projectsData: ProjectsData = { projects: [], lastUpdated: null }
    if (existsSync(PROJECTS_FILE)) {
      const data = await readFile(PROJECTS_FILE, 'utf-8')
      projectsData = JSON.parse(data)
    }

    // Create new project
    const now = new Date().toISOString()
    const newProject: Project = {
      id: generateId(),
      name: body.name,
      description: body.description || '',
      type: body.type,
      status: 'planning',
      createdAt: now,
      updatedAt: now,
      team: body.team || [],
      lead: body.lead,
      phases: body.phases?.map((p, i) => ({
        name: p.name,
        status: i === 0 ? 'in-progress' : 'pending'
      })) || [],
      currentPhase: body.phases?.[0]?.name,
      progress: 0,
      updates: [{
        timestamp: now,
        agentId: 'system',
        message: 'Projet créé'
      }],
      tags: body.tags || [],
      priority: body.priority || 'medium'
    }

    // Add to projects
    projectsData.projects.push(newProject)
    projectsData.lastUpdated = now

    // Save
    await writeFile(PROJECTS_FILE, JSON.stringify(projectsData, null, 2))

    return newProject
  } catch (error: any) {
    console.error('[POST /api/projects] Error:', error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create project',
      data: { error: error.message }
    })
  }
})
