export interface SkillManifest {
  dependencies: { cli: string[]; env: string[] }
  permissions: string[]
}

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  source: string
  path: string
  manifest: SkillManifest | null
  installedAt: string
  installedBy: string
  status: 'active' | 'pending' | 'disabled'
}

export interface SkillsSource {
  installed: Skill[]
  assignments: Record<string, string[]>
  timestamp?: string
}

export interface SkillVerification {
  skillId: string
  agentId: string
  verified: boolean
  checks: {
    inAssignments: boolean
    symlinkExists: boolean
    frontmatterInjected: boolean
    dependenciesMet: boolean
  }
  timestamp: string
}
