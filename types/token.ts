export interface TokenUsage {
  input: number
  output: number
  total: number
}

export interface TokenCost {
  input: number
  output: number
  total: number
}

export interface TokenEvent {
  id: string
  timestamp: string
  agentId: string
  projectId?: string
  skillId?: string
  sessionId?: string
  model: string
  tokens: TokenUsage
  cost: TokenCost
  context?: {
    action: string
    trigger: string
  }
}

export interface TokenAggregate {
  totalTokens: number
  totalCost: number
  byAgent: Record<string, { tokens: number; cost: number }>
  byProject: Record<string, { tokens: number; cost: number }>
  bySkill: Record<string, { tokens: number; cost: number }>
}

export interface TokensSource {
  tracking: {
    enabled: boolean
    granularity: string[]
    retentionDays: number
  }
  usage: TokenEvent[]
  aggregates: {
    daily: Record<string, TokenAggregate>
    weekly: Record<string, TokenAggregate>
    monthly: Record<string, TokenAggregate>
  }
}
