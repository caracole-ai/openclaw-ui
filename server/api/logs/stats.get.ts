/**
 * GET /api/logs/stats
 * Aggregate stats for Python logs KPI cards.
 */
import { getDb } from '~/server/utils/db'
import type { LogEntry, LogStats } from '~/types/log'

export default defineEventHandler(() => {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  // Count by level (today)
  const byLevelRows = db.prepare(
    'SELECT level, COUNT(*) as count FROM python_logs WHERE created_at >= ? GROUP BY level'
  ).all(today) as { level: string; count: number }[]

  const by_level: Record<string, number> = {}
  let total_today = 0
  let errors_today = 0
  let warnings_today = 0

  for (const row of byLevelRows) {
    by_level[row.level] = row.count
    total_today += row.count
    if (row.level === 'ERROR' || row.level === 'CRITICAL') errors_today += row.count
    if (row.level === 'WARNING') warnings_today += row.count
  }

  // Count by script (today)
  const byScriptRows = db.prepare(
    'SELECT script, COUNT(*) as count FROM python_logs WHERE created_at >= ? GROUP BY script ORDER BY count DESC'
  ).all(today) as { script: string; count: number }[]

  const by_script: Record<string, number> = {}
  for (const row of byScriptRows) {
    by_script[row.script] = row.count
  }

  // Active scripts (last hour)
  const active_scripts = db.prepare(
    "SELECT DISTINCT script FROM python_logs WHERE created_at >= datetime('now', '-1 hour')"
  ).all().map((r: any) => r.script) as string[]

  // Latest 5 errors
  const latest_errors = db.prepare(
    "SELECT * FROM python_logs WHERE level IN ('ERROR', 'CRITICAL') ORDER BY created_at DESC LIMIT 5"
  ).all() as LogEntry[]

  // Build events stats
  const build_events_today = (db.prepare(
    'SELECT COUNT(*) as count FROM build_events WHERE created_at >= ?'
  ).get(today) as any)?.count || 0

  const active_builds = db.prepare(`
    SELECT DISTINCT be.project_id FROM build_events be
    WHERE be.type = 'init'
      AND be.created_at >= datetime('now', '-2 hours')
      AND NOT EXISTS (
        SELECT 1 FROM build_events r
        WHERE r.project_id = be.project_id AND r.type = 'result' AND r.created_at > be.created_at
      )
  `).all().map((r: any) => r.project_id) as string[]

  return {
    total_today,
    errors_today,
    warnings_today,
    active_scripts,
    by_level,
    by_script,
    latest_errors,
    build_events_today,
    active_builds,
  }
})
