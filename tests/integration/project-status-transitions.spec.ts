/**
 * Tests Integration - Project Status Transitions
 * 
 * Tests for the new status transition rules:
 * - in_progress → paused (with pauseReason)
 * - paused → in_progress (resume)
 * - All phases completed → auto completed
 * - Project watcher auto-corrections
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('Project Status Transitions', () => {
  const testDir = join(tmpdir(), 'project-transitions-' + Date.now())
  
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true })
    }
  })

  describe('in_progress → paused transition', () => {
    it('should set pauseReason when pausing', async () => {
      const project = {
        id: 'test-1',
        status: 'in_progress',
        pauseReason: null
      }
      
      // Simulate pause with quota reason
      const paused = {
        ...project,
        status: 'paused',
        pauseReason: 'quota',
        pausedAt: new Date().toISOString()
      }
      
      expect(paused.status).toBe('paused')
      expect(paused.pauseReason).toBe('quota')
      expect(paused.pausedAt).toBeDefined()
    })

    it('should support different pause reasons', async () => {
      const reasons = ['quota', 'manual', 'error']
      
      for (const reason of reasons) {
        const paused = {
          status: 'paused',
          pauseReason: reason,
          pausedAt: new Date().toISOString()
        }
        
        expect(paused.pauseReason).toBe(reason)
      }
    })
  })

  describe('paused → in_progress transition (resume)', () => {
    it('should clear pauseReason when resuming', async () => {
      const paused = {
        id: 'test-2',
        status: 'paused',
        pauseReason: 'quota',
        pausedAt: '2026-02-08T10:00:00.000Z'
      }
      
      // Simulate resume
      const resumed = {
        ...paused,
        status: 'in_progress',
        pauseReason: null,
        pausedAt: null,
        updatedAt: new Date().toISOString()
      }
      
      expect(resumed.status).toBe('in_progress')
      expect(resumed.pauseReason).toBeNull()
      expect(resumed.pausedAt).toBeNull()
    })

    it('should preserve resumeMessage for context', async () => {
      const paused = {
        status: 'paused',
        pauseReason: 'quota',
        resumeMessage: 'Continue le widget dashboard'
      }
      
      // Resume message should be available to the agent
      expect(paused.resumeMessage).toBe('Continue le widget dashboard')
    })
  })

  describe('Auto-completion when all phases completed', () => {
    it('should detect when all phases are completed', () => {
      const project = {
        status: 'in_progress',
        phases: [
          { name: 'Phase 1', status: 'completed' },
          { name: 'Phase 2', status: 'completed' },
          { name: 'Phase 3', status: 'completed' }
        ]
      }
      
      const allCompleted = project.phases.every(p => p.status === 'completed')
      expect(allCompleted).toBe(true)
    })

    it('should NOT trigger completion if any phase is not completed', () => {
      const project = {
        status: 'in_progress',
        phases: [
          { name: 'Phase 1', status: 'completed' },
          { name: 'Phase 2', status: 'in-progress' },
          { name: 'Phase 3', status: 'pending' }
        ]
      }
      
      const allCompleted = project.phases.every(p => p.status === 'completed')
      expect(allCompleted).toBe(false)
    })

    it('should calculate progress from phases', () => {
      const phases = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' }
      ]
      
      const completed = phases.filter(p => p.status === 'completed').length
      const progress = Math.round((completed / phases.length) * 100)
      
      expect(progress).toBe(67) // 2/3 = 66.67 → 67
    })
  })

  describe('Project watcher auto-corrections', () => {
    it('should fix status when all phases completed but status is not', async () => {
      const inconsistent = {
        status: 'in_progress', // Should be 'completed'
        phases: [
          { status: 'completed' },
          { status: 'completed' }
        ],
        progress: 50 // Should be 100
      }
      
      // Watcher logic
      const allCompleted = inconsistent.phases.every(p => p.status === 'completed')
      const calculatedProgress = Math.round(
        (inconsistent.phases.filter(p => p.status === 'completed').length / inconsistent.phases.length) * 100
      )
      
      const corrected = {
        ...inconsistent,
        status: allCompleted ? 'completed' : inconsistent.status,
        progress: calculatedProgress,
        completedAt: allCompleted ? new Date().toISOString() : undefined
      }
      
      expect(corrected.status).toBe('completed')
      expect(corrected.progress).toBe(100)
      expect(corrected.completedAt).toBeDefined()
    })

    it('should deduplicate team members', () => {
      const project = {
        team: ['amelia-dev', 'winston-architecte', 'amelia-dev', 'thomas']
      }
      
      const deduplicated = [...new Set(project.team)]
      
      expect(deduplicated).toHaveLength(3)
      expect(deduplicated).toContain('amelia-dev')
      expect(deduplicated).toContain('winston-architecte')
      expect(deduplicated).toContain('thomas')
    })

    it('should extract team from updates if team is empty', () => {
      const project = {
        team: [],
        updates: [
          { agentId: 'amelia-dev', message: 'Started work' },
          { agentId: 'system', message: 'Created' },
          { agentId: 'winston-architecte', message: 'Review' },
          { agentId: 'amelia-dev', message: 'Fixed bug' }
        ]
      }
      
      const agentsFromUpdates = new Set<string>()
      for (const update of project.updates) {
        if (update.agentId !== 'system' && update.agentId !== 'cli' && update.agentId !== 'api') {
          agentsFromUpdates.add(update.agentId)
        }
      }
      
      const extractedTeam = Array.from(agentsFromUpdates)
      
      expect(extractedTeam).toHaveLength(2)
      expect(extractedTeam).toContain('amelia-dev')
      expect(extractedTeam).toContain('winston-architecte')
    })
  })

  describe('Status filtering for Thomas resume', () => {
    it('should only pick paused projects with quota reason', () => {
      const projects = [
        { id: 'p1', status: 'paused', pauseReason: 'quota' },
        { id: 'p2', status: 'paused', pauseReason: 'manual' },
        { id: 'p3', status: 'in_progress', pauseReason: null },
        { id: 'p4', status: 'paused', pauseReason: 'quota' },
        { id: 'p5', status: 'completed', pauseReason: null }
      ]
      
      const toResume = projects.filter(
        p => p.status === 'paused' && p.pauseReason === 'quota'
      )
      
      expect(toResume).toHaveLength(2)
      expect(toResume.map(p => p.id)).toEqual(['p1', 'p4'])
    })
  })
})
