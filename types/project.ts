export type ProjectState = 'backlog' | 'planning' | 'build' | 'review' | 'delivery' | 'rex' | 'done'
export type ProjectStatus = 'backlog' | 'planning' | 'in-progress' | 'review' | 'paused' | 'completed' | 'archived'
export type ProjectType = 'code' | 'writing' | 'hybrid'

export interface ProjectPhase {
  name: string
  status: 'pending' | 'in-progress' | 'completed'
  startedAt?: string
  completedAt?: string
}

export interface ProjectUpdate {
  timestamp: string
  agentId: string
  message: string
  type?: string
}

export interface ProjectTeamMember {
  agent: string
  role: string | null
}

export interface Project {
  id: string
  name: string
  description?: string
  type?: ProjectType
  status: ProjectStatus
  state: ProjectState
  progress: number
  lead?: string
  channel?: string
  channelId?: string | null
  workspace?: string
  github?: { repo: string | null; created: boolean }
  currentPhase?: string
  lastNudgeAt?: string
  createdAt: string
  updatedAt: string
  team: ProjectTeamMember[]
  agents: string[]
  assignees: string[]
  phases: ProjectPhase[]
  updates: ProjectUpdate[]
}
