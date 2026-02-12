export type ProjectState = 'backlog' | 'planning' | 'build' | 'review' | 'delivery' | 'rex' | 'done'

export interface ProjectGithub {
  repo: string
  created: boolean
}

export interface ProjectTransition {
  from: ProjectState
  to: ProjectState
  timestamp: string
  actor: string
}

export interface Project {
  id: string
  name: string
  team: string
  state: ProjectState
  channel: string
  channelId: string | null
  agents: string[]
  lead: string
  github: ProjectGithub
  transitions: ProjectTransition[]
  createdAt: string
}

export interface ProjectsSource {
  states: ProjectState[]
  projects: Project[]
}

// === Legacy v2 types (used by project detail page) ===

export type ProjectType = 'code' | 'writing' | 'hybrid'

export type ProjectStatus =
  | 'planning'
  | 'in-progress'
  | 'review'
  | 'paused'
  | 'completed'
  | 'archived'

export interface ProjectPhase {
  name: string
  status: 'pending' | 'in-progress' | 'completed'
  startedAt?: string
  completedAt?: string
  assignedTo?: string[]
  notes?: string
}

export interface ProjectUpdate {
  timestamp: string
  agentId: string
  message: string
  phase?: string
  status?: ProjectStatus
}

export interface ProjectDetail {
  id: string
  name: string
  description: string
  type: ProjectType
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  staleHours?: number
  isStale?: boolean
  lastNudgeAt?: string
  lead?: string
  team: string[]
  phases: ProjectPhase[]
  currentPhase?: string
  progress: number
  updates: ProjectUpdate[]
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  repository?: string
  workspace?: string
  channelId?: string
  channelName?: string
  assignees?: string[]
}

export interface ProjectsResponse {
  projects: ProjectDetail[]
  total: number
  timestamp: string
}
