/**
 * GET /api/projects/:id/build-events
 * Returns structured build events for the project timeline.
 * Supports ?since=ISO_TIMESTAMP for incremental polling.
 * Supports ?limit=N (default 300).
 */
import { getDb } from '~/server/utils/db'
import type { DbBuildEvent } from '~/server/types/db'
import type { BuildEvent } from '~/types/build-event'

function serialize(row: DbBuildEvent): BuildEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    type: row.type as BuildEvent['type'],
    toolName: row.tool_name,
    summary: row.summary,
    filePath: row.file_path,
    command: row.command,
    isError: row.is_error === 1,
    errorText: row.error_text,
    parentToolUseId: row.parent_tool_use_id,
    costUsd: row.cost_usd,
    durationMs: row.duration_ms,
    numTurns: row.num_turns,
    createdAt: row.created_at,
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const query = getQuery(event)
  const since = query.since as string | undefined
  const limit = Math.min(Number(query.limit) || 300, 1000)

  const db = getDb()

  let sql = 'SELECT * FROM build_events WHERE project_id = ?'
  const params: any[] = [id]

  if (since) {
    sql += ' AND created_at > ?'
    params.push(since)
  }

  sql += ' ORDER BY created_at ASC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(sql).all(...params) as DbBuildEvent[]
  const events = rows.map(serialize)

  const total = (db.prepare('SELECT COUNT(*) as count FROM build_events WHERE project_id = ?').get(id) as any)?.count || 0

  // Check if build is still running
  let building = false
  try {
    const { getBuildStatus } = await import('~/server/utils/build-launcher')
    building = getBuildStatus(id).running
  } catch {}

  let reviewing = false
  try {
    const { getReviewStatus } = await import('~/server/utils/review-launcher')
    reviewing = getReviewStatus(id).running
  } catch {}

  return { events, total, building, reviewing }
})
