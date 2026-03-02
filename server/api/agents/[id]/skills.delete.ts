/**
 * DELETE /api/agents/:id/skills
 * Remove a skill from an agent
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID requis' })
  }

  const body = await readBody(event)
  const { skillId } = body

  if (!skillId) {
    throw createError({ statusCode: 400, statusMessage: 'skillId requis' })
  }

  const db = getDb()

  // Check agent exists
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId)
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: `Agent '${agentId}' non trouvé' })
  }

  // Remove skill assignment
  db.prepare('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?').run(agentId, skillId)

  return { success: true, agentId, skillId }
})
