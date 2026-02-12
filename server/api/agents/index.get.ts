import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Agent, AgentsSource } from '~/types/agent'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const teamFilter = query.team as string | undefined
  const statusFilter = query.status as string | undefined

  try {
    const raw = await readFile(join(SOURCES_DIR, 'agents.json'), 'utf-8')
    const source: AgentsSource = JSON.parse(raw)

    let agents: Agent[] = source.agents || []

    if (teamFilter) {
      agents = agents.filter(a => a.team === teamFilter)
    }
    if (statusFilter) {
      agents = agents.filter(a => a.status === statusFilter)
    }

    return {
      agents,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { agents: [], timestamp: new Date().toISOString() }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture agents', data: { error: err.message } })
  }
})
