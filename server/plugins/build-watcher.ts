// File watcher for Claude Code build logs.
// Watches AUTO-BUILD/{project}/build.log for new JSONL lines,
// parses them into BuildEvents, stores in DB, and broadcasts via WebSocket.
import { watch } from 'chokidar'
import { join, basename, dirname } from 'path'
import { readSync, openSync, closeSync, statSync, readdirSync, existsSync } from 'fs'
import { parseBuildLogLine } from '../utils/build-log-parser'
import { getDb } from '../utils/db'
import { broadcastWSEvent } from './source-watcher'

const HOME = process.env.HOME || ''
const AUTO_BUILD_DIR = join(HOME, 'Desktop/coding-projects/AUTO-BUILD')

// Track byte offset per log file
const offsets = new Map<string, number>()

// Debounce timers per file
const debounceTimers = new Map<string, NodeJS.Timeout>()
const DEBOUNCE_MS = 200

const insertStmt = `
  INSERT OR IGNORE INTO build_events
    (id, project_id, session_id, type, tool_name, summary, file_path, command,
     is_error, error_text, parent_tool_use_id, cost_usd, duration_ms, num_turns, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

function processNewLines(filePath: string, broadcast = true): number {
  const projectId = basename(dirname(filePath))

  let fileSize: number
  try {
    fileSize = statSync(filePath).size
  } catch {
    return 0
  }

  const lastOffset = offsets.get(filePath) || 0
  if (fileSize <= lastOffset) return 0

  let fd: number
  try {
    fd = openSync(filePath, 'r')
  } catch {
    return 0
  }

  const buffer = Buffer.alloc(fileSize - lastOffset)
  try {
    readSync(fd, buffer, 0, buffer.length, lastOffset)
  } finally {
    closeSync(fd)
  }

  offsets.set(filePath, fileSize)

  const chunk = buffer.toString('utf-8')
  const lines = chunk.split('\n').filter(l => l.trim())

  // Use file creation time as fallback for events without timestamp
  let fileFallback: string | undefined
  try {
    fileFallback = statSync(filePath).birthtime.toISOString()
  } catch {}

  const db = getDb()
  const insert = db.prepare(insertStmt)
  let count = 0

  for (const line of lines) {
    const ev = parseBuildLogLine(line, projectId, fileFallback)
    if (!ev) continue

    try {
      const result = insert.run(
        ev.id, ev.projectId, ev.sessionId, ev.type, ev.toolName,
        ev.summary, ev.filePath, ev.command,
        ev.isError ? 1 : 0, ev.errorText, ev.parentToolUseId,
        ev.costUsd, ev.durationMs, ev.numTurns, ev.createdAt
      )
      if (result.changes > 0) {
        count++
        if (broadcast) broadcastWSEvent('build:event', ev)
      }
    } catch (err) {
      console.error('[build-watcher] Insert error:', err)
    }
  }

  return count
}

// Log file patterns to watch (build, review, fix agents, validation fixes)
const LOG_PATTERNS = ['build.log', 'review.log', 'review-fix-round-*.log', 'fix-attempt-*.log']

// Scan existing logs on startup (synchronous, no chokidar dependency)
function processExistingLogs() {
  if (!existsSync(AUTO_BUILD_DIR)) return

  let total = 0
  try {
    const dirs = readdirSync(AUTO_BUILD_DIR, { withFileTypes: true })
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue
      const projectDir = join(AUTO_BUILD_DIR, dir.name)
      // Scan all matching log files
      const files = readdirSync(projectDir).filter(f =>
        f === 'build.log' || f === 'review.log' || f.startsWith('review-fix-round-') || f.startsWith('fix-attempt-')
      )
      for (const file of files) {
        const logPath = join(projectDir, file)
        const count = processNewLines(logPath, false) // don't broadcast on startup
        total += count
      }
    }
  } catch (err) {
    console.error('[build-watcher] Error scanning existing logs:', err)
  }

  if (total > 0) {
    console.log(`[build-watcher] Indexed ${total} events from existing logs`)
  }
}

function onFileChange(filePath: string) {
  const existing = debounceTimers.get(filePath)
  if (existing) clearTimeout(existing)

  debounceTimers.set(filePath, setTimeout(() => {
    debounceTimers.delete(filePath)
    processNewLines(filePath)
  }, DEBOUNCE_MS))
}

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV === 'production' || process.dev) {
    // 1. Process existing logs synchronously on startup
    processExistingLogs()

    // 2. Watch for new changes only (ignoreInitial: true)
    // Watch all Claude Code log files: build, review, fix agents
    const globPatterns = LOG_PATTERNS.map(p => join(AUTO_BUILD_DIR, '*', p))
    const watcher = watch(globPatterns, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    })

    watcher.on('add', (path) => {
      console.log(`[build-watcher] New build log detected: ${path}`)
      processNewLines(path)
    })

    watcher.on('change', (path) => {
      onFileChange(path)
    })

    watcher.on('error', (error) => {
      console.error('[build-watcher] Error:', error)
    })

    console.log(`[build-watcher] Watching for new build activity`)

    nitroApp.hooks.hook('close', () => {
      console.log('[build-watcher] Closing watcher')
      watcher.close()
      debounceTimers.forEach(t => clearTimeout(t))
    })
  }
})
