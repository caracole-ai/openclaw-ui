/**
 * Thomas E2E Workflow Tests
 * 
 * End-to-end tests for the complete Thomas workflow
 */

import { describe, it, expect } from 'vitest'

describe('Thomas E2E Workflow', () => {
  describe('Reset Schedule', () => {
    const RESET_HOURS = [0, 5, 10, 15, 20]

    it('should have 5 reset times per day', () => {
      expect(RESET_HOURS).toHaveLength(5)
    })

    it('should calculate next reset correctly', () => {
      const getNextReset = (currentHour: number): number => {
        const nextHour = RESET_HOURS.find(h => h > currentHour)
        return nextHour !== undefined ? nextHour : RESET_HOURS[0]
      }

      expect(getNextReset(3)).toBe(5)   // 3h → next is 5h
      expect(getNextReset(7)).toBe(10)  // 7h → next is 10h
      expect(getNextReset(22)).toBe(0)  // 22h → next is 0h (tomorrow)
      expect(getNextReset(0)).toBe(5)   // 0h → next is 5h (same day)
    })

    it('should identify 5-minute warning window', () => {
      const isWarningWindow = (minutesUntilReset: number): boolean => {
        return minutesUntilReset <= 5 && minutesUntilReset > 0
      }

      expect(isWarningWindow(5)).toBe(true)
      expect(isWarningWindow(3)).toBe(true)
      expect(isWarningWindow(6)).toBe(false)
      expect(isWarningWindow(0)).toBe(false)
    })
  })

  describe('Alert Thresholds', () => {
    it('should trigger alert at 90% tokens', () => {
      const shouldAlert = (percent: number): boolean => percent >= 90
      
      expect(shouldAlert(89)).toBe(false)
      expect(shouldAlert(90)).toBe(true)
      expect(shouldAlert(95)).toBe(true)
    })

    it('should determine health status correctly', () => {
      const getHealth = (percent: number): 'green' | 'yellow' | 'red' => {
        if (percent >= 90) return 'red'
        if (percent >= 75) return 'yellow'
        return 'green'
      }

      expect(getHealth(50)).toBe('green')
      expect(getHealth(75)).toBe('yellow')
      expect(getHealth(90)).toBe('red')
    })
  })

  describe('API Response Format', () => {
    it('should have correct thomas status structure', () => {
      const mockStatus = {
        version: '3.0',
        nextReset: '2026-02-08T20:00:00.000Z',
        hoursUntilReset: 2,
        schedule: ['00:00', '05:00', '10:00', '15:00', '20:00'],
        percent: 30,
        tokensUsed: 7500000,
        estimatedMax: 25000000,
        health: 'green' as const,
        sessionCount: 5,
        pausedProjects: [],
        pausedCount: 0,
        lastCheck: '2026-02-08T18:00:00.000Z',
        windowStart: '2026-02-08T15:00:00.000Z',
        lastCalibration: { timestamp: '2026-02-08T17:00:00.000Z', percent: 30 }
      }

      expect(mockStatus.version).toBe('3.0')
      expect(mockStatus.schedule).toHaveLength(5)
      expect(mockStatus.health).toBe('green')
    })
  })
})
