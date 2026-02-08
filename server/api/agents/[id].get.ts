/**
 * Endpoint GET /api/agents/:id
 * Retourne les détails d'un agent avec ses fichiers workspace
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Config Mattermost
const MATTERMOST_URL = process.env.MATTERMOST_URL || 'http://localhost:8065'
const MATTERMOST_TOKEN = process.env.MATTERMOST_TOKEN || 'kezzonhot3bd8cyyzaq5ucskge'

const WORKSPACE_FILES = [
  'MEMORY.md',
  'IDENTITY.md', 
  'HEARTBEAT.md',
  'SOUL.md',
  'USER.md',
  'AGENTS.md',
  'TOOLS.md',
  'BOOTSTRAP.md'
]

// Cache pour les noms de channels (évite les appels répétés)
const channelNameCache = new Map<string, string>()

async function resolveChannelName(channelId: string): Promise<string> {
  // Check cache first
  if (channelNameCache.has(channelId)) {
    return channelNameCache.get(channelId)!
  }

  try {
    const response = await fetch(`${MATTERMOST_URL}/api/v4/channels/${channelId}`, {
      headers: {
        'Authorization': `Bearer ${MATTERMOST_TOKEN}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const name = data.display_name || data.name || channelId
      channelNameCache.set(channelId, name)
      return name
    }
  } catch (e) {
    // Fallback to ID if API call fails
  }
  
  return channelId
}

interface AgentDetail {
  id: string
  name: string
  status: 'online' | 'idle' | 'offline'
  lastHeartbeat: string | null
  lastActivity: string | null
  activeSessions: number
  workspace: string
  totalTokens: number
  model: string | null
  maxPercentUsed: number
  sessions: any[]
  files: Record<string, string>
  channels: { id: string; name: string; displayName: string; type: string; platform: string }[]
}

export default defineEventHandler(async (event): Promise<AgentDetail> => {
  const agentId = getRouterParam(event, 'id')
  
  if (!agentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Agent ID requis'
    })
  }

  try {
    // Récupérer les données de base via openclaw status
    const { stdout } = await execAsync('openclaw status --json')
    const data = JSON.parse(stdout)

    // Trouver l'agent dans la liste des agents configurés
    const agentConfig = (data.agents?.agents ?? []).find((a: any) => a.id === agentId)
    
    if (!agentConfig) {
      throw createError({
        statusCode: 404,
        statusMessage: `Agent '${agentId}' non trouvé`
      })
    }

    // Utiliser le workspaceDir réel de la config
    const workspacePath = agentConfig.workspaceDir

    // Trouver les sessions de cet agent
    const agentSessions = (data.sessions?.recent ?? []).filter(
      (s: any) => s.agentId === agentId
    )

    // Calculer le statut
    const mostRecent = agentSessions.length > 0
      ? agentSessions.reduce((a: any, b: any) => (a.age ?? Infinity) < (b.age ?? Infinity) ? a : b)
      : null

    const ageMs = mostRecent?.age ?? null
    const TWO_MIN = 2 * 60 * 1000
    const FIVE_MIN = 5 * 60 * 1000
    
    let status: 'online' | 'idle' | 'offline' = 'offline'
    if (ageMs !== null) {
      if (ageMs < TWO_MIN && agentSessions.length > 0) status = 'online'
      else if (ageMs < FIVE_MIN) status = 'idle'
    }

    // Lire les fichiers du workspace
    const files: Record<string, string> = {}
    
    if (workspacePath && existsSync(workspacePath)) {
      // Lire les fichiers principaux
      for (const filename of WORKSPACE_FILES) {
        const filePath = path.join(workspacePath, filename)
        if (existsSync(filePath)) {
          try {
            files[filename] = await readFile(filePath, 'utf-8')
          } catch (e) {
            // Ignore read errors
          }
        }
      }
      
      // Aussi lire les fichiers dans memory/
      const memoryDir = path.join(workspacePath, 'memory')
      if (existsSync(memoryDir)) {
        try {
          const memoryFiles = readdirSync(memoryDir).filter(f => f.endsWith('.md'))
          for (const mf of memoryFiles.slice(0, 5)) { // Limiter à 5 fichiers
            const mfPath = path.join(memoryDir, mf)
            files[`memory/${mf}`] = await readFile(mfPath, 'utf-8')
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    // Extraire les channels des sessions et résoudre les noms
    const channelMap = new Map<string, { id: string; channelId: string; type: string; platform: string }>()
    
    for (const s of agentSessions) {
      const key = s.key ?? ''
      const parts = key.split(':')
      const channelId = parts[4]
      const platform = parts[2] || 'unknown'
      
      if (channelId && !channelMap.has(channelId)) {
        channelMap.set(channelId, {
          id: s.sessionId,
          channelId,
          type: parts[3] || 'unknown',
          platform
        })
      }
    }

    // Résoudre les noms de channels en parallèle
    const channels = await Promise.all(
      Array.from(channelMap.values()).map(async (c) => {
        let displayName = c.channelId
        
        // Résoudre le nom pour Mattermost
        if (c.platform === 'mattermost' && c.channelId) {
          displayName = await resolveChannelName(c.channelId)
        }
        
        return {
          id: c.id,
          name: c.channelId,
          displayName,
          type: c.type,
          platform: c.platform
        }
      })
    )

    // Agréger les tokens
    const totalTokens = agentSessions.reduce((sum: number, s: any) => sum + (s.totalTokens ?? 0), 0)
    const maxPercentUsed = agentSessions.length > 0
      ? Math.max(...agentSessions.map((s: any) => s.percentUsed ?? 0))
      : 0

    // Sessions formatées
    const sessions = agentSessions.map((s: any) => ({
      sessionId: s.sessionId,
      context: s.key?.split(':').slice(-1)[0] || s.key,
      totalTokens: s.totalTokens ?? 0,
      percentUsed: s.percentUsed ?? 0,
      model: s.model ?? 'unknown',
      ageMs: s.age ?? 0
    }))

    return {
      id: agentId,
      name: agentConfig.name || agentId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      status,
      lastHeartbeat: mostRecent?.updatedAt ? new Date(mostRecent.updatedAt).toISOString() : null,
      lastActivity: mostRecent?.updatedAt ? new Date(mostRecent.updatedAt).toISOString() : null,
      activeSessions: agentSessions.length,
      workspace: workspacePath || 'Non configuré',
      totalTokens,
      model: mostRecent?.model ?? null,
      maxPercentUsed,
      sessions,
      files,
      channels
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error(`[/api/agents/${agentId}] Error:`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des détails',
      data: { error: error.message }
    })
  }
})
