/**
 * DELETE /api/agents/:id/mcps
 * Remove an MCP from an agent + sync to Obsidian vault
 */
import { getDb } from '~/server/utils/db'
import { syncAgentMcpsToVault } from '~/server/utils/vault'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID requis' })
  }

  const body = await readBody(event)
  const { mcpId } = body

  if (!mcpId) {
    throw createError({ statusCode: 400, statusMessage: 'mcpId requis' })
  }

  const db = getDb()

  // Check agent exists
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId)
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: `Agent '${agentId}' non trouvé` })
  }

  // Remove MCP assignment
  db.prepare('DELETE FROM agent_mcps WHERE agent_id = ? AND mcp_id = ?').run(agentId, mcpId)

  // Sync to Obsidian vault
  try {
    syncAgentMcpsToVault(agentId)
  } catch (err) {
    console.error(`[agents/mcps] Vault sync failed for ${agentId}:`, err)
  }

  return { success: true, agentId, mcpId }
})
