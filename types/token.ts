export interface TokenEvent {
  id: string
  timestamp: string
  agentId: string
  projectId?: string
  skillId?: string
  sessionId?: string
  model: string
  tokens: { input: number; output: number; total: number }
  cost: { input: number; output: number; total: number }
}

export interface TokenSummary {
  totalTokens: number
  totalSessions: number
  totalCost: number
  totalEvents: number
  todayAggregate: { totalTokens: number; totalCost: number; events: number } | null
  topAgents: Array<{ agentId: string; tokens: number; sessions: number; cost: number }>
  topProjects: Array<{ projectId: string; tokens: number; cost: number }>
  timestamp: string
}

export interface TimelinePoint {
  period: string
  tokens: number
  cost: number
  count: number
}
