/**
 * Endpoint GET /api/thomas/history
 * 
 * Returns token usage history and calibration history from thomas-state.json
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface HistoryEntry {
  timestamp: string
  tokensUsed: number
  percentUsed: number
  blockId: string
}

interface CalibrationEntry {
  timestamp: string
  realPercent: number
  tokensAtCalibration: number
  newEstimate: number
  previousEstimate: number
}

interface ThomasHistory {
  usage: HistoryEntry[]
  calibrations: CalibrationEntry[]
  estimatedMaxTokens: number
  totalCalibrations: number
}

const STATE_PATH = join(homedir(), '.openclaw', 'thomas-state.json')

export default defineEventHandler(async (): Promise<ThomasHistory> => {
  try {
    if (!existsSync(STATE_PATH)) {
      return {
        usage: [],
        calibrations: [],
        estimatedMaxTokens: 50_000_000,
        totalCalibrations: 0
      }
    }

    const content = await readFile(STATE_PATH, 'utf-8')
    const state = JSON.parse(content)

    return {
      usage: state.history ?? [],
      calibrations: state.calibrationHistory ?? [],
      estimatedMaxTokens: state.estimatedMaxTokens ?? 50_000_000,
      totalCalibrations: (state.calibrationHistory ?? []).length
    }
  } catch (error: any) {
    console.error('[/api/thomas/history] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to read Thomas history',
      data: { error: error.message }
    })
  }
})
