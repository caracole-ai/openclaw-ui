/**
 * POST /api/tokens/record
 * Enregistre un event de consommation token
 * Body: { agentId, tokens, projectId?, model?, action? }
 */
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const TOKENS_FILE = join(process.env.HOME || '', '.openclaw/sources/tokens.json')

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { agentId, tokens, projectId, skillId, model, action, sessionId } = body

  if (!agentId || !tokens) {
    throw createError({ statusCode: 400, statusMessage: 'agentId et tokens requis' })
  }

  const totalTokens = typeof tokens === 'number' ? tokens : tokens.total || 0
  const inputTokens = tokens.input || Math.round(totalTokens * 0.6)
  const outputTokens = tokens.output || (totalTokens - inputTokens)

  // Cost estimation (opus: $15/M input, $75/M output)
  const inputCost = inputTokens * 15 / 1_000_000
  const outputCost = outputTokens * 75 / 1_000_000

  const now = new Date().toISOString()
  const today = now.split('T')[0]

  const newEvent = {
    id: `evt-${Date.now()}-${agentId}`,
    timestamp: now,
    agentId,
    projectId: projectId || null,
    skillId: skillId || null,
    sessionId: sessionId || null,
    model: model || 'anthropic/claude-opus-4-6',
    tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
    cost: {
      input: Math.round(inputCost * 10000) / 10000,
      output: Math.round(outputCost * 10000) / 10000,
      total: Math.round((inputCost + outputCost) * 10000) / 10000
    },
    context: { action: action || 'task', trigger: 'api' }
  }

  try {
    const raw = await readFile(TOKENS_FILE, 'utf-8')
    const data = JSON.parse(raw)

    data.usage.push(newEvent)

    // Update daily aggregate
    if (!data.aggregates.daily[today]) {
      data.aggregates.daily[today] = { totalTokens: 0, totalCost: 0, byAgent: {} }
    }
    const daily = data.aggregates.daily[today]
    daily.totalTokens += totalTokens
    daily.totalCost = Math.round((daily.totalCost + newEvent.cost.total) * 10000) / 10000
    if (!daily.byAgent[agentId]) daily.byAgent[agentId] = { tokens: 0, cost: 0 }
    daily.byAgent[agentId].tokens += totalTokens
    daily.byAgent[agentId].cost = Math.round((daily.byAgent[agentId].cost + newEvent.cost.total) * 10000) / 10000

    // Update by project if provided
    if (projectId) {
      if (!daily.byProject) daily.byProject = {}
      if (!daily.byProject[projectId]) daily.byProject[projectId] = { tokens: 0, cost: 0 }
      daily.byProject[projectId].tokens += totalTokens
      daily.byProject[projectId].cost = Math.round((daily.byProject[projectId].cost + newEvent.cost.total) * 10000) / 10000
    }

    await writeFile(TOKENS_FILE, JSON.stringify(data, null, 2))
    return newEvent
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur enregistrement tokens' })
  }
})
