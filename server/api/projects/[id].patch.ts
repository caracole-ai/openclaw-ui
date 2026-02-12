/**
 * PATCH /api/projects/:id - Update project status/progress
 * 
 * Handles both:
 * - Manual projects (in projects.json)
 * - Filesystem projects (fs-* prefix, in active/ or archived/)
 */

import { readFile, writeFile, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { Project, ProjectsData, ProjectUpdateRequest } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'
const PROJECTS_ACTIVE_DIR = process.env.HOME + '/.openclaw/projects/active'
const PROJECTS_ARCHIVED_DIR = process.env.HOME + '/.openclaw/projects/archived'

/**
 * Send notification to Mattermost channel
 * Uses orchestrator token (most likely to have channel access)
 */
async function notifyMattermost(channelId: string, message: string): Promise<boolean> {
  const mattermostUrl = process.env.MATTERMOST_URL || 'http://localhost:8065'
  // Use orchestrator token - it's likely a member of project channels
  const botToken = process.env.MATTERMOST_BOT_TOKEN || 'kezzonhot3bd8cyyzaq5ucskge'
  
  try {
    const response = await fetch(`${mattermostUrl}/api/v4/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel_id: channelId,
        message: message
      })
    })
    if (response.ok) {
      console.log(`[projects] Notified in channel ${channelId}`)
      return true
    }
    console.warn(`[projects] Notification failed: ${response.status}`)
    return false
  } catch (e: any) {
    console.warn('[projects] Notification error:', e.message)
    return false
  }
}

/**
 * Build notification message with assignees mentions
 */
function buildNotificationMessage(projectName: string, assignees?: string[]): string {
  const mentions = assignees && assignees.length > 0 
    ? assignees.map(a => `@${a}`).join(' ')
    : '@orchestrator'
  
  return `🔄 **Projet ${projectName}** relancé via le dashboard.\n\n${mentions} — reprenez le suivi de ce projet.`
}

/**
 * Handle filesystem project update (fs-* prefixed IDs)
 */
async function updateFilesystemProject(id: string, body: ProjectUpdateRequest): Promise<Project | null> {
  const projectName = id.replace('fs-', '')
  
  // Find in active or archived
  let projectDir = join(PROJECTS_ACTIVE_DIR, projectName)
  let isCurrentlyArchived = false
  
  if (!existsSync(projectDir)) {
    projectDir = join(PROJECTS_ARCHIVED_DIR, projectName)
    isCurrentlyArchived = true
    if (!existsSync(projectDir)) {
      return null // Not found
    }
  }
  
  const contributorsPath = join(projectDir, 'contributors.json')
  const now = new Date().toISOString()
  
  // Load or create metadata
  let metadata: any = {}
  if (existsSync(contributorsPath)) {
    metadata = JSON.parse(await readFile(contributorsPath, 'utf-8'))
  }
  
  // Update status in metadata
  if (body.status) {
    metadata.status = body.status
    metadata.lastActivity = now
    
    // Move between active/archived if status changed
    const shouldBeArchived = body.status === 'archived' || body.status === 'completed'
    
    if (shouldBeArchived && !isCurrentlyArchived) {
      // Move to archived
      const newPath = join(PROJECTS_ARCHIVED_DIR, projectName)
      await rename(projectDir, newPath)
      projectDir = newPath
    } else if (!shouldBeArchived && isCurrentlyArchived) {
      // Move back to active
      const newPath = join(PROJECTS_ACTIVE_DIR, projectName)
      await rename(projectDir, newPath)
      projectDir = newPath
    }
  }
  
  if (body.progress !== undefined) {
    metadata.progress = body.progress
  }
  
  // Save metadata
  await writeFile(join(projectDir, 'contributors.json'), JSON.stringify(metadata, null, 2))
  
  // Notify when status changed to 'in-progress'
  if (body.status === 'in-progress' && metadata.channelId) {
    const projectDisplayName = metadata.name || projectName
    const message = buildNotificationMessage(projectDisplayName, metadata.contributors)
    await notifyMattermost(metadata.channelId, message)
  }
  
  // Return updated project object
  return {
    id,
    name: metadata.name || projectName,
    description: '',
    type: 'hybrid',
    status: metadata.status || (isCurrentlyArchived ? 'archived' : 'in-progress'),
    createdAt: metadata.created || now,
    updatedAt: now,
    team: metadata.contributors || [],
    phases: [],
    progress: metadata.progress ?? 50,
    updates: [],
    workspace: projectDir
  }
}

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
    // Handle filesystem projects (fs-* prefix)
    if (id.startsWith('fs-')) {
      const updated = await updateFilesystemProject(id, body)
      if (updated) return updated
      throw createError({
        statusCode: 404,
        statusMessage: 'Filesystem project not found'
      })
    }
    
    // Handle manual projects (projects.json)
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

    // Notify when status changed to 'in-progress'
    const channelId = project.channelId
    if (body.status === 'in-progress' && channelId) {
      const message = buildNotificationMessage(project.name, project.assignees)
      await notifyMattermost(channelId, message)
    }

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
