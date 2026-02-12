import { readFile } from 'fs/promises'
import { join } from 'path'
import type { TokensSource } from '~/types/token'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async () => {
  try {
    const raw = await readFile(join(SOURCES_DIR, 'tokens.json'), 'utf-8')
    const source: TokensSource = JSON.parse(raw)

    // Compute current aggregates from usage if aggregates not pre-computed
    const today = new Date().toISOString().split('T')[0]
    const dailyAgg = source.aggregates?.daily?.[today]

    // Top agents by cost
    const agentTotals: Record<string, { tokens: number; cost: number }> = {}
    for (const evt of source.usage || []) {
      if (!agentTotals[evt.agentId]) agentTotals[evt.agentId] = { tokens: 0, cost: 0 }
      agentTotals[evt.agentId].tokens += evt.tokens.total
      agentTotals[evt.agentId].cost += evt.cost.total
    }

    const topAgents = Object.entries(agentTotals)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([id, data]) => ({ agentId: id, ...data }))

    // Top projects
    const projectTotals: Record<string, { tokens: number; cost: number }> = {}
    for (const evt of source.usage || []) {
      if (!evt.projectId) continue
      if (!projectTotals[evt.projectId]) projectTotals[evt.projectId] = { tokens: 0, cost: 0 }
      projectTotals[evt.projectId].tokens += evt.tokens.total
      projectTotals[evt.projectId].cost += evt.cost.total
    }

    const topProjects = Object.entries(projectTotals)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([id, data]) => ({ projectId: id, ...data }))

    return {
      tracking: source.tracking,
      aggregates: source.aggregates,
      todayAggregate: dailyAgg || null,
      topAgents,
      topProjects,
      totalUsage: source.usage?.length || 0,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { tracking: null, aggregates: {}, todayAggregate: null, topAgents: [], topProjects: [], totalUsage: 0, timestamp: new Date().toISOString() }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture tokens', data: { error: err.message } })
  }
})
