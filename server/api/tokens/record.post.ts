/**
 * POST /api/tokens/record
 * Records a token usage event. Source: SQLite.
 */
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { agentId, tokens, projectId, skillId, model, action, sessionId } = body

  if (!agentId || !tokens) throw createError({ statusCode: 400, statusMessage: 'agentId et tokens requis' })

  const totalTokens = typeof tokens === 'number' ? tokens : tokens.total || 0
  const inputTokens = tokens.input || Math.round(totalTokens * 0.6)
  const outputTokens = tokens.output || (totalTokens - inputTokens)

  // Cost estimation (opus: $15/M input, $75/M output)
  const inputCost = inputTokens * 15 / 1_000_000
  const outputCost = outputTokens * 75 / 1_000_000
  const totalCost = Math.round((inputCost + outputCost) * 10000) / 10000

  const id = `evt-${Date.now()}-${agentId}`
  const now = new Date().toISOString()

  const db = getDb()
  db.prepare(`
    INSERT INTO token_events (id, agent_id, project_id, skill_id, session_id, model, input_tokens, output_tokens, total_tokens, input_cost, output_cost, total_cost, action, trigger_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, agentId, projectId || null, skillId || null, sessionId || null,
    model || 'anthropic/claude-opus-4-6', inputTokens, outputTokens, totalTokens,
    Math.round(inputCost * 10000) / 10000, Math.round(outputCost * 10000) / 10000, totalCost,
    action || 'task', 'api', now)

  return {
    id, timestamp: now, agentId, totalTokens, totalCost,
  }
})
