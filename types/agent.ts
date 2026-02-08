/**
 * Architecture Multi-Agents - Définitions de types
 */

export type AgentStatus = 'active' | 'idle' | 'busy' | 'error' | 'offline';

export type AgentRole = 
  | 'orchestrator'      // Orchestre les délibérations
  | 'specialist'        // Expert dans un domaine
  | 'reviewer'          // Revoit et critique
  | 'executor'          // Exécute des tâches
  | 'monitor'           // Surveille et observe
  | 'bridge';           // Connecte différents systèmes

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high' | 'extended';

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentModel {
  provider: string;        // anthropic, openai, etc.
  name: string;           // claude-sonnet-4-5, gpt-4, etc.
  alias?: string;         // sonnet, gpt4, etc.
  thinking?: ThinkingLevel;
}

export interface AgentMetrics {
  totalMessages: number;
  successRate: number;     // 0-100
  avgResponseTime: number; // en ms
  lastActive?: string;     // ISO date
  tokensUsed?: number;
  cost?: number;          // en USD
}

export interface AgentConfig {
  autoStart?: boolean;
  maxConcurrent?: number;
  timeout?: number;        // en secondes
  retryAttempts?: number;
  customInstructions?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  description: string;
  
  // Modèle et capacités
  model: AgentModel;
  capabilities: AgentCapability[];
  
  // Métriques et état
  metrics: AgentMetrics;
  
  // Configuration
  config: AgentConfig;
  
  // Métadonnées
  createdAt: string;       // ISO date
  updatedAt: string;       // ISO date
  createdBy?: string;      // ID de l'agent créateur ou "system"
  tags?: string[];
  
  // Relations
  linkedAgents?: string[]; // IDs d'autres agents
  channelId?: string;      // Canal de communication associé
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  action: string;
  dependencies?: string[]; // IDs des steps précédents
  config?: Record<string, any>;
}

export interface Deliberation {
  id: string;
  topic: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  orchestratorId: string;
  participantIds: string[];
  startedAt?: string;
  completedAt?: string;
  result?: string;
}
