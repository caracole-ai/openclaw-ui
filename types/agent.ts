export type AgentTeam = 'system' | 'code' | 'writing' | 'creative' | 'ops' | string
export type AgentStatus = 'active' | 'idle' | 'error' | 'offline'
export type AgentRole = 'orchestrator' | 'architect' | 'developer' | 'config' | string

export interface AgentMattermost {
  username: string
  userId: string | null
}

export interface AgentPermissions {
  canAssignSkills?: boolean
  canDownloadSkills?: boolean
  canCreateAgents?: boolean
  canManageProjects?: boolean
  requiresHumanApproval?: string[]
}

export interface Agent {
  id: string
  name: string
  emoji: string
  team: AgentTeam
  role: AgentRole
  model: string
  skills: string[]
  mattermost: AgentMattermost
  workspace: string
  permissions?: AgentPermissions | null
  status: AgentStatus
  createdAt: string
  // Live data (merged from session stores)
  totalTokens?: number
  activeSessions?: number
  maxPercentUsed?: number
  lastActivity?: string | null
}

export interface AgentDetail extends Agent {
  projects: Array<{
    id: string
    name: string
    status: string
    progress: number
    type?: string
    agent_role?: string
  }>
  sessions: Array<{
    sessionKey: string
    model: string | null
    totalTokens: number
    inputTokens: number
    outputTokens: number
    contextWindow: number
    percentUsed: number
    lastActivity: string | null
  }>
  files: Record<string, string>
}
