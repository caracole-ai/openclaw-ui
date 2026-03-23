export type ProjectState = 'backlog' | 'planning' | 'build' | 'review' | 'delivery' | 'rex' | 'done'
export type ProjectType = 'code' | 'writing' | 'hybrid'
export type DocumentStatus = 'pending' | 'in_progress' | 'completed' | 'building' | 'built' | 'build_failed' | 'validating' | 'validated' | 'build_unstable' | 'reviewing' | 'reviewed' | 'review_failed' | 'reviewed_with_caveats'

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
  // IDEAS to DASHBOARD workflow
  idea_channel_id?: string | null
  document_status?: DocumentStatus
  // Pipeline operational fields
  documentStatus?: string
  reviewRound?: number
  buildAttempt?: number
}
