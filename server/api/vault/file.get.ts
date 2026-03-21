/**
 * GET /api/vault/file?path=Agents/code/sabrina/SOUL.md
 * Returns a single vault file with parsed content, resolved links, and backlinks.
 */
import { join, normalize } from 'path'
import {
  getVaultIndex,
  resolveOutgoingLinks,
  getBacklinkEntries,
  computeRelatedFiles,
} from '~/server/utils/vault-index'
import { renderVaultMarkdown } from '~/server/utils/vault-renderer'
import { vaultConfig } from '~/server/utils/vault'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const path = query.path as string

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required query param: path' })
  }

  // Security: prevent path traversal
  const normalized = normalize(path).replace(/^(\.\.(\/|\\|$))+/, '')
  if (normalized !== path || path.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  // Verify path is within vault
  const absolutePath = join(vaultConfig.basePath, normalized)
  if (!absolutePath.startsWith(vaultConfig.basePath)) {
    throw createError({ statusCode: 403, statusMessage: 'Path outside vault' })
  }

  const index = getVaultIndex()
  const entry = index.entries.get(normalized)

  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: `File not found: ${normalized}` })
  }

  try {
    const html = renderVaultMarkdown(entry.body)
    const outgoingLinks = resolveOutgoingLinks(entry)
    const backlinks = getBacklinkEntries(entry)
    const relatedFiles = computeRelatedFiles(entry)

    return {
      relativePath: entry.relativePath,
      displayName: entry.displayName,
      emoji: entry.emoji,
      fileType: entry.fileType,
      category: entry.category,
      frontmatter: entry.frontmatter,
      html,
      outgoingLinks,
      backlinks,
      relatedFiles,
      modifiedAt: entry.modifiedAt,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to render file: ${error.message}`,
    })
  }
})
