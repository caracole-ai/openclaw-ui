/**
 * GET /api/kanban - List projects from active directory (Thomas-compatible)
 * Reads individual status.json files from ~/.openclaw/projects/active/
 */

import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const ACTIVE_DIR = process.env.HOME + '/.openclaw/projects/active'

export interface KanbanProject {
  id: string
  name: string
  status: 'planning' | 'in_progress' | 'paused' | 'completed' | 'archived'
  pauseReason: 'quota' | 'manual' | 'error' | null
  pausedAt: string | null
  resumeMessage: string | null
  assignedAgent: string | null
  updatedAt: string
  createdAt: string
}

export interface KanbanResponse {
  projects: KanbanProject[]
  byStatus: Record<string, KanbanProject[]>
  timestamp: string
}

export default defineEventHandler(async (): Promise<KanbanResponse> => {
  const projects: KanbanProject[] = []

  try {
    if (!existsSync(ACTIVE_DIR)) {
      return {
        projects: [],
        byStatus: {},
        timestamp: new Date().toISOString()
      }
    }

    const dirs = await readdir(ACTIVE_DIR, { withFileTypes: true })

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue

      const statusPath = join(ACTIVE_DIR, dir.name, 'status.json')
      
      if (!existsSync(statusPath)) continue

      try {
        const content = await readFile(statusPath, 'utf-8')
        const status = JSON.parse(content)
        
        projects.push({
          id: status.id || dir.name,
          name: status.name || dir.name,
          status: status.status || 'planning',
          pauseReason: status.pauseReason || null,
          pausedAt: status.pausedAt || null,
          resumeMessage: status.resumeMessage || null,
          assignedAgent: status.assignedAgent || null,
          updatedAt: status.updatedAt || new Date().toISOString(),
          createdAt: status.createdAt || new Date().toISOString()
        })
      } catch (e) {
        console.error(`[Kanban] Failed to read ${statusPath}:`, e)
      }
    }

    // Group by status
    const byStatus: Record<string, KanbanProject[]> = {}
    for (const p of projects) {
      if (!byStatus[p.status]) byStatus[p.status] = []
      byStatus[p.status].push(p)
    }

    return {
      projects,
      byStatus,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    console.error('[GET /api/kanban] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load kanban',
      data: { error: error.message }
    })
  }
})
