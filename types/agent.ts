// Types v3 basés sur sources/agents.json
export type AgentTeam = 'system' | 'code' | 'writing'
export type AgentStatus = 'active' | 'idle' | 'error' | 'offline'
export type AgentRole = 'orchestrator' | 'architect' | 'developer' | 'config' | string

export interface AgentMattermost {
  username: string
  userId: string | null
  token: string | null
}

export interface AgentWorkspace {
  path: string
  files: Record<string, { hash: string; modified: string }>
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
  projects: string[]
  skills: string[]
  mattermost: AgentMattermost
  workspace: AgentWorkspace
  permissions?: AgentPermissions
  status: AgentStatus
  createdAt: string
}

export interface AgentsSource {
  agents: Agent[]
}

// === Legacy types kept for backward compatibility ===

export type LegacyAgentStatus = 'active' | 'idle' | 'busy' | 'error' | 'offline'

export type LegacyAgentRole =
  | 'orchestrator'
  | 'specialist'
  | 'reviewer'
  | 'executor'
  | 'monitor'
  | 'bridge'

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high' | 'extended'

export interface AgentCapability {
  name: string
  description: string
  enabled: boolean
}

export interface AgentModel {
  provider: string
  name: string
  alias?: string
  thinking?: ThinkingLevel
}

export interface AgentMetrics {
  totalMessages: number
  successRate: number
  avgResponseTime: number
  lastActive?: string
  tokensUsed?: number
  cost?: number
}

export interface AgentConfig {
  autoStart?: boolean
  maxConcurrent?: number
  timeout?: number
  retryAttempts?: number
  customInstructions?: string
}

export interface LegacyAgent {
  id: string
  name: string
  role: LegacyAgentRole
  status: LegacyAgentStatus
  description: string
  model: AgentModel
  capabilities: AgentCapability[]
  metrics: AgentMetrics
  config: AgentConfig
  createdAt: string
  updatedAt: string
  createdBy?: string
  tags?: string[]
  linkedAgents?: string[]
  channelId?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  status: 'draft' | 'active' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface WorkflowStep {
  id: string
  name: string
  agentId: string
  action: string
  dependencies?: string[]
  config?: Record<string, any>
}

export interface Deliberation {
  id: string
  topic: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  orchestratorId: string
  participantIds: string[]
  startedAt?: string
  completedAt?: string
  result?: string
}

export interface ApiError {
  message: string
  code?: string
  statusCode: number
}
