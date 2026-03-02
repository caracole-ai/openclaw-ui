/**
 * POST /api/agents/:id/skills
 * Assign a skill to an agent
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
    throw createError({ statusCode: 404, statusMessage: `Agent '${agentId}' non trouvé` })
  }

  // Check skill exists
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId)
  if (!skill) {
    throw createError({ statusCode: 404, statusMessage: `Skill '${skillId}' non trouvé` })
  }

  // Assign skill (INSERT OR IGNORE to avoid duplicates)
  db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run(agentId, skillId)

  return { success: true, agentId, skillId }
})
