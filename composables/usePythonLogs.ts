import { ref } from 'vue'
import type { LogEntry, LogStats } from '~/types/log'

// Singleton state
const logs = ref<LogEntry[]>([])
const stats = ref<LogStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false

const MAX_LIVE_LOGS = 500

interface LogFilters {
  level?: string
  script?: string
  limit?: number
  offset?: number
  search?: string
  from?: string
  to?: string
}

async function fetchLogs(filters?: LogFilters) {
  loading.value = true
  error.value = null
  try {
    const qs = new URLSearchParams()
    if (filters?.level && filters.level !== 'ALL') qs.set('level', filters.level)
    if (filters?.script) qs.set('script', filters.script)
    if (filters?.limit) qs.set('limit', String(filters.limit))
    if (filters?.offset) qs.set('offset', String(filters.offset))
    if (filters?.search) qs.set('search', filters.search)
    if (filters?.from) qs.set('from', filters.from)
    if (filters?.to) qs.set('to', filters.to)
    const q = qs.toString()
    const data = await $fetch<{ logs: LogEntry[]; total: number }>(`/api/logs${q ? `?${q}` : ''}`)
    logs.value = data.logs || []
    return data
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement logs'
    return null
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    stats.value = await $fetch<LogStats>('/api/logs/stats')
  } catch {}
}

export function usePythonLogs() {
  if (!import.meta.server && !fetched) {
    const { on } = useWebSocket()

    // Real-time: new log entries streamed via WS
    on('log:new', (entry: LogEntry) => {
      logs.value = [entry, ...logs.value].slice(0, MAX_LIVE_LOGS)
    })

    // Refresh stats on general data updates
    on('data:updated', () => {
      fetchStats()
    })

    fetchStats()
    fetchLogs({ limit: 100 })
    fetched = true
  }

  return { logs, stats, fetchLogs, fetchStats, loading, error }
}
