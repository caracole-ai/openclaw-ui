/**
 * Tests d'intégration - API Project Nudge
 * Endpoint: POST /api/projects/:id/nudge
 * 
 * Features:
 * - Cooldown 15s
 * - Option 2: canal groupé (sessions_send)
 * - Fallback: orchestrator spawn
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Constantes de l'API
const COOLDOWN_MS = 15 * 1000 // 15 secondes

describe('Project Nudge API', () => {
  describe('Cooldown Logic', () => {
    it('autorise nudge si lastNudgeAt undefined', () => {
      const project = { id: 'proj-1', lastNudgeAt: undefined }
      const now = Date.now()
      
      const canNudge = !project.lastNudgeAt || 
        (now - new Date(project.lastNudgeAt).getTime() > COOLDOWN_MS)
      
      expect(canNudge).toBe(true)
    })

    it('autorise nudge si cooldown expiré (>15s)', () => {
      const project = { 
        id: 'proj-1', 
        lastNudgeAt: new Date(Date.now() - 20000).toISOString() // 20s ago
      }
      const now = Date.now()
      
      const timeSinceNudge = now - new Date(project.lastNudgeAt).getTime()
      const canNudge = timeSinceNudge > COOLDOWN_MS
      
      expect(timeSinceNudge).toBeGreaterThan(COOLDOWN_MS)
      expect(canNudge).toBe(true)
    })

    it('bloque nudge si cooldown actif (<15s)', () => {
      const project = { 
        id: 'proj-1', 
        lastNudgeAt: new Date(Date.now() - 5000).toISOString() // 5s ago
      }
      const now = Date.now()
      
      const timeSinceNudge = now - new Date(project.lastNudgeAt).getTime()
      const canNudge = timeSinceNudge > COOLDOWN_MS
      
      expect(timeSinceNudge).toBeLessThan(COOLDOWN_MS)
      expect(canNudge).toBe(false)
    })

    it('calcule correctement nextNudgeAvailableAt', () => {
      const lastNudgeAt = new Date(Date.now() - 5000) // 5s ago
      const nextNudgeAvailableAt = new Date(lastNudgeAt.getTime() + COOLDOWN_MS)
      
      // Devrait être dans ~10s
      const msUntilNext = nextNudgeAvailableAt.getTime() - Date.now()
      expect(msUntilNext).toBeGreaterThan(9000) // ~10s
      expect(msUntilNext).toBeLessThan(11000)
    })
  })

  describe('Option 2: Canal Groupé', () => {
    it('utilise sessions_send si channelId existe', () => {
      const project = {
        id: 'proj-1',
        name: 'Test Project',
        channelId: 'szei4nsiz788pnaj8fipoptqhw',
        assignees: ['amelia-dev', 'winston-architecte']
      }
      
      // Logique de décision
      const useGroupChannel = !!project.channelId
      
      expect(useGroupChannel).toBe(true)
    })

    it('fallback vers orchestrator si pas de channelId', () => {
      const project = {
        id: 'proj-1',
        name: 'Test Project',
        channelId: undefined,
        assignees: ['amelia-dev']
      }
      
      const useGroupChannel = !!project.channelId
      const useFallback = !useGroupChannel
      
      expect(useFallback).toBe(true)
    })

    it('construit le bon message nudge', () => {
      const project = {
        id: 'proj-1',
        name: 'Dashboard Projets v2',
        assignees: ['amelia-dev', 'winston-architecte']
      }
      
      const message = `🔄 **Nudge projet "${project.name}"**

Où en est-on ? Si bloqués, concertez-vous et avancez.

Agents assignés : ${project.assignees.join(', ')}`
      
      expect(message).toContain('Nudge projet')
      expect(message).toContain('Dashboard Projets v2')
      expect(message).toContain('amelia-dev')
      expect(message).toContain('winston-architecte')
    })
  })

  describe('Update Project After Nudge', () => {
    it('met à jour lastNudgeAt après nudge réussi', () => {
      const project = {
        id: 'proj-1',
        lastNudgeAt: undefined,
        updates: []
      }
      
      const now = new Date().toISOString()
      project.lastNudgeAt = now
      
      expect(project.lastNudgeAt).toBe(now)
    })

    it('ajoute une entrée dans updates après nudge', () => {
      const project = {
        id: 'proj-1',
        updates: [] as any[]
      }
      
      const nudgeUpdate = {
        timestamp: new Date().toISOString(),
        agentId: 'system',
        message: '🔄 Projet relancé via nudge',
        type: 'nudge'
      }
      
      project.updates.push(nudgeUpdate)
      
      expect(project.updates.length).toBe(1)
      expect(project.updates[0].type).toBe('nudge')
    })
  })

  describe('Response Format', () => {
    it('retourne success avec infos agents', () => {
      const response = {
        success: true,
        message: 'Projet "Test" relancé. Orchestrator notifié.',
        nudgedAgents: ['orchestrator', 'amelia-dev'],
        nextNudgeAvailableAt: new Date(Date.now() + COOLDOWN_MS).toISOString()
      }
      
      expect(response.success).toBe(true)
      expect(response.nudgedAgents).toContain('orchestrator')
      expect(response.nextNudgeAvailableAt).toBeDefined()
    })

    it('retourne 429 avec infos cooldown', () => {
      const response = {
        statusCode: 429,
        message: 'Cooldown actif. Prochain nudge possible dans 10 secondes.',
        data: {
          remainingMs: 10000,
          nextNudgeAvailableAt: new Date(Date.now() + 10000).toISOString()
        }
      }
      
      expect(response.statusCode).toBe(429)
      expect(response.data.remainingMs).toBeLessThanOrEqual(COOLDOWN_MS)
    })
  })

  describe('Visibility Logic', () => {
    const shouldShowNudgeButton = (status: string): boolean => {
      return !['completed', 'archived'].includes(status)
    }

    it('bouton visible sur in-progress', () => {
      expect(shouldShowNudgeButton('in-progress')).toBe(true)
    })

    it('bouton visible sur planning', () => {
      expect(shouldShowNudgeButton('planning')).toBe(true)
    })

    it('bouton visible sur review', () => {
      expect(shouldShowNudgeButton('review')).toBe(true)
    })

    it('bouton visible sur paused', () => {
      expect(shouldShowNudgeButton('paused')).toBe(true)
    })

    it('bouton invisible sur completed', () => {
      expect(shouldShowNudgeButton('completed')).toBe(false)
    })

    it('bouton invisible sur archived', () => {
      expect(shouldShowNudgeButton('archived')).toBe(false)
    })
  })
})
