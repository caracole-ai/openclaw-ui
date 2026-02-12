/**
 * Types pour la gestion des projets OpenClaw
 */

export type ProjectType = 'code' | 'writing' | 'hybrid'

export type ProjectStatus = 
  | 'planning'      // En planification
  | 'in-progress'   // En cours
  | 'review'        // En revue
  | 'paused'        // En pause
  | 'completed'     // Terminé
  | 'archived'      // Archivé

export interface ProjectPhase {
  name: string
  status: 'pending' | 'in-progress' | 'completed'
  startedAt?: string
  completedAt?: string
  assignedTo?: string[]  // Agent IDs
  notes?: string
}

export interface ProjectUpdate {
  timestamp: string
  agentId: string
  message: string
  phase?: string
  status?: ProjectStatus
}

export interface Project {
  id: string
  name: string
  description: string
  type: ProjectType
  status: ProjectStatus
  
  // Dates
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  
  // Computed fields (added by API)
  staleHours?: number     // Hours since last update (calculated)
  isStale?: boolean       // true if staleHours > 24
  
  // Nudge tracking
  lastNudgeAt?: string    // Last time project was nudged
  
  // Team
  lead?: string           // Agent ID du lead
  team: string[]          // Agent IDs participants
  
  // Progress
  phases: ProjectPhase[]
  currentPhase?: string
  progress: number        // 0-100
  
  // Updates log
  updates: ProjectUpdate[]
  
  // Metadata
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  repository?: string     // GitHub URL if applicable
  workspace?: string      // Path to project workspace
  
  // Mattermost integration
  channelId?: string      // Mattermost channel ID for notifications
  channelName?: string    // Mattermost channel display name
}

export interface ProjectsData {
  projects: Project[]
  lastUpdated: string | null
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
  timestamp: string
}

export interface ProjectCreateRequest {
  name: string
  description: string
  type: ProjectType
  team?: string[]
  lead?: string
  phases?: { name: string }[]
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface ProjectUpdateRequest {
  status?: ProjectStatus
  progress?: number
  currentPhase?: string
  message?: string        // Update message to log
}
