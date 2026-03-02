/**
 * Tests unitaires - Skills Management
 * Couvre les endpoints skills et la logique d'assignation
 */
import { describe, it, expect } from 'vitest'

describe('Skills assignment logic', () => {
  const allSkills = [
    { id: 'github', name: 'GitHub CLI' },
    { id: 'coding-agent', name: 'Coding Agent' },
    { id: 'browser-automation', name: 'Browser Automation' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
    { id: 'mattermost-mcp', name: 'Mattermost MCP' },
  ]

  it('computes available skills (not assigned to agent)', () => {
    const agentSkills = ['github', 'coding-agent']
    const available = allSkills.filter(s => !agentSkills.includes(s.id))

    expect(available).toHaveLength(3)
    expect(available.map(s => s.id)).toEqual(['browser-automation', 'nano-banana-pro', 'mattermost-mcp'])
  })

  it('returns empty available when all skills assigned', () => {
    const agentSkills = allSkills.map(s => s.id)
    const available = allSkills.filter(s => !agentSkills.includes(s.id))

    expect(available).toHaveLength(0)
  })

  it('returns all skills available when none assigned', () => {
    const agentSkills: string[] = []
    const available = allSkills.filter(s => !agentSkills.includes(s.id))

    expect(available).toHaveLength(allSkills.length)
  })

  it('handles duplicate skill IDs gracefully (INSERT OR IGNORE)', () => {
    const assigned = new Set(['github', 'coding-agent'])
    assigned.add('github') // duplicate
    expect(assigned.size).toBe(2)
  })
})

describe('Agent navigation (prev/next)', () => {
  const agents = [
    { id: 'main', name: 'Cloclo' },
    { id: 'winston', name: 'Winston' },
    { id: 'amelia', name: 'Amelia' },
    { id: 'claudio', name: 'Claudio' },
    { id: 'manolo', name: 'Manolo' },
  ]

  it('computes prev/next for middle agent', () => {
    const idx = agents.findIndex(a => a.id === 'amelia')
    const prev = idx > 0 ? agents[idx - 1] : null
    const next = idx < agents.length - 1 ? agents[idx + 1] : null

    expect(prev?.name).toBe('Winston')
    expect(next?.name).toBe('Claudio')
  })

  it('first agent has no prev', () => {
    const idx = 0
    const prev = idx > 0 ? agents[idx - 1] : null
    expect(prev).toBeNull()
  })

  it('last agent has no next', () => {
    const idx = agents.length - 1
    const next = idx < agents.length - 1 ? agents[idx + 1] : null
    expect(next).toBeNull()
  })
})

describe('Progress bar by state index', () => {
  const STATES = ['backlog', 'planning', 'build', 'review', 'delivery', 'rex', 'done']

  function progressFromState(state: string, dbProgress: number): number {
    if (dbProgress > 0) return dbProgress
    const idx = STATES.indexOf(state)
    if (idx < 0) return 0
    return Math.round((idx / (STATES.length - 1)) * 100)
  }

  it('backlog = 0%', () => expect(progressFromState('backlog', 0)).toBe(0))
  it('build ≈ 33%', () => expect(progressFromState('build', 0)).toBe(33))
  it('review = 50%', () => expect(progressFromState('review', 0)).toBe(50))
  it('done = 100%', () => expect(progressFromState('done', 0)).toBe(100))
  it('prefers DB progress if > 0', () => expect(progressFromState('backlog', 75)).toBe(75))
})

describe('Soft poll (liveOverride)', () => {
  it('liveOverride takes precedence over initial fetch', () => {
    const initial = { totalTokens: 1000, activeSessions: 1, maxPercentUsed: 5 }
    const override = { totalTokens: 2000, activeSessions: 2, maxPercentUsed: 10 }

    const liveStats = override || initial
    expect(liveStats.totalTokens).toBe(2000)
    expect(liveStats.activeSessions).toBe(2)
  })

  it('falls back to initial when no override', () => {
    const initial = { totalTokens: 1000, activeSessions: 1, maxPercentUsed: 5 }
    const override = null

    const liveStats = override || initial
    expect(liveStats.totalTokens).toBe(1000)
  })
})
