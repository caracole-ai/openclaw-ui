/**
 * GET /api/ideas
 * List all ideas with optional filters (statut, energie, themes).
 */
import { getDb } from '~/server/utils/db'
import { serializeIdea } from '~/server/utils/serializers'
import type { DbIdea } from '~/server/types/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const db = getDb()

  let sql = 'SELECT * FROM ideas'
  const conditions: string[] = []
  const params: any[] = []

  if (query.statut) {
    conditions.push('statut = ?')
    params.push(query.statut)
  }

  if (query.energie) {
    conditions.push('energie = ?')
    params.push(query.energie)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY date DESC'

  const ideas = db.prepare(sql).all(...params) as DbIdea[]

  return {
    ideas: ideas.map(serializeIdea),
    total: ideas.length,
  }
})
