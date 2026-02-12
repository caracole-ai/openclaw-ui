/**
 * GET /api/sources/:filename
 * Legacy compat — reads from SQLite and returns JSON-like structure
 */
import { getDb } from '~/server/utils/db'

const HANDLERS: Record<string, (db: any) => any> = {
  agents: (db) => ({ agents: db.prepare('SELECT * FROM agents').all() }),
  projects: (db) => ({ projects: db.prepare('SELECT * FROM projects').all() }),
  skills: (db) => ({ installed: db.prepare('SELECT * FROM skills').all() }),
  teams: (db) => {
    const rows = db.prepare('SELECT * FROM teams').all() as any[]
    const teams: Record<string, any> = {}
    for (const r of rows) teams[r.id] = r
    return { teams }
  },
  tokens: (db) => ({ usage: db.prepare('SELECT * FROM token_events ORDER BY created_at DESC LIMIT 100').all() }),
  events: (db) => ({ events: db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 100').all() }),
}

export default defineEventHandler((event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename || !HANDLERS[filename]) {
    throw createError({ statusCode: 400, statusMessage: `Source invalide. Autorisées: ${Object.keys(HANDLERS).join(', ')}` })
  }
  return HANDLERS[filename](getDb())
})
