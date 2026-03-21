/**
 * GET /api/vault/search?q=sabrina
 * Full-text search across all vault files.
 */
import { searchVault } from '~/server/utils/vault-index'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  if (!q || q.length < 2) {
    return { results: [], query: q, totalResults: 0 }
  }

  try {
    const results = searchVault(q)
    return { results, query: q, totalResults: results.length }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Search failed: ${error.message}`,
    })
  }
})
