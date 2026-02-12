/**
 * Database row types — mirror the SQLite schema exactly.
 * Used to replace `as any` casts throughout server code.
 */

export interface DbAgent {
  id: string
  name: string
  emoji: string | null
  team: string | null
  role: string | null
  model: string
  workspace: string | null
  status: string
  mm_username: string | null
  mm_user_id: string | null
  mm_token: string | null
  permissions: string | null  // JSON string
  created_at: string
}

export interface DbProject {
  id: string
  name: string
  description: string | null
  type: string | null
  status: string
  state: string
  progress: number
  lead: string | null
  channel: string | null
  channel_id: string | null
  workspace: string | null
  github_repo: string | null
  github_created: number
  current_phase: string | null
  last_nudge_at: string | null
  created_at: string
  updated_at: string
}

export interface DbProjectAgent {
  project_id: string
  agent_id: string
  role: string | null
}

export interface DbProjectPhase {
  id: number
  project_id: string
  name: string
  status: string
  started_at: string | null
  completed_at: string | null
  sort_order: number
}

export interface DbProjectUpdate {
  id: number
  project_id: string
  agent_id: string | null
  message: string
  type: string
  created_at: string
}

export interface DbSkill {
  id: string
  name: string
  description: string | null
  version: string | null
  source: string | null
  path: string | null
  manifest: string | null  // JSON string
  installed_at: string | null
  installed_by: string | null
  status: string
}

export interface DbTokenEvent {
  id: string
  agent_id: string | null
  project_id: string | null
  skill_id: string | null
  session_id: string | null
  model: string | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  input_cost: number
  output_cost: number
  total_cost: number
  action: string | null
  trigger_type: string | null
  created_at: string
}

export interface DbAgentSkill {
  agent_id: string
  skill_id: string
}
