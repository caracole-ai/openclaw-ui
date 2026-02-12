/**
 * Serializers — transform DB rows into JSON API format.
 * Single Responsibility: all response shaping lives here.
 */
import type { DbProject, DbProjectAgent, DbProjectPhase, DbProjectUpdate, DbAgent, DbAgentSkill } from '~/server/types/db'

export function serializeProject(
  p: DbProject,
  relations: {
    team: DbProjectAgent[]
    phases: DbProjectPhase[]
    updates: DbProjectUpdate[]
  }
) {
  const { team, phases, updates } = relations
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    state: p.state as string,
    progress: p.progress,
    lead: p.lead,
    channel: p.channel,
    channelId: p.channel_id,
    workspace: p.workspace,
    github: { repo: p.github_repo, created: !!p.github_created },
    currentPhase: p.current_phase,
    lastNudgeAt: p.last_nudge_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    team: team.map(a => ({ agent: a.agent_id, role: a.role })),
    agents: team.map(a => a.agent_id),
    assignees: team.map(a => a.agent_id),
    phases: phases.map(ph => ({
      name: ph.name,
      status: ph.status,
      startedAt: ph.started_at,
      completedAt: ph.completed_at,
    })),
    updates: updates.map(u => ({
      timestamp: u.created_at,
      agentId: u.agent_id,
      message: u.message,
      type: u.type,
    })),
  }
}

export function serializeAgent(
  a: DbAgent,
  options: {
    skills?: string[]
    live?: Record<string, any>
  } = {}
) {
  const { skills = [], live = {} } = options
  return {
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    team: a.team,
    role: a.role,
    model: a.model,
    workspace: a.workspace,
    status: a.status,
    skills,
    mattermost: { username: a.mm_username, userId: a.mm_user_id },
    permissions: a.permissions ? JSON.parse(a.permissions) : null,
    createdAt: a.created_at,
    ...live,
  }
}
