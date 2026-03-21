/**
 * DELETE /api/ideas/:id
 * Deletes idea from DB and removes vault file from Obsidian
 */
import { getDb } from '~/server/utils/db'
import { existsSync, unlinkSync } from 'node:fs'
import type { DbIdea } from '~/server/types/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Idea ID requis' })
  }

  const db = getDb()

  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea | undefined
  if (!idea) {
    throw createError({ statusCode: 404, statusMessage: `Idée '${id}' non trouvée` })
  }

  try {
    // Delete from DB
    db.prepare('DELETE FROM ideas WHERE id = ?').run(id)

    // Log event
    db.prepare(
      "INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).run(
      `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      'idea:deleted',
      'dashboard',
      JSON.stringify({ ideaId: id, titre: idea.titre })
    )

    // Delete vault file if it exists
    if (idea.vault_path && existsSync(idea.vault_path)) {
      try {
        unlinkSync(idea.vault_path)
        console.log(`[delete] Removed vault file: ${idea.vault_path}`)
      } catch (err) {
        console.error(`[delete] Failed to remove vault file ${idea.vault_path}:`, err)
      }
    }

    return { success: true, deleted: id }
  } catch (err: any) {
    console.error(`[delete] Error deleting idea ${id}:`, err)
    throw createError({
      statusCode: 500,
      statusMessage: `Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`,
    })
  }
})
