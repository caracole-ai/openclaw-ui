/**
 * Fixtures de test pour le Dashboard Agents (v2 - enrichi)
 * Couvre tous les cas de statut + tokens + contexte
 */

// Legacy v2 types inlined for test fixtures
interface TokenUsage {
  input: number
  output: number
  total: number
  remaining: number
  percentUsed: number
  contextSize: number
}

interface ActiveSession {
  sessionId: string
  key: string
  kind: string
  context: string
  updatedAt: number
  ageMs: number
  tokens: TokenUsage
  model: string
}

interface AgentStatus {
  id: string
  name: string
  status: 'online' | 'idle' | 'offline'
  lastHeartbeat: string | null
  lastActivity: string | null
  lastActivityAgeMs: number | null
  activeSessions: number
  workspace: string
  model: string
  tokens: TokenUsage
  sessions: ActiveSession[]
  currentContext: string | null
  quotaWarning: boolean
}

interface AgentsStatusResponse {
  agents: AgentStatus[]
  timestamp: string
  totals: { online: number; idle: number; offline: number; totalTokens: number }
}

// Helpers pour générer des timestamps relatifs
const now = () => new Date().toISOString()
const minutesAgo = (min: number) => new Date(Date.now() - min * 60 * 1000).toISOString()
const msAgo = (min: number) => min * 60 * 1000

// === Token fixtures ===

const healthyTokens: TokenUsage = {
  input: 1500,
  output: 3200,
  total: 45000,
  remaining: 155000,
  percentUsed: 22,
  contextSize: 200000
}

const warningTokens: TokenUsage = {
  input: 8000,
  output: 12000,
  total: 170000,
  remaining: 30000,
  percentUsed: 85,
  contextSize: 200000
}

const criticalTokens: TokenUsage = {
  input: 9500,
  output: 15000,
  total: 195000,
  remaining: 5000,
  percentUsed: 97,
  contextSize: 200000
}

const emptyTokens: TokenUsage = {
  input: 0,
  output: 0,
  total: 0,
  remaining: 200000,
  percentUsed: 0,
  contextSize: 200000
}

// === Session fixtures ===

const activeSession: ActiveSession = {
  sessionId: '43092fff-661a-4453-90f4-852ff122ab0a',
  key: 'agent:orchestrator:mattermost:channel:szei4nsiz788pnaj8fipoptqhw',
  kind: 'group',
  context: '🧠 Délibération: Dashboard Agents',
  updatedAt: Date.now() - 5000,
  ageMs: 5000,
  tokens: healthyTokens,
  model: 'claude-opus-4-5'
}

const idleSession: ActiveSession = {
  sessionId: '2dc8babd-2b09-4f2f-86a5-f3bfb3980d0e',
  key: 'agent:taylor-qa:mattermost:channel:szei4nsiz788pnaj8fipoptqhw',
  kind: 'group',
  context: '🧠 Délibération: Dashboard Agents',
  updatedAt: Date.now() - 180000,
  ageMs: 180000,
  tokens: healthyTokens,
  model: 'claude-opus-4-5'
}

// === Agent fixtures ===

/**
 * Agent online - actif, tokens sains
 */
export const onlineAgent: AgentStatus = {
  id: 'orchestrator',
  name: 'Orchestrator',
  status: 'online',
  lastHeartbeat: minutesAgo(0.5),
  lastActivity: minutesAgo(0.1),
  lastActivityAgeMs: msAgo(0.1),
  activeSessions: 1,
  workspace: 'workspace-code-orchestrator',
  model: 'claude-opus-4-5',
  tokens: healthyTokens,
  sessions: [activeSession],
  currentContext: '🧠 Délibération: Dashboard Agents',
  quotaWarning: false
}

/**
 * Agent online avec warning quota (> 80%)
 */
export const onlineAgentQuotaWarning: AgentStatus = {
  id: 'winston-architecte',
  name: 'Winston',
  status: 'online',
  lastHeartbeat: minutesAgo(1),
  lastActivity: minutesAgo(0.5),
  lastActivityAgeMs: msAgo(0.5),
  activeSessions: 2,
  workspace: 'workspace-code-winston',
  model: 'claude-opus-4-5',
  tokens: warningTokens,
  sessions: [activeSession, { ...idleSession, sessionId: 'other-session' }],
  currentContext: 'Endpoint /api/agents/status',
  quotaWarning: true
}

/**
 * Agent idle - pas d'activité récente
 */
export const idleAgent: AgentStatus = {
  id: 'amelia-dev',
  name: 'Amelia',
  status: 'idle',
  lastHeartbeat: minutesAgo(3),
  lastActivity: minutesAgo(5),
  lastActivityAgeMs: msAgo(5),
  activeSessions: 1,
  workspace: 'workspace-code-amelia',
  model: 'claude-sonnet-4-5',
  tokens: healthyTokens,
  sessions: [idleSession],
  currentContext: 'Composants Vue3',
  quotaWarning: false
}

/**
 * Agent offline - heartbeat ancien
 */
export const offlineAgentStale: AgentStatus = {
  id: 'john-pm',
  name: 'John',
  status: 'offline',
  lastHeartbeat: minutesAgo(30),
  lastActivity: minutesAgo(45),
  lastActivityAgeMs: msAgo(45),
  activeSessions: 0,
  workspace: 'workspace-code-john',
  model: 'claude-opus-4-5',
  tokens: emptyTokens,
  sessions: [],
  currentContext: null,
  quotaWarning: false
}

/**
 * Agent offline - jamais vu
 */
export const offlineAgentNeverSeen: AgentStatus = {
  id: 'ghost-agent',
  name: 'Ghost',
  status: 'offline',
  lastHeartbeat: null,
  lastActivity: null,
  lastActivityAgeMs: null,
  activeSessions: 0,
  workspace: 'workspace-ghost',
  model: 'claude-opus-4-5',
  tokens: emptyTokens,
  sessions: [],
  currentContext: null,
  quotaWarning: false
}

/**
 * Agent avec quota critique (> 95%)
 */
export const agentQuotaCritical: AgentStatus = {
  id: 'taylor-qa',
  name: 'Taylor',
  status: 'online',
  lastHeartbeat: minutesAgo(0.5),
  lastActivity: minutesAgo(0.2),
  lastActivityAgeMs: msAgo(0.2),
  activeSessions: 1,
  workspace: 'workspace-code-taylor',
  model: 'claude-opus-4-5',
  tokens: criticalTokens,
  sessions: [activeSession],
  currentContext: 'Tests Dashboard',
  quotaWarning: true
}

// === Response fixtures ===

/**
 * Réponse complète avec tous les types d'agents
 */
export const mockAgentsResponse: AgentsStatusResponse = {
  agents: [
    onlineAgent,
    onlineAgentQuotaWarning,
    idleAgent,
    offlineAgentStale,
    offlineAgentNeverSeen,
    agentQuotaCritical
  ],
  timestamp: now(),
  totals: {
    online: 3,
    idle: 1,
    offline: 2,
    totalTokens: 410000
  }
}

/**
 * Réponse vide
 */
export const emptyAgentsResponse: AgentsStatusResponse = {
  agents: [],
  timestamp: now(),
  totals: { online: 0, idle: 0, offline: 0, totalTokens: 0 }
}

/**
 * Tous les agents en alerte quota
 */
export const allQuotaWarningResponse: AgentsStatusResponse = {
  agents: [
    { ...onlineAgent, tokens: warningTokens, quotaWarning: true },
    { ...idleAgent, tokens: criticalTokens, quotaWarning: true }
  ],
  timestamp: now(),
  totals: { online: 1, idle: 1, offline: 0, totalTokens: 365000 }
}

// === Test cases ===

/**
 * Cas de test pour les alertes quota
 */
export const quotaTestCases = [
  { percentUsed: 0, expectWarning: false, label: 'Empty context' },
  { percentUsed: 50, expectWarning: false, label: 'Half used' },
  { percentUsed: 79, expectWarning: false, label: 'Just under threshold' },
  { percentUsed: 80, expectWarning: true, label: 'At threshold' },
  { percentUsed: 85, expectWarning: true, label: 'Warning zone' },
  { percentUsed: 95, expectWarning: true, label: 'Critical zone' },
  { percentUsed: 100, expectWarning: true, label: 'Maxed out' }
]

/**
 * Cas de test pour le formatage de l'âge
 */
export const ageFormatTestCases = [
  { ageMs: 5000, expected: 'il y a 5s' },
  { ageMs: 60000, expected: 'il y a 1 min' },
  { ageMs: 180000, expected: 'il y a 3 min' },
  { ageMs: 3600000, expected: 'il y a 1h' },
  { ageMs: 7200000, expected: 'il y a 2h' },
  { ageMs: null, expected: 'Jamais' }
]

/**
 * Cas de test pour l'extraction du contexte
 */
export const contextExtractionTestCases = [
  { 
    key: 'agent:orchestrator:mattermost:channel:szei4nsiz788pnaj8fipoptqhw',
    expected: 'mattermost:channel:szei4nsiz788pnaj8fipoptqhw'
  },
  {
    key: 'agent:taylor:telegram:dm:123456',
    expected: 'telegram:dm:123456'
  },
  {
    key: 'isolated:task:abc123',
    expected: 'isolated:task:abc123'
  }
]
