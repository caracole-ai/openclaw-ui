/**
 * GET /api/agents/:id/live
 * Live session data from OpenClaw gateway session stores
 * Source of truth: ~/.openclaw/agents/<agentId>/sessions/sessions.json
 */
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const OPENCLAW_DIR = join(process.env.HOME || '', '.openclaw')

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID requis' })
  }

  const sessionsFile = join(OPENCLAW_DIR, 'agents', agentId, 'sessions', 'sessions.json')

  if (!existsSync(sessionsFile)) {
    return { sessions: [], totalTokens: 0, activeSessions: 0, maxPercentUsed: 0, lastActivity: null }
  }

  try {
    const raw = await readFile(sessionsFile, 'utf-8')
    const sessionsMap = JSON.parse(raw)

    // Model context window sizes
    const CTX_SIZES: Record<string, number> = {
      'claude-opus-4-6': 200000,
      'claude-sonnet-4-20250514': 200000,
      'claude-haiku-3-5-20241022': 200000,
    }
    const DEFAULT_CTX = 200000

    const sessions = Object.entries(sessionsMap).map(([key, val]: [string, any]) => {
      const totalTokens = val.totalTokens || 0
      const contextTokens = val.contextTokens || totalTokens
      const maxCtx = CTX_SIZES[val.model] || DEFAULT_CTX
      const percentUsed = maxCtx > 0 ? Math.round((contextTokens / maxCtx) * 100) : 0

      return {
        sessionKey: key,
        model: val.model || null,
        totalTokens,
        inputTokens: val.inputTokens || 0,
        outputTokens: val.outputTokens || 0,
        contextTokens,
        percentUsed,
        lastActivity: val.updatedAt || null,
      }
    })

    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
    const activeSessions = sessions.filter(s => s.totalTokens > 0).length
    const maxPercentUsed = sessions.reduce((max, s) => Math.max(max, s.percentUsed), 0)

    // Find most recent activity
    const lastActivity = sessions
      .filter(s => s.lastActivity)
      .sort((a, b) => new Date(b.lastActivity!).getTime() - new Date(a.lastActivity!).getTime())[0]?.lastActivity || null

    return { sessions, totalTokens, activeSessions, maxPercentUsed, lastActivity }
  } catch (error: any) {
    console.error(`[/api/agents/${agentId}/live] Error:`, error.message)
    return { sessions: [], totalTokens: 0, activeSessions: 0, maxPercentUsed: 0, lastActivity: null }
  }
})
