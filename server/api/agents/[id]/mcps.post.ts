/**
 * POST /api/agents/:id/mcps
 * Assign an MCP to an agent + sync to Obsidian vault
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

  // Check MCP exists (auto-create if only referenced by name)
  let mcp = db.prepare('SELECT id FROM mcps WHERE id = ?').get(mcpId)
  if (!mcp) {
    db.prepare('INSERT OR IGNORE INTO mcps (id, name, status) VALUES (?, ?, ?)').run(mcpId, mcpId, 'active')
  }

  // Assign MCP
  db.prepare('INSERT OR IGNORE INTO agent_mcps (agent_id, mcp_id) VALUES (?, ?)').run(agentId, mcpId)

  // Sync to Obsidian vault
  try {
    syncAgentMcpsToVault(agentId)
  } catch (err) {
    console.error(`[agents/mcps] Vault sync failed for ${agentId}:`, err)
  }

  return { success: true, agentId, mcpId }
})
