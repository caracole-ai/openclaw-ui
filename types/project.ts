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
