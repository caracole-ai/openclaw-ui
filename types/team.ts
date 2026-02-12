export interface Team {
  name: string
  channel: string
  description?: string
  template?: string
  defaultSkills: string[]
  rules?: string[]
}

export interface TeamsSource {
  teams: Record<string, Team>
}
