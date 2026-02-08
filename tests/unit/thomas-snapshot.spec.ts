/**
 * Thomas Snapshot/Diff Tests
 * 
 * Tests for the token snapshot and diff logic
 */

import { describe, it, expect } from 'vitest'

interface TokenSnapshot {
  timestamp: string
  totalTokens: number
  bySession: Record<string, number>
}

function calculateConsumption(currentTotal: number, snapshotTotal: number): number {
  return Math.max(0, currentTotal - snapshotTotal)
}

describe('Thomas Snapshot/Diff', () => {
  describe('calculateConsumption', () => {
    it('should calculate tokens consumed since snapshot', () => {
      const snapshotTotal = 100000
      const currentTotal = 150000
      
      const consumed = calculateConsumption(currentTotal, snapshotTotal)
      
      expect(consumed).toBe(50000)
    })

    it('should return 0 if current is less than snapshot', () => {
      // This can happen if sessions are cleared
      const snapshotTotal = 150000
      const currentTotal = 100000
      
      const consumed = calculateConsumption(currentTotal, snapshotTotal)
      
      expect(consumed).toBe(0)
    })

    it('should handle identical values', () => {
      const snapshotTotal = 100000
      const currentTotal = 100000
      
      const consumed = calculateConsumption(currentTotal, snapshotTotal)
      
      expect(consumed).toBe(0)
    })
  })

  describe('snapshot creation', () => {
    it('should create valid snapshot structure', () => {
      const sessions = [
        { key: 'agent:amelia:main', totalTokens: 50000 },
        { key: 'agent:thomas:main', totalTokens: 25000 },
        { key: 'agent:winston:main', totalTokens: 30000 }
      ]
      
      const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
      const bySession: Record<string, number> = {}
      for (const s of sessions) {
        bySession[s.key] = s.totalTokens
      }
      
      const snapshot: TokenSnapshot = {
        timestamp: new Date().toISOString(),
        totalTokens,
        bySession
      }
      
      expect(snapshot.totalTokens).toBe(105000)
      expect(Object.keys(snapshot.bySession)).toHaveLength(3)
    })
  })
})
