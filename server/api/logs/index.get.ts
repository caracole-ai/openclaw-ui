/**
 * GET /api/logs
 * Fetch logs with filters. Supports source=python|build|all.
 * Query params: source, level, script, limit, offset, from, to, search
 */
import { getDb } from '~/server/utils/db'
import type { LogEntry } from '~/types/log'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { level, script, from, to, search } = query
  const source = (query.source as string) || 'all'
  const limit = Math.min(Number(query.limit) || 100, 500)
  const offset = Number(query.offset) || 0

  const db = getDb()

  // Build WHERE clause (shared across sources)
  let where = 'WHERE 1=1'
  const params: any[] = []

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

  if (source === 'python' || source === 'all') {
    // Python-specific filters
    var pythonWhere = where
    const pythonParams = [...params]
    if (level && level !== 'ALL') {
      pythonWhere += ' AND level = ?'
      pythonParams.push(level)
    }
    if (script) {
      pythonWhere += ' AND script = ?'
      pythonParams.push(script)
    }
    var pythonFilterParams = pythonParams
  }

  if (source === 'build' || source === 'all') {
    // Build-specific filters
    var buildWhere = where
    const buildParams = [...params]
    if (level && level !== 'ALL') {
      // Map level filter to build event logic
      if (level === 'ERROR') {
        buildWhere += ' AND is_error = 1'
      } else if (level === 'INFO') {
        buildWhere += ' AND is_error = 0'
      }
    }
    if (script) {
      // Script filter maps to tool_name for build events
      buildWhere += ' AND tool_name = ?'
      buildParams.push(script)
    }
    var buildFilterParams = buildParams
  }

  let logs: LogEntry[] = []
  let total = 0

  if (source === 'python') {
    total = (db.prepare(`SELECT COUNT(*) as count FROM python_logs ${pythonWhere!}`).get(...pythonFilterParams!) as any)?.count || 0
    logs = db.prepare(
      `SELECT *, 'python' as source FROM python_logs ${pythonWhere!} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...pythonFilterParams!, limit, offset) as LogEntry[]
  } else if (source === 'build') {
    total = (db.prepare(`SELECT COUNT(*) as count FROM build_events ${buildWhere!}`).get(...buildFilterParams!) as any)?.count || 0
    const rows = db.prepare(
      `SELECT id, COALESCE(tool_name, type) as script,
              CASE WHEN is_error THEN 'ERROR' ELSE 'INFO' END as level,
              summary as message,
              NULL as function, NULL as module, NULL as args, NULL as return_value,
              error_text as traceback,
              created_at,
              'build' as source
       FROM build_events ${buildWhere!} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...buildFilterParams!, limit, offset) as LogEntry[]
    logs = rows
  } else {
    // source === 'all' — UNION of both tables
    const unionSql = `
      SELECT * FROM (
        SELECT id, script, level, message, function, module, args, return_value, traceback, created_at, 'python' as source
        FROM python_logs ${pythonWhere!}
        UNION ALL
        SELECT id, COALESCE(tool_name, type) as script,
               CASE WHEN is_error THEN 'ERROR' ELSE 'INFO' END as level,
               summary as message,
               NULL as function, NULL as module, NULL as args, NULL as return_value,
               error_text as traceback,
               created_at,
               'build' as source
        FROM build_events ${buildWhere!}
      ) ORDER BY created_at DESC LIMIT ? OFFSET ?
    `
    const allParams = [...pythonFilterParams!, ...buildFilterParams!, limit, offset]
    logs = db.prepare(unionSql).all(...allParams) as LogEntry[]

    const countSql = `
      SELECT (SELECT COUNT(*) FROM python_logs ${pythonWhere!}) + (SELECT COUNT(*) FROM build_events ${buildWhere!}) as count
    `
    total = (db.prepare(countSql).get(...pythonFilterParams!, ...buildFilterParams!) as any)?.count || 0
  }

  return { logs, total, limit, offset }
})
