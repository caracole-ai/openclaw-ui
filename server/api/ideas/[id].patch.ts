/**
 * PATCH /api/ideas/:id
 * Update idea (statut, scores, etc.) — writes to vault file then DB.
 */
import { getDb } from '~/server/utils/db'
import { serializeIdea } from '~/server/utils/serializers'
import { updateVaultFrontmatter } from '~/server/utils/vault'
import type { DbIdea } from '~/server/types/db'

const ALLOWED_FIELDS = ['statut', 'energie', 'score_realisme', 'score_effort', 'score_impact', 'reviewed_at', 'projet_lie'] as const

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea | undefined
  if (!idea) {
    throw createError({ statusCode: 404, statusMessage: 'Idea not found' })
  }

  // Build SET clause from allowed fields
  const sets: string[] = []
  const params: any[] = []
  const vaultChanges: Record<string, any> = {}

  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`)
      params.push(body[field])
      vaultChanges[field] = body[field]
    }
  }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  sets.push("updated_at = datetime('now')")
  params.push(id)

  // Update DB
  db.prepare(`UPDATE ideas SET ${sets.join(', ')} WHERE id = ?`).run(...params)

  // Update vault file
  if (idea.vault_path) {
    try {
      updateVaultFrontmatter(idea.vault_path, vaultChanges)
    } catch (err) {
      console.error(`[ideas] Failed to update vault file: ${idea.vault_path}`, err)
    }
  }

  const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea
  return serializeIdea(updated)
})
