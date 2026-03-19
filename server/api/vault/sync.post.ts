/**
 * POST /api/vault/sync
 * Force a full sync from vault to DB.
 */
import { syncVaultToDb } from '~/server/utils/vault'

export default defineEventHandler(() => {
  try {
    syncVaultToDb()
    return { status: 'success', timestamp: new Date().toISOString() }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Vault sync failed: ${error.message}`,
    })
  }
})
