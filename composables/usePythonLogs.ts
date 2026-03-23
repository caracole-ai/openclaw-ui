import { ref } from 'vue'
import type { LogEntry, LogStats } from '~/types/log'
import type { BuildEvent } from '~/types/build-event'

// Singleton state
const logs = ref<LogEntry[]>([])
const stats = ref<LogStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const sourceFilter = ref<'all' | 'python' | 'build'>('all')
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
  source?: 'all' | 'python' | 'build'
}

/** Map a BuildEvent to a LogEntry for unified display */
function buildEventToLogEntry(ev: BuildEvent): LogEntry {
  return {
    id: ev.id,
    script: ev.toolName || ev.type,
    level: ev.isError ? 'ERROR' : 'INFO',
    message: ev.summary,
    function: ev.projectId,
    module: null,
    args: ev.command || ev.filePath || null,
    return_value: null,
    traceback: ev.errorText,
    created_at: ev.createdAt,
    source: 'build',
  }
}

async function fetchLogs(filters?: LogFilters) {
  loading.value = true
  error.value = null
  try {
    const qs = new URLSearchParams()
    const source = filters?.source || sourceFilter.value
    if (source !== 'all') qs.set('source', source)
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

    // Real-time: new Python log entries streamed via WS
    on('log:new', (entry: LogEntry) => {
      if (sourceFilter.value === 'build') return // skip python logs when filtering for build only
      const enriched = { ...entry, source: 'python' as const }
      logs.value = [enriched, ...logs.value].slice(0, MAX_LIVE_LOGS)
    })

    // Real-time: new build events streamed via WS
    on('build:event', (ev: BuildEvent) => {
      if (sourceFilter.value === 'python') return // skip build events when filtering for python only
      const logEntry = buildEventToLogEntry(ev)
      logs.value = [logEntry, ...logs.value].slice(0, MAX_LIVE_LOGS)
    })

    // Refresh stats on general data updates
    on('data:updated', () => {
      fetchStats()
    })

    fetchStats()
    fetchLogs({ limit: 100 })
    fetched = true
  }

  return { logs, stats, fetchLogs, fetchStats, loading, error, sourceFilter }
}
