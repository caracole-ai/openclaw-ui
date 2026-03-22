/**
 * GET /api/logs
 * Fetch Python logs with filters.
 * Query params: level, script, limit, offset, from, to, search
 */
import { getDb } from '~/server/utils/db'
import type { LogEntry } from '~/types/log'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { level, script, from, to, search } = query
  const limit = Math.min(Number(query.limit) || 100, 500)
  const offset = Number(query.offset) || 0

  const db = getDb()

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (level && level !== 'ALL') {
    where += ' AND level = ?'
    params.push(level)
  }

  if (script) {
    where += ' AND script = ?'
    params.push(script)
  }

  if (from) {
    where += ' AND created_at >= ?'
    params.push(from)
  }

  if (to) {
    where += ' AND created_at <= ?'
    params.push(to)
  }

  if (search) {
    where += ' AND message LIKE ?'
    params.push(`%${search}%`)
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM python_logs ${where}`).get(...params) as any)?.count || 0

  const logs = db.prepare(
    `SELECT * FROM python_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as LogEntry[]

  return { logs, total, limit, offset }
})
