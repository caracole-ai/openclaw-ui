/**
 * GET /api/vault/tree
 * Returns the hierarchical tree structure of all vault files.
 */
import { buildTree, getVaultIndex } from '~/server/utils/vault-index'

export default defineEventHandler(() => {
  try {
    const tree = buildTree()
    const { totalFiles, builtAt } = getVaultIndex()
    return { tree, totalFiles, builtAt }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to build vault tree: ${error.message}`,
    })
  }
})
