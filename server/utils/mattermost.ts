/**
 * Mattermost API utility for server-side operations
 * Used by project state transitions (review/rex ceremonies)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MM_URL = process.env.MATTERMOST_URL || 'http://localhost:8065'
const MM_TEAM_ID = process.env.MM_TEAM_ID || 'kwhwcabzet8rmpguc79ttxwrsy'

// Admin credentials for channel management — MUST be set via env vars
const MM_ADMIN_USER = process.env.MM_ADMIN_USER
const MM_ADMIN_PASS = process.env.MM_ADMIN_PASS

if (!MM_ADMIN_USER || !MM_ADMIN_PASS) {
  console.warn('[mm] MM_ADMIN_USER and MM_ADMIN_PASS env vars are required for Mattermost integration')
}

let adminToken: string | null = null

async function getAdminToken(): Promise<string> {
  if (adminToken) return adminToken
  if (!MM_ADMIN_USER || !MM_ADMIN_PASS) {
    throw new Error('[mm] MM_ADMIN_USER and MM_ADMIN_PASS env vars must be set')
  }
  const res = await fetch(`${MM_URL}/api/v4/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: MM_ADMIN_USER, password: MM_ADMIN_PASS }),
  })
  if (!res.ok) throw new Error(`MM login failed: ${res.status}`)
  // MM returns token in response header (lowercase)
  adminToken = res.headers.get('token') || res.headers.get('Token')
  if (!adminToken) {
    // Fallback: try to extract from response body
    const body = await res.json().catch(() => null)
    console.error('[mm] Login response headers:', Object.fromEntries(res.headers.entries()))
    throw new Error('No token in MM login response')
  }
  return adminToken
}

async function mmApi(method: string, path: string, body?: any, botToken?: string): Promise<any> {
  const token = botToken || await getAdminToken()
  const res = await fetch(`${MM_URL}/api/v4${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MM API ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * Create or get existing channel
 */
export async function mmCreateChannel(name: string, displayName: string, purpose: string, type: 'O' | 'P' = 'P'): Promise<{ id: string; name: string; created: boolean }> {
  try {
    const channel = await mmApi('POST', '/channels', {
      team_id: MM_TEAM_ID,
      name,
      display_name: displayName,
      purpose,
      type,
    })
    return { id: channel.id, name: channel.name, created: true }
  } catch (e: any) {
    // Channel might already exist (active or deleted)
    if (e.message.includes('409') || e.message.includes('already exists') || e.message.includes('store.sql_channel.save_channel.exists')) {
      try {
        const existing = await mmApi('GET', `/teams/${MM_TEAM_ID}/channels/name/${name}`)
        return { id: existing.id, name: existing.name, created: false }
      } catch {
        // Channel was deleted (soft delete) — try to restore it or use a unique name
        // Search by name in deleted channels
        try {
          const deleted = await mmApi('GET', `/teams/${MM_TEAM_ID}/channels/deleted?page=0&per_page=100`)
          const match = deleted.find((ch: any) => ch.name === name)
          if (match) {
            // Restore the channel
            await mmApi('POST', `/channels/${match.id}/restore`)
            return { id: match.id, name: match.name, created: false }
          }
        } catch {}
        // Last resort: append timestamp to name
        const uniqueName = `${name}-${Date.now()}`
        const channel = await mmApi('POST', '/channels', {
          team_id: MM_TEAM_ID,
          name: uniqueName,
          display_name: displayName,
          purpose,
          type,
        })
        return { id: channel.id, name: channel.name, created: true }
      }
    }
    throw e
  }
}

/**
 * Add a user to a channel (idempotent)
 */
export async function mmAddToChannel(channelId: string, userId: string): Promise<void> {
  try {
    console.log(`[mm] Adding ${userId} to channel ${channelId}...`)
    const result = await mmApi('POST', `/channels/${channelId}/members`, { user_id: userId })
    console.log(`[mm] Added ${userId} to channel ${channelId} OK`)
  } catch (e: any) {
    // Already a member — ignore
    if (e.message.includes('already') || e.message.includes('exists')) {
      console.log(`[mm] ${userId} already in channel ${channelId}`)
      return
    }
    console.error(`[mm] Failed to add ${userId} to channel ${channelId}:`, e.message)
    // Don't throw — best effort
  }
}

/**
 * Post a message to a channel as a specific bot
 */
export async function mmPostMessage(channelId: string, message: string, botToken: string): Promise<any> {
  try {
    return await mmApi('POST', '/posts', {
      channel_id: channelId,
      message,
    }, botToken)
  } catch (e: any) {
    console.error(`[mm] Failed to post message to ${channelId}:`, e.message)
    // Fallback: post as admin
    return mmApi('POST', '/posts', {
      channel_id: channelId,
      message,
    })
  }
}

/**
 * Post a message as admin
 */
export async function mmPostAsAdmin(channelId: string, message: string): Promise<any> {
  return mmApi('POST', '/posts', {
    channel_id: channelId,
    message,
  })
}

/**
 * Get agent MM info from agents.json
 */
interface AgentMM {
  id: string
  name: string
  emoji: string
  role: string
  mattermost: { username: string; userId: string; token: string }
}

let agentsCache: AgentMM[] | null = null

export function getAgentsMM(): AgentMM[] {
  if (agentsCache) return agentsCache
  try {
    const agentsPath = join(process.env.HOME || '/Users/caracole', '.openclaw/sources/agents.json')
    const data = JSON.parse(readFileSync(agentsPath, 'utf-8'))
    agentsCache = data.agents.map((a: any) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      role: a.role,
      mattermost: a.mattermost,
    }))
    console.log(`[mm] Loaded ${agentsCache!.length} agents: ${agentsCache!.map(a => a.id).join(', ')}`)
    return agentsCache!
  } catch (e: any) {
    console.error(`[mm] Failed to load agents:`, e.message)
    return []
  }
}

export function getAgentMM(agentId: string): AgentMM | undefined {
  return getAgentsMM().find(a => a.id === agentId)
}

// Lio's user ID
export const LIO_USER_ID = 'hziw1gt6a7rpzfgsug17hqf6ea'

/**
 * Setup a ceremony channel (review or rex) for a project
 * Returns the channel ID and posts kick-off message
 */
export async function setupCeremonyChannel(opts: {
  projectId: string
  projectName: string
  ceremony: 'review' | 'rex'
  contributingAgentIds: string[]
}): Promise<{ channelId: string; channelName: string }> {
  const { projectId, projectName, ceremony, contributingAgentIds } = opts

  const prefix = ceremony === 'review' ? '🔍' : '💡'
  const label = ceremony === 'review' ? 'Review' : 'REX'
  const channelName = `${ceremony}-${projectId}`
  const displayName = `${prefix} ${label}: ${projectName}`
  const purpose = `${label} du projet ${projectName}`

  // 1. Create/get channel
  const channel = await mmCreateChannel(channelName, displayName, purpose)

  // 2. Add Lio
  await mmAddToChannel(channel.id, LIO_USER_ID)

  // 3. Add orchestrator
  const orchestrator = getAgentMM('main')
  if (orchestrator) {
    await mmAddToChannel(channel.id, orchestrator.mattermost.userId)
  }

  // 4. Add contributing agents (for visibility — their messages will be posted by orchestrator)
  for (const agentId of contributingAgentIds) {
    const agent = getAgentMM(agentId)
    if (agent) {
      await mmAddToChannel(channel.id, agent.mattermost.userId)
    }
  }

  // Channel setup done — the coordination message is posted by ceremony.post.ts
  return { channelId: channel.id, channelName: channel.name }
}
