/**
 * GET /api/skills
 * Source: SQLite
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler(() => {
  const db = getDb()

  const installed = db.prepare('SELECT * FROM skills ORDER BY name').all() as any[]
  const assignments = db.prepare('SELECT agent_id, skill_id FROM agent_skills').all() as any[]

  // Build assignments map
  const assignMap: Record<string, string[]> = {}
  for (const a of assignments) {
    if (!assignMap[a.agent_id]) assignMap[a.agent_id] = []
    assignMap[a.agent_id].push(a.skill_id)
  }

  return {
    installed: installed.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      version: s.version,
      source: s.source,
      path: s.path,
      manifest: s.manifest ? JSON.parse(s.manifest) : null,
      installedAt: s.installed_at,
      installedBy: s.installed_by,
      status: s.status,
    })),
    assignments: assignMap,
    timestamp: new Date().toISOString(),
  }
})
