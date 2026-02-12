import { readFile } from 'fs/promises'
import { join } from 'path'
import type { TokensSource, TokenEvent } from '~/types/token'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const from = query.from as string | undefined
  const to = query.to as string | undefined
  const groupBy = (query.groupBy as string) || 'day'
  const agentFilter = query.agent as string | undefined

  try {
    const raw = await readFile(join(SOURCES_DIR, 'tokens.json'), 'utf-8')
    const source: TokensSource = JSON.parse(raw)

    let events: TokenEvent[] = source.usage || []

    if (from) events = events.filter(e => e.timestamp >= from)
    if (to) events = events.filter(e => e.timestamp <= to)
    if (agentFilter) events = events.filter(e => e.agentId === agentFilter)

    // Group by period
    const grouped: Record<string, { tokens: number; cost: number; count: number }> = {}

    for (const evt of events) {
      let key: string
      const d = evt.timestamp.split('T')[0]
      if (groupBy === 'hour') {
        key = evt.timestamp.slice(0, 13)
      } else if (groupBy === 'week') {
        const date = new Date(evt.timestamp)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (groupBy === 'month') {
        key = d.slice(0, 7)
      } else {
        key = d
      }

      if (!grouped[key]) grouped[key] = { tokens: 0, cost: 0, count: 0 }
      grouped[key].tokens += evt.tokens.total
      grouped[key].cost += evt.cost.total
      grouped[key].count++
    }

    const timeline = Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, data]) => ({ period, ...data }))

    return { timeline, groupBy, totalEvents: events.length, timestamp: new Date().toISOString() }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { timeline: [], groupBy, totalEvents: 0, timestamp: new Date().toISOString() }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture tokens', data: { error: err.message } })
  }
})
