/**
 * GET /api/mcps
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler(() => {
  const db = getDb()

  const installed = db.prepare('SELECT * FROM mcps ORDER BY name').all() as any[]
  const assignments = db.prepare('SELECT agent_id, mcp_id FROM agent_mcps').all() as any[]

  // Build assignments map
  const assignMap: Record<string, string[]> = {}
  for (const a of assignments) {
    if (!assignMap[a.agent_id]) assignMap[a.agent_id] = []
    assignMap[a.agent_id].push(a.mcp_id)
  }

  return {
    installed: installed.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      version: m.version,
      source: m.source,
      path: m.path,
      config: m.config ? JSON.parse(m.config) : null,
      installedAt: m.installed_at,
      installedBy: m.installed_by,
      status: m.status,
    })),
    assignments: assignMap,
    timestamp: new Date().toISOString(),
  }
})
