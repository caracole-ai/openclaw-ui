/**
 * GET /api/projects/:id/activity - Get project activity with token tracking
 * 
 * Returns:
 * - Active sessions for agents working on this project
 * - Token usage aggregated by agent
 * - Recent activity from project updates
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'

interface SessionData {
  agentId: string
  key: string
  kind: string
  sessionId: string
  updatedAt: number
  age: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  remainingTokens: number
  percentUsed: number
  model: string
  contextTokens: number
}

interface TokenUsage {
  agentId: string
  totalTokens: number
  inputTokens: number
  outputTokens: number
  remainingTokens: number
  percentUsed: number
  model: string
  sessionCount: number
  lastActiveMs: number
}

interface ProjectActivity {
  projectId: string
  projectName: string
  assignees: string[]
  tokens: {
    total: number
    byAgent: TokenUsage[]
    burnRate: number // tokens per hour (last hour estimate)
  }
  activeSessions: {
    agentId: string
    sessionId: string
    channel: string
    lastActiveAgo: string
    tokens: number
    percentUsed: number
  }[]
  recentUpdates: {
    timestamp: string
    agentId: string
    message: string
    type?: string
  }[]
  timestamp: string
}

function formatAgo(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`
  return `${Math.floor(ms / 86400000)}d`
}

function parseChannelFromKey(key: string): string {
  // key format: "agent:agentId:provider:channel:channelId"
  const parts = key.split(':')
  if (parts.length >= 5) {
    const provider = parts[2]
    const channelId = parts[4]
    return `${provider}:${channelId.substring(0, 8)}...`
  }
  return 'unknown'
}

export default defineEventHandler(async (event): Promise<ProjectActivity> => {
  const projectId = getRouterParam(event, 'id')
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID required'
    })
  }

  try {
    // Load project
    if (!existsSync(PROJECTS_FILE)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Projects file not found'
      })
    }

    const projectsData = JSON.parse(await readFile(PROJECTS_FILE, 'utf-8'))
    const project = projectsData.projects.find((p: any) => p.id === projectId)

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: `Project ${projectId} not found`
      })
    }

    // Get OpenClaw status for session data
    let sessions: SessionData[] = []
    try {
      const { stdout } = await execAsync('openclaw status --json')
      const statusData = JSON.parse(stdout)
      sessions = statusData.sessions?.recent ?? []
    } catch (e) {
      console.warn('[activity] Could not get openclaw status:', e)
    }

    // Get assignees (include owner if not in assignees)
    const assignees = [...new Set([
      project.owner,
      ...(project.assignees || [])
    ])].filter(Boolean)

    // Filter sessions for agents working on this project
    const relevantSessions = sessions.filter(s => assignees.includes(s.agentId))

    // Aggregate tokens by agent
    const tokensByAgent = new Map<string, TokenUsage>()
    
    for (const session of relevantSessions) {
      const existing = tokensByAgent.get(session.agentId)
      if (existing) {
        existing.totalTokens += session.totalTokens
        existing.inputTokens += session.inputTokens
        existing.outputTokens += session.outputTokens
        existing.sessionCount++
        existing.lastActiveMs = Math.min(existing.lastActiveMs, session.age)
        // Use most recent session's remaining/percent
        if (session.age < existing.lastActiveMs) {
          existing.remainingTokens = session.remainingTokens
          existing.percentUsed = session.percentUsed
          existing.model = session.model
        }
      } else {
        tokensByAgent.set(session.agentId, {
          agentId: session.agentId,
          totalTokens: session.totalTokens,
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
          remainingTokens: session.remainingTokens,
          percentUsed: session.percentUsed,
          model: session.model,
          sessionCount: 1,
          lastActiveMs: session.age
        })
      }
    }

    const byAgent = Array.from(tokensByAgent.values())
      .sort((a, b) => a.lastActiveMs - b.lastActiveMs)

    const totalTokens = byAgent.reduce((sum, a) => sum + a.totalTokens, 0)

    // Estimate burn rate (very rough - based on project age)
    const projectAgeHours = (Date.now() - new Date(project.createdAt).getTime()) / 3600000
    const burnRate = projectAgeHours > 0 ? Math.round(totalTokens / projectAgeHours) : 0

    // Format active sessions
    const activeSessions = relevantSessions
      .filter(s => s.age < 300000) // Active in last 5 minutes
      .map(s => ({
        agentId: s.agentId,
        sessionId: s.sessionId,
        channel: parseChannelFromKey(s.key),
        lastActiveAgo: formatAgo(s.age),
        tokens: s.totalTokens,
        percentUsed: s.percentUsed
      }))

    // Get recent updates (last 10)
    const recentUpdates = (project.updates || [])
      .slice(-10)
      .reverse()
      .map((u: any) => ({
        timestamp: u.timestamp,
        agentId: u.agentId,
        message: u.message,
        type: u.type || (u.status ? 'status' : u.progress !== undefined ? 'progress' : 'note')
      }))

    return {
      projectId: project.id,
      projectName: project.name,
      assignees,
      tokens: {
        total: totalTokens,
        byAgent,
        burnRate
      },
      activeSessions,
      recentUpdates,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[/api/projects/:id/activity] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get project activity',
      data: { error: error.message }
    })
  }
})
