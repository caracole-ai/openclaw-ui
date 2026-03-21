export interface McpConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface Mcp {
  id: string
  name: string
  description: string
  version: string
  source: string
  path: string
  config: McpConfig | null
  installedAt: string
  installedBy: string
  status: 'active' | 'pending' | 'disabled'
}

export interface McpsSource {
  installed: Mcp[]
  assignments: Record<string, string[]>
  timestamp?: string
}
