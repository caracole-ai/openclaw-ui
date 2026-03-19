/**
 * GET /api/ideas/:id
 * Get idea detail including full body from vault file.
 */
import { getDb } from '~/server/utils/db'
import { serializeIdea } from '~/server/utils/serializers'
import { parseVaultFile } from '~/server/utils/vault'
import type { DbIdea } from '~/server/types/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea | undefined

  if (!idea) {
    throw createError({ statusCode: 404, statusMessage: 'Idea not found' })
  }

  const serialized = serializeIdea(idea)

  // Read full body from vault if available
  let body = ''
  if (idea.vault_path) {
    try {
      const file = parseVaultFile(idea.vault_path)
      body = file.body
    } catch {
      // Vault file may have been deleted
    }
  }

  return { ...serialized, body }
})
