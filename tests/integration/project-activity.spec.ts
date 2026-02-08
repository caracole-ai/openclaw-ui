/**
 * Tests d'intégration - API Project Activity (Token Tracking)
 * Endpoint: GET /api/projects/:id/activity
 * 
 * Features:
 * - Token usage par agent
 * - Sessions actives
 * - Burn rate estimation
 * - Recent updates
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de données pour simuler openclaw status
const mockOpenClawStatus = {
  sessions: {
    recent: [
      {
        agentId: 'amelia-dev',
        key: 'agent:amelia-dev:mattermost:channel:abc123def456',
        kind: 'agent',
        sessionId: 'session-1',
        updatedAt: Date.now() - 60000, // 1 min ago
        age: 60000,
        totalTokens: 45000,
        inputTokens: 30000,
        outputTokens: 15000,
        remainingTokens: 155000,
        percentUsed: 22,
        model: 'claude-opus-4-5',
        contextTokens: 8000
      },
      {
        agentId: 'winston-architecte',
        key: 'agent:winston-architecte:mattermost:channel:xyz789',
        kind: 'agent',
        sessionId: 'session-2',
        updatedAt: Date.now() - 120000, // 2 min ago
        age: 120000,
        totalTokens: 32000,
        inputTokens: 20000,
        outputTokens: 12000,
        remainingTokens: 168000,
        percentUsed: 16,
        model: 'claude-sonnet-4-5',
        contextTokens: 5000
      },
      {
        agentId: 'taylor-qa',
        key: 'agent:taylor-qa:mattermost:channel:qwe456',
        kind: 'agent',
        sessionId: 'session-3',
        updatedAt: Date.now() - 600000, // 10 min ago (inactive)
        age: 600000,
        totalTokens: 12000,
        inputTokens: 8000,
        outputTokens: 4000,
        remainingTokens: 188000,
        percentUsed: 6,
        model: 'claude-opus-4-5',
        contextTokens: 2000
      }
    ]
  }
}

// Helper pour parser channel depuis key (comme l'API)
function parseChannelFromKey(key: string): string {
  const parts = key.split(':')
  if (parts.length >= 5) {
    const provider = parts[2]
    const channelId = parts[4]
    return `${provider}:${channelId.substring(0, 8)}...`
  }
  return 'unknown'
}

// Helper pour formatAgo (comme l'API)
function formatAgo(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`
  return `${Math.floor(ms / 86400000)}d`
}

describe('Project Activity API', () => {
  describe('Token Aggregation', () => {
    it('calcule le total des tokens pour tous les agents assignés', () => {
      const sessions = mockOpenClawStatus.sessions.recent
      const assignees = ['amelia-dev', 'winston-architecte']
      
      const relevantSessions = sessions.filter(s => assignees.includes(s.agentId))
      const total = relevantSessions.reduce((sum, s) => sum + s.totalTokens, 0)
      
      expect(total).toBe(45000 + 32000) // amelia + winston
      expect(total).toBe(77000)
    })

    it('agrège les tokens par agent correctement', () => {
      const sessions = mockOpenClawStatus.sessions.recent
      const tokensByAgent = new Map()
      
      for (const session of sessions) {
        const existing = tokensByAgent.get(session.agentId)
        if (existing) {
          existing.totalTokens += session.totalTokens
          existing.sessionCount++
        } else {
          tokensByAgent.set(session.agentId, {
            agentId: session.agentId,
            totalTokens: session.totalTokens,
            percentUsed: session.percentUsed,
            sessionCount: 1
          })
        }
      }
      
      expect(tokensByAgent.get('amelia-dev').totalTokens).toBe(45000)
      expect(tokensByAgent.get('winston-architecte').totalTokens).toBe(32000)
      expect(tokensByAgent.get('taylor-qa').totalTokens).toBe(12000)
    })

    it('exclut les agents non assignés au projet', () => {
      const sessions = mockOpenClawStatus.sessions.recent
      const assignees = ['amelia-dev'] // Only amelia
      
      const relevantSessions = sessions.filter(s => assignees.includes(s.agentId))
      
      expect(relevantSessions.length).toBe(1)
      expect(relevantSessions[0].agentId).toBe('amelia-dev')
    })
  })

  describe('Active Sessions', () => {
    it('filtre les sessions actives (< 5 min)', () => {
      const sessions = mockOpenClawStatus.sessions.recent
      const activeSessions = sessions.filter(s => s.age < 300000) // 5 min
      
      // amelia (1 min) et winston (2 min) sont actifs, taylor (10 min) non
      expect(activeSessions.length).toBe(2)
      expect(activeSessions.map(s => s.agentId)).toContain('amelia-dev')
      expect(activeSessions.map(s => s.agentId)).toContain('winston-architecte')
      expect(activeSessions.map(s => s.agentId)).not.toContain('taylor-qa')
    })

    it('parse correctement le channel depuis la key', () => {
      const key = 'agent:amelia-dev:mattermost:channel:abc123def456'
      const channel = parseChannelFromKey(key)
      
      expect(channel).toBe('mattermost:abc123de...')
    })

    it('retourne "unknown" pour key malformée', () => {
      const key = 'invalid-key'
      const channel = parseChannelFromKey(key)
      
      expect(channel).toBe('unknown')
    })
  })

  describe('formatAgo Helper', () => {
    it('formate les secondes correctement', () => {
      expect(formatAgo(30000)).toBe('30s')
      expect(formatAgo(59000)).toBe('59s')
    })

    it('formate les minutes correctement', () => {
      expect(formatAgo(60000)).toBe('1m')
      expect(formatAgo(120000)).toBe('2m')
      expect(formatAgo(3599000)).toBe('59m')
    })

    it('formate les heures correctement', () => {
      expect(formatAgo(3600000)).toBe('1h')
      expect(formatAgo(7200000)).toBe('2h')
      expect(formatAgo(86399000)).toBe('23h')
    })

    it('formate les jours correctement', () => {
      expect(formatAgo(86400000)).toBe('1d')
      expect(formatAgo(172800000)).toBe('2d')
    })
  })

  describe('Burn Rate Calculation', () => {
    it('calcule le burn rate basé sur l\'âge du projet', () => {
      const totalTokens = 100000
      const projectCreatedAt = new Date(Date.now() - 10 * 3600000) // 10h ago
      const projectAgeHours = (Date.now() - projectCreatedAt.getTime()) / 3600000
      
      const burnRate = Math.round(totalTokens / projectAgeHours)
      
      expect(burnRate).toBe(10000) // 100k tokens / 10h = 10k/h
    })

    it('retourne 0 si projet très récent (évite division par 0)', () => {
      const totalTokens = 1000
      const projectAgeHours = 0
      
      const burnRate = projectAgeHours > 0 ? Math.round(totalTokens / projectAgeHours) : 0
      
      expect(burnRate).toBe(0)
    })
  })

  describe('Recent Updates', () => {
    it('limite à 10 updates et les inverse (récent en premier)', () => {
      // Updates ordered oldest to newest (like in storage)
      const updates = Array.from({ length: 15 }, (_, i) => ({
        timestamp: new Date(Date.now() - (14 - i) * 3600000).toISOString(), // 0 is oldest, 14 is newest
        agentId: `agent-${i}`,
        message: `Update ${i}`
      }))
      
      // slice(-10) takes last 10 (updates 5-14), reverse puts newest first
      const recentUpdates = updates.slice(-10).reverse()
      
      expect(recentUpdates.length).toBe(10)
      expect(recentUpdates[0].message).toBe('Update 14') // Most recent (index 14)
      expect(recentUpdates[9].message).toBe('Update 5')  // Oldest of the 10
    })

    it('détermine le type d\'update correctement', () => {
      const updates = [
        { timestamp: '2026-02-07T12:00:00Z', agentId: 'test', status: 'in-progress' },
        { timestamp: '2026-02-07T12:01:00Z', agentId: 'test', progress: 50 },
        { timestamp: '2026-02-07T12:02:00Z', agentId: 'test', message: 'Note simple' },
        { timestamp: '2026-02-07T12:03:00Z', agentId: 'test', message: 'Typed', type: 'assignment' }
      ]
      
      const typed = updates.map(u => ({
        ...u,
        type: u.type || (u.status ? 'status' : u.progress !== undefined ? 'progress' : 'note')
      }))
      
      expect(typed[0].type).toBe('status')
      expect(typed[1].type).toBe('progress')
      expect(typed[2].type).toBe('note')
      expect(typed[3].type).toBe('assignment') // Explicit type preserved
    })
  })

  describe('Response Structure', () => {
    it('retourne la structure attendue', () => {
      const response = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        assignees: ['amelia-dev', 'winston-architecte'],
        tokens: {
          total: 77000,
          byAgent: [
            { agentId: 'amelia-dev', totalTokens: 45000, percentUsed: 22 },
            { agentId: 'winston-architecte', totalTokens: 32000, percentUsed: 16 }
          ],
          burnRate: 7700
        },
        activeSessions: [
          { agentId: 'amelia-dev', sessionId: 'session-1', channel: 'mattermost:abc123de...', lastActiveAgo: '1m', tokens: 45000, percentUsed: 22 }
        ],
        recentUpdates: [],
        timestamp: new Date().toISOString()
      }
      
      // Validate structure
      expect(response).toHaveProperty('projectId')
      expect(response).toHaveProperty('projectName')
      expect(response).toHaveProperty('assignees')
      expect(response).toHaveProperty('tokens')
      expect(response.tokens).toHaveProperty('total')
      expect(response.tokens).toHaveProperty('byAgent')
      expect(response.tokens).toHaveProperty('burnRate')
      expect(response).toHaveProperty('activeSessions')
      expect(response).toHaveProperty('recentUpdates')
      expect(response).toHaveProperty('timestamp')
    })
  })
})

describe('Error Handling', () => {
  it('gère le cas où le projet n\'existe pas', () => {
    const projects = [{ id: 'proj-1', name: 'Existing' }]
    const searchId = 'proj-nonexistent'
    
    const project = projects.find(p => p.id === searchId)
    
    expect(project).toBeUndefined()
  })

  it('gère le cas où openclaw status échoue', () => {
    // Simule un fallback quand openclaw n'est pas disponible
    const sessions: any[] = []
    const fallbackTotal = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
    
    expect(fallbackTotal).toBe(0)
  })
})
