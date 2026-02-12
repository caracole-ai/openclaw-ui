/**
 * Endpoint /api/agents/status — Dashboard enrichi
 * Expose statut, tokens, contexte, modèle, équipe, projets pour chaque agent
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { AgentsStatusResponse, AgentStatus, AgentStatusType, AgentTeam, SessionInfo } from '~/types/agents'

const execAsync = promisify(exec)
const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'

interface ProjectInfo {
  id: string
  name: string
  role?: string
  status?: string
}

// Cache pour les projets (refresh toutes les 30s)
let projectsCache: { projects: any[], timestamp: number } | null = null
const PROJECTS_CACHE_TTL = 30000

async function getProjects(): Promise<any[]> {
  const now = Date.now()
  if (projectsCache && (now - projectsCache.timestamp) < PROJECTS_CACHE_TTL) {
    return projectsCache.projects
  }

  try {
    if (!existsSync(PROJECTS_FILE)) return []
    const data = await readFile(PROJECTS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    projectsCache = { projects: parsed.projects || [], timestamp: now }
    return projectsCache.projects
  } catch (e) {
    return []
  }
}

function getAgentProjects(agentId: string, projects: any[]): ProjectInfo[] {
  return projects
    .filter(p => {
      const inTeam = p.team?.some((t: any) => t.agent === agentId)
      const inAssignees = p.assignees?.includes(agentId)
      const isOwner = p.owner === agentId
      return inTeam || inAssignees || isOwner
    })
    .map(p => {
      const teamMember = p.team?.find((t: any) => t.agent === agentId)
      return {
        id: p.id,
        name: p.name,
        role: teamMember?.role || (p.owner === agentId ? 'owner' : 'assigné'),
        status: p.status
      }
    })
}

// Map channelId to project
function getProjectByChannelId(channelId: string, projects: any[]): ProjectInfo | null {
  const project = projects.find(p => p.channelId === channelId)
  if (!project) return null
  return {
    id: project.id,
    name: project.name,
    status: project.status
  }
}

// Extract channelId from session key
function extractChannelId(key: string): string | null {
  // key format: "agent:xxx:mattermost:channel:yyy"
  const parts = key.split(':')
  if (parts.length >= 5 && parts[2] === 'mattermost' && parts[3] === 'channel') {
    return parts[4]
  }
  return null
}

// Config Mattermost
const MATTERMOST_URL = process.env.MATTERMOST_URL || 'http://localhost:8065'
const MATTERMOST_TOKEN = process.env.MATTERMOST_TOKEN || 'kezzonhot3bd8cyyzaq5ucskge'

const TWO_MIN_MS = 2 * 60 * 1000
const FIVE_MIN_MS = 5 * 60 * 1000

// Cache pour les noms de channels (évite les appels répétés)
const channelNameCache = new Map<string, string>()

async function resolveChannelName(channelId: string): Promise<string> {
  if (!channelId) return 'unknown'
  
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
  
  // Cache le fallback aussi pour éviter les appels répétés
  channelNameCache.set(channelId, channelId)
  return channelId
}

function deriveStatus(ageMs: number | null, activeSessions: number): AgentStatusType {
  if (ageMs === null) return 'offline'
  if (ageMs < TWO_MIN_MS && activeSessions > 0) return 'online'
  if (ageMs < FIVE_MIN_MS) return 'idle'
  return 'offline'
}

/**
 * Extrait l'équipe depuis le workspace path
 * Pattern: workspace-{team}-{name}
 * Ex: /Users/xxx/.openclaw/workspace-code-winston → "code"
 */
function deriveTeamFromWorkspace(workspacePath: string): AgentTeam {
  if (!workspacePath) return 'unknown'
  
  // Extraire le nom du dossier workspace
  const match = workspacePath.match(/workspace-(\w+)-/)
  if (match) {
    const team = match[1].toLowerCase()
    if (team === 'code' || team === 'writing' || team === 'free') {
      return team
    }
  }
  
  return 'unknown'
}

async function parseContext(key: string): Promise<string> {
  // key format: "agent:xxx:mattermost:channel:yyy" ou "agent:xxx:telegram:dm:zzz"
  const parts = key.split(':')
  if (parts.length >= 5) {
    const platform = parts[2] // mattermost, telegram, etc.
    const type = parts[3] // channel, dm, group
    const id = parts[4] || ''
    
    if (platform === 'mattermost' && type === 'channel' && id) {
      const channelName = await resolveChannelName(id)
      return channelName
    }
    
    if (type === 'dm') return 'DM'
    if (type === 'group') return 'Group'
    return `${platform}:${type}`
  }
  return key.slice(0, 20)
}

export default defineEventHandler(async (): Promise<AgentsStatusResponse> => {
  try {
    const { stdout } = await execAsync('openclaw status --json')
    const data = JSON.parse(stdout)

    // Load projects for enrichment
    const projects = await getProjects()

    // Grouper les sessions par agent
    const sessionsByAgent = new Map<string, any[]>()
    for (const session of (data.sessions?.recent ?? [])) {
      const agentId = session.agentId
      if (!sessionsByAgent.has(agentId)) {
        sessionsByAgent.set(agentId, [])
      }
      sessionsByAgent.get(agentId)!.push(session)
    }

    // Utiliser la liste des agents configurés depuis data.agents.agents
    const configuredAgents = data.agents?.agents ?? []

    // Construire la liste des agents avec leurs sessions
    const agents: AgentStatus[] = []
    
    for (const agentConfig of configuredAgents) {
      const agentId = agentConfig.id
      const agentSessions = sessionsByAgent.get(agentId) ?? []
      
      // Trouver la session la plus récente
      const mostRecent = agentSessions.length > 0
        ? agentSessions.reduce((a, b) => (a.age ?? Infinity) < (b.age ?? Infinity) ? a : b)
        : null

      const ageMs = mostRecent?.age ?? null
      const activeSessions = agentSessions.length
      const status = deriveStatus(ageMs, activeSessions)

      // Agréger les tokens
      const totalTokens = agentSessions.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0)
      const maxPercentUsed = agentSessions.length > 0
        ? Math.max(...agentSessions.map(s => s.percentUsed ?? 0))
        : 0

      // Dériver l'équipe du workspace path
      const workspacePath = agentConfig.workspaceDir || ''
      const team = deriveTeamFromWorkspace(workspacePath)

      // Sessions détaillées avec résolution des noms et projets
      const sessions: SessionInfo[] = await Promise.all(
        agentSessions.map(async (s) => {
          const channelId = extractChannelId(s.key ?? '')
          const project = channelId ? getProjectByChannelId(channelId, projects) : null
          
          return {
            sessionId: s.sessionId,
            key: s.key ?? '',
            context: await parseContext(s.key ?? ''),
            totalTokens: s.totalTokens ?? 0,
            percentUsed: s.percentUsed ?? 0,
            model: s.model ?? 'unknown',
            ageMs: s.age ?? 0,
            project: project || undefined
          }
        })
      )

      // Get projects for this agent
      const agentProjects = getAgentProjects(agentId, projects)

      agents.push({
        id: agentId,
        name: agentConfig.name || agentId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        team,
        status,
        lastHeartbeat: mostRecent?.updatedAt 
          ? new Date(mostRecent.updatedAt).toISOString() 
          : null,
        lastActivity: mostRecent?.updatedAt 
          ? new Date(mostRecent.updatedAt).toISOString() 
          : null,
        activeSessions,
        workspace: workspacePath || `workspace-${agentId}`,
        totalTokens,
        model: mostRecent?.model ?? null,
        maxPercentUsed,
        sessions,
        projects: agentProjects
      })
    }

    // Trier : online first, puis idle, puis offline
    const statusOrder = { online: 0, idle: 1, offline: 2 }
    agents.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

    return {
      agents,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    console.error('[/api/agents/status] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossible de récupérer le statut des agents',
      data: { error: error.message }
    })
  }
})
