/**
 * PATCH /api/kanban/:id - Update project status (manual edit from Kanban UI)
 * Writes to ~/.openclaw/projects/active/<id>/status.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

const ACTIVE_DIR = process.env.HOME + '/.openclaw/projects/active'

interface PatchBody {
  status?: 'planning' | 'in_progress' | 'paused' | 'completed' | 'archived'
  pauseReason?: 'quota' | 'manual' | 'error' | null
  resumeMessage?: string | null
  assignedAgent?: string | null
  name?: string
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<PatchBody>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID required'
    })
  }

  const projectDir = join(ACTIVE_DIR, id)
  const statusPath = join(projectDir, 'status.json')

  try {
    // Create directory if needed
    if (!existsSync(projectDir)) {
      await mkdir(projectDir, { recursive: true })
    }

    // Read existing or create new
    let status: Record<string, any> = {
      id,
      name: id,
      status: 'planning',
      pauseReason: null,
      pausedAt: null,
      resumeMessage: null,
      assignedAgent: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (existsSync(statusPath)) {
      const content = await readFile(statusPath, 'utf-8')
      status = JSON.parse(content)
    }

    // Apply updates
    if (body.status !== undefined) {
      status.status = body.status
      
      // Track pause time
      if (body.status === 'paused') {
        status.pausedAt = new Date().toISOString()
      } else if (status.status !== 'paused') {
        status.pausedAt = null
        status.pauseReason = null
        status.resumeMessage = null
      }
    }
    
    if (body.pauseReason !== undefined) status.pauseReason = body.pauseReason
    if (body.resumeMessage !== undefined) status.resumeMessage = body.resumeMessage
    if (body.assignedAgent !== undefined) status.assignedAgent = body.assignedAgent
    if (body.name !== undefined) status.name = body.name

    status.updatedAt = new Date().toISOString()

    // Write back
    await writeFile(statusPath, JSON.stringify(status, null, 2))

    return {
      success: true,
      project: status
    }
  } catch (error: any) {
    console.error(`[PATCH /api/kanban/${id}] Error:`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update project',
      data: { error: error.message }
    })
  }
})
