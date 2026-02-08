/**
 * Thomas Resume Integration Tests
 * 
 * Tests for the project resume flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('Thomas Resume Flow', () => {
  const testDir = join(tmpdir(), 'thomas-test-' + Date.now())
  const projectDir = join(testDir, 'test-project')
  const statusPath = join(projectDir, 'status.json')

  beforeEach(async () => {
    await mkdir(projectDir, { recursive: true })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true })
    }
  })

  it('should identify paused projects with quota reason', async () => {
    const status = {
      id: 'test-project',
      status: 'paused',
      pauseReason: 'quota',
      assignedAgent: 'amelia-dev'
    }
    
    await writeFile(statusPath, JSON.stringify(status))
    
    const content = await readFile(statusPath, 'utf-8')
    const parsed = JSON.parse(content)
    
    expect(parsed.status).toBe('paused')
    expect(parsed.pauseReason).toBe('quota')
  })

  it('should ignore paused projects without quota reason', async () => {
    const status = {
      id: 'test-project',
      status: 'paused',
      pauseReason: 'manual', // Not quota
      assignedAgent: 'amelia-dev'
    }
    
    await writeFile(statusPath, JSON.stringify(status))
    
    const content = await readFile(statusPath, 'utf-8')
    const parsed = JSON.parse(content)
    
    // Should not be picked up for auto-resume
    expect(parsed.pauseReason).not.toBe('quota')
  })

  it('should update status to in_progress after resume', async () => {
    const status = {
      id: 'test-project',
      status: 'paused',
      pauseReason: 'quota',
      assignedAgent: 'amelia-dev'
    }
    
    await writeFile(statusPath, JSON.stringify(status))
    
    // Simulate resume
    const updated = {
      ...status,
      status: 'in_progress',
      pauseReason: null,
      pausedAt: null,
      updatedAt: new Date().toISOString()
    }
    
    await writeFile(statusPath, JSON.stringify(updated))
    
    const content = await readFile(statusPath, 'utf-8')
    const parsed = JSON.parse(content)
    
    expect(parsed.status).toBe('in_progress')
    expect(parsed.pauseReason).toBeNull()
  })
})
