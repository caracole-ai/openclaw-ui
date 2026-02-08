/**
 * Types partagés pour le Dashboard Agents (v2 - enrichi)
 * Basé sur le contrat API défini par Winston + données openclaw status --json
 * @see GET /api/agents/status
 */

/**
 * Statut d'un agent OpenClaw
 * - online: heartbeat < 2min ET session active
 * - idle: heartbeat < 5min, pas d'activité récente
 * - offline: heartbeat > 5min ou absent
 */
export type AgentStatusType = 'online' | 'idle' | 'offline'

/**
 * Équipes d'agents (dérivé du workspace path)
 * - code: agents dev/archi/qa
 * - writing: agents créatifs/écriture
 * - free: agents libres/expérimentaux
 */
export type AgentTeam = 'code' | 'writing' | 'free' | 'unknown'

/**
 * Modèles disponibles
 */
export type ModelType = 'claude-opus-4-5' | 'claude-sonnet-4-5' | string

/**
 * Informations de consommation de tokens
 */
export interface TokenUsage {
  /** Tokens utilisés en entrée (session courante) */
  input: number
  /** Tokens utilisés en sortie (session courante) */
  output: number
  /** Total tokens utilisés */
  total: number
  /** Tokens restants avant limite contexte */
  remaining: number
  /** Pourcentage du contexte utilisé (0-100) */
  percentUsed: number
  /** Taille max du contexte */
  contextSize: number
}

/**
 * Informations de session
 */
export interface SessionInfo {
  sessionId: string
  key: string
  context: string
  totalTokens: number
  percentUsed: number
  model: string
  ageMs: number
}

/**
 * Représentation d'un agent dans le dashboard
 */
export interface AgentStatus {
  /** Identifiant unique de l'agent (ex: "winston-architecte") */
  id: string
  /** Nom d'affichage (ex: "Winston") */
  name: string
  /** Équipe de l'agent (code/writing/free) */
  team: AgentTeam
  /** Statut calculé à partir des heartbeats */
  status: AgentStatusType
  /** Dernier heartbeat reçu (ISO 8601) - null si jamais vu */
  lastHeartbeat: string | null
  /** Dernière activité détectée (ISO 8601) - null si aucune */
  lastActivity: string | null
  /** Nombre de sessions actives */
  activeSessions: number
  /** Chemin du workspace */
  workspace: string
  /** Total tokens utilisés (toutes sessions) */
  totalTokens: number
  /** Modèle utilisé */
  model: ModelType | null
  /** Pourcentage max du contexte utilisé */
  maxPercentUsed: number
  /** Sessions actives détaillées */
  sessions: SessionInfo[]
}

/**
 * Réponse de l'endpoint GET /api/agents/status
 */
export interface AgentsStatusResponse {
  /** Liste des agents configurés */
  agents: AgentStatus[]
  /** Timestamp de la réponse (ISO 8601) */
  timestamp: string
}

/**
 * Erreur API standard
 */
export interface ApiError {
  message: string
  code?: string
  statusCode: number
}
