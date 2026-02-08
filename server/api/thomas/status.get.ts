/**
 * GET /api/thomas/status
 * 
 * Returns Thomas status: countdown + token consumption (v3 with sessions tracking)
 */

import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const STATE_PATH = join(homedir(), '.openclaw', 'thomas-state.json')
const ACTIVE_DIR = join(homedir(), '.openclaw', 'projects', 'active')
// Reset hours in Europe/Paris timezone
// Confirmed: 1h, 6h, 11h, 16h, 21h Paris
const RESET_HOURS = [1, 6, 11, 16, 21]

interface PausedProject {
  id: string
  name: string
  assignedAgent: string | null
  pausedAt: string
  resumeMessage: string | null
}

interface ThomasStatus {
  version: string
  // Time-based
  nextReset: string
  hoursUntilReset: number
  schedule: string[]
  // Token-based (from sessions tracking)
  percent: number
  tokensUsed: number
  estimatedMax: number
  health: 'green' | 'yellow' | 'red'
  sessionCount: number
  // Projects
  pausedProjects: PausedProject[]
  pausedCount: number
  // Meta
  lastCheck: string
  windowStart: string | null
  lastCalibration: { timestamp: string; percent: number } | null
}

function getNextReset(): Date {
  const now = new Date()
  
  // Get current hour in Paris timezone
  const parisFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hour12: false
  })
  const currentHour = parseInt(parisFormatter.format(now), 10)
  
  // Find next reset hour
  let nextHour = RESET_HOURS.find(h => h > currentHour)
  let daysToAdd = 0
  
  if (nextHour === undefined) {
    nextHour = RESET_HOURS[0]
    daysToAdd = 1
  }
  
  // Create date for next reset in Paris timezone
  const parisDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const [year, month, day] = parisDateFormatter.format(now).split('-').map(Number)
  
  // Create the reset time in UTC (Paris is UTC+1 in winter, UTC+2 in summer)
  // For simplicity, assume UTC+1 (CET)
  const resetDate = new Date(Date.UTC(year, month - 1, day + daysToAdd, nextHour - 1, 0, 0))
  
  return resetDate
}

function getHealth(percent: number): 'green' | 'yellow' | 'red' {
  if (percent >= 90) return 'red'
  if (percent >= 75) return 'yellow'
  return 'green'
}

async function getPausedProjects(): Promise<PausedProject[]> {
  const paused: PausedProject[] = []
  
  if (!existsSync(ACTIVE_DIR)) return paused
  
  try {
    const dirs = await readdir(ACTIVE_DIR, { withFileTypes: true })
    
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue
      
      const statusPath = join(ACTIVE_DIR, dir.name, 'status.json')
      if (!existsSync(statusPath)) continue
      
      try {
        const content = await readFile(statusPath, 'utf-8')
        const status = JSON.parse(content)
        
        if (status.status === 'paused' && status.pauseReason === 'quota') {
          paused.push({
            id: status.id || dir.name,
            name: status.name || dir.name,
            assignedAgent: status.assignedAgent || null,
            pausedAt: status.pausedAt || '',
            resumeMessage: status.resumeMessage || null
          })
        }
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // Directory read failed
  }
  
  return paused
}

function getSessionTokens(): { total: number; count: number } {
  try {
    const output = execSync('openclaw sessions list --json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000
    })
    
    const data = JSON.parse(output)
    const sessions = data.sessions || []
    
    const total = sessions.reduce((sum: number, s: any) => sum + (s.totalTokens || 0), 0)
    return { total, count: sessions.length }
  } catch {
    return { total: 0, count: 0 }
  }
}

export default defineEventHandler(async (): Promise<ThomasStatus> => {
  try {
    const nextReset = getNextReset()
    const now = new Date()
    const diffMs = nextReset.getTime() - now.getTime()
    const hoursUntilReset = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10
    
    const pausedProjects = await getPausedProjects()
    const sessionData = getSessionTokens()
    
    // Default values
    let percent = 0
    let tokensUsed = 0
    let estimatedMax = 50_000_000
    let lastCheck = new Date().toISOString()
    let windowStart: string | null = null
    let lastCalibration: { timestamp: string; percent: number } | null = null
    
    if (existsSync(STATE_PATH)) {
      try {
        const content = await readFile(STATE_PATH, 'utf-8')
        const state = JSON.parse(content)
        
        estimatedMax = state.estimatedMaxTokens || 50_000_000
        lastCheck = state.lastCheck || lastCheck
        windowStart = state.currentWindowStart || null
        
        // Calculate tokens this window
        if (state.lastSnapshot) {
          const snapshotTotal = state.lastSnapshot.totalTokens || 0
          tokensUsed = Math.max(0, sessionData.total - snapshotTotal)
          percent = estimatedMax > 0 
            ? Math.round((tokensUsed / estimatedMax) * 1000) / 10 
            : 0
        }
        
        // Get last calibration
        const calibrationHistory = state.calibrationHistory ?? []
        if (calibrationHistory.length > 0) {
          const last = calibrationHistory[calibrationHistory.length - 1]
          lastCalibration = {
            timestamp: last.timestamp,
            percent: last.realPercent
          }
        }
      } catch {
        // Ignore state read errors
      }
    }
    
    return {
      version: '3.0',
      // Time
      nextReset: nextReset.toISOString(),
      hoursUntilReset,
      schedule: RESET_HOURS.map(h => `${h.toString().padStart(2, '0')}:00`),
      // Tokens
      percent,
      tokensUsed,
      estimatedMax,
      health: getHealth(percent),
      sessionCount: sessionData.count,
      // Projects
      pausedProjects,
      pausedCount: pausedProjects.length,
      // Meta
      lastCheck,
      windowStart,
      lastCalibration
    }
  } catch (error: any) {
    console.error('[/api/thomas/status] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to read Thomas state',
      data: { error: error.message }
    })
  }
})
