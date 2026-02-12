export interface SkillManifest {
  dependencies: {
    cli: string[]
    env: string[]
  }
  permissions: string[]
}

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  source: string
  path: string
  manifest: SkillManifest
  installedAt: string
  installedBy: string
  status: 'active' | 'pending' | 'disabled'
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

export interface SkillsSource {
  registry: {
    official: string
    trusted: string[]
  }
  installed: Skill[]
  pending: Skill[]
  assignments: Record<string, string[]>
}
