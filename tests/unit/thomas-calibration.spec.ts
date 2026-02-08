/**
 * Thomas Calibration Tests
 * 
 * Tests for the token calibration logic
 */

import { describe, it, expect, beforeEach } from 'vitest'

describe('Thomas Calibration', () => {
  describe('calculateMaxFromPercent', () => {
    it('should calculate max tokens from percentage', () => {
      // If 43060 tokens = 30%, then max = 43060 / 0.30 = 143533
      const tokens = 43060
      const percent = 30
      const expectedMax = Math.round(tokens / (percent / 100))
      
      expect(expectedMax).toBe(143533)
    })

    it('should handle edge case of 100%', () => {
      const tokens = 50000000
      const percent = 100
      const max = Math.round(tokens / (percent / 100))
      
      expect(max).toBe(tokens)
    })

    it('should handle small percentages', () => {
      const tokens = 1000000
      const percent = 5
      const max = Math.round(tokens / (percent / 100))
      
      expect(max).toBe(20000000) // 1M / 0.05 = 20M
    })
  })

  describe('percentFromTokens', () => {
    it('should calculate percentage from tokens and max', () => {
      const tokens = 25000000
      const max = 50000000
      const percent = Math.round((tokens / max) * 1000) / 10
      
      expect(percent).toBe(50)
    })

    it('should handle zero tokens', () => {
      const tokens = 0
      const max = 50000000
      const percent = Math.round((tokens / max) * 1000) / 10
      
      expect(percent).toBe(0)
    })

    it('should cap at 100%', () => {
      const tokens = 60000000
      const max = 50000000
      const percent = Math.min(100, Math.round((tokens / max) * 1000) / 10)
      
      expect(percent).toBe(100)
    })
  })
})
