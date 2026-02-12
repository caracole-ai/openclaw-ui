/**
 * Tests unitaires - serializers
 */
import { describe, it, expect } from 'vitest'
import { serializeProject, serializeAgent } from '~/server/utils/serializers'
import type { DbProject, DbProjectAgent, DbProjectPhase, DbProjectUpdate, DbAgent } from '~/server/types/db'

const makeProject = (overrides: Partial<DbProject> = {}): DbProject => ({
  id: 'test-1',
  name: 'Test Project',
  description: 'desc',
  type: 'code',
  status: 'in-progress',
  state: 'build',
  progress: 50,
  lead: 'main',
  channel: 'test-channel',
  channel_id: 'ch123',
  workspace: '/tmp/test',
  github_repo: 'org/repo',
  github_created: 1,
  current_phase: 'dev',
  last_nudge_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
  ...overrides,
})

const makeAgent = (overrides: Partial<DbAgent> = {}): DbAgent => ({
  id: 'agent-1',
  name: 'Agent One',
  emoji: '🤖',
  team: 'code',
  role: 'developer',
  model: 'anthropic/claude-sonnet-4-20250514',
  workspace: '/tmp/agent',
  status: 'active',
  mm_username: 'agent1',
  mm_user_id: 'uid123',
  mm_token: 'secret-token',
  permissions: '{"canAssignSkills":true}',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('serializeProject', () => {
  it('transforms DB row + relations into API format', () => {
    const team: DbProjectAgent[] = [
      { project_id: 'test-1', agent_id: 'main', role: 'lead' },
      { project_id: 'test-1', agent_id: 'amelia', role: null },
    ]
    const phases: DbProjectPhase[] = [
      { id: 1, project_id: 'test-1', name: 'Design', status: 'completed', started_at: '2025-01-01', completed_at: '2025-01-02', sort_order: 0 },
    ]
    const updates: DbProjectUpdate[] = [
      { id: 1, project_id: 'test-1', agent_id: 'main', message: 'Init', type: 'note', created_at: '2025-01-01T00:00:00Z' },
    ]

    const result = serializeProject(makeProject(), { team, phases, updates })

    expect(result.id).toBe('test-1')
    expect(result.state).toBe('build')
    expect(result.team).toEqual([
      { agent: 'main', role: 'lead' },
      { agent: 'amelia', role: null },
    ])
    expect(result.agents).toEqual(['main', 'amelia'])
    expect(result.assignees).toEqual(['main', 'amelia'])
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0].name).toBe('Design')
    expect(result.updates).toHaveLength(1)
    expect(result.github).toEqual({ repo: 'org/repo', created: true })
  })

  it('handles empty relations', () => {
    const result = serializeProject(makeProject(), { team: [], phases: [], updates: [] })
    expect(result.team).toEqual([])
    expect(result.agents).toEqual([])
    expect(result.phases).toEqual([])
    expect(result.updates).toEqual([])
  })

  it('does not include status field (removed)', () => {
    const result = serializeProject(makeProject(), { team: [], phases: [], updates: [] })
    expect(result).not.toHaveProperty('status')
  })
})

describe('serializeAgent', () => {
  it('transforms DB row into API format', () => {
    const result = serializeAgent(makeAgent(), { skills: ['skill-1', 'skill-2'] })
    
    expect(result.id).toBe('agent-1')
    expect(result.skills).toEqual(['skill-1', 'skill-2'])
    expect(result.permissions).toEqual({ canAssignSkills: true })
  })

  it('does NOT expose mattermost token', () => {
    const result = serializeAgent(makeAgent())
    expect(result.mattermost).toEqual({ username: 'agent1', userId: 'uid123' })
    expect(result.mattermost).not.toHaveProperty('token')
  })

  it('merges live stats', () => {
    const live = { totalTokens: 5000, activeSessions: 2 }
    const result = serializeAgent(makeAgent(), { live })
    expect(result.totalTokens).toBe(5000)
    expect(result.activeSessions).toBe(2)
  })

  it('handles null permissions', () => {
    const result = serializeAgent(makeAgent({ permissions: null }))
    expect(result.permissions).toBeNull()
  })
})
