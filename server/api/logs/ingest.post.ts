/**
 * POST /api/logs/ingest
 * Receives Python log entries (single or batch).
 * Source: openclaw_logger HTTP sink.
 */
import { getDb } from '~/server/utils/db'
import { broadcastWSEvent } from '~/server/plugins/source-watcher'

let ingestCount = 0

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Accept batch { entries: [...] } or single entry
  const entries: any[] = Array.isArray(body.entries) ? body.entries : [body]

  if (!entries.length) {
    throw createError({ statusCode: 400, statusMessage: 'No log entries provided' })
  }

  const db = getDb()

  const insert = db.prepare(`
    INSERT OR IGNORE INTO python_logs (id, script, level, message, function, module, args, return_value, traceback, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((items: any[]) => {
    for (const e of items) {
      if (!e.script || !e.level || !e.message) continue

      const id = e.id || `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
      const now = e.created_at || new Date().toISOString()

      insert.run(
        id,
        e.script,
        e.level,
        e.message,
        e.function || null,
        e.module || null,
        e.args || null,
        e.return_value || null,
        e.traceback || null,
        now,
      )

      // Broadcast each entry for real-time streaming
      broadcastWSEvent('log:new', {
        id,
        script: e.script,
        level: e.level,
        message: e.message,
        function: e.function || null,
        module: e.module || null,
        args: e.args || null,
        return_value: e.return_value || null,
        traceback: e.traceback || null,
        created_at: now,
      })
    }
  })

  insertMany(entries)

  // Auto-cleanup: every ~10 ingests, purge old entries
  ingestCount++
  if (ingestCount % 10 === 0) {
    try {
      db.prepare("DELETE FROM python_logs WHERE created_at < datetime('now', '-7 days')").run()
    } catch {}
  }

  return { inserted: entries.length }
})
