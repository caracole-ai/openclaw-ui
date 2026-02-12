import { ref } from 'vue'
import type { TokenSummary, TimelinePoint } from '~/types/token'

// Singleton state
const summary = ref<TokenSummary | null>(null)
const timeline = ref<TimelinePoint[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false

async function fetchSummary() {
  loading.value = true
  error.value = null
  try {
    summary.value = await $fetch<TokenSummary>('/api/tokens/summary')
    fetched = true
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement tokens'
  } finally {
    loading.value = false
  }
}

async function fetchTimeline(params?: { from?: string; to?: string; groupBy?: string; agent?: string }) {
  try {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.groupBy) qs.set('groupBy', params.groupBy)
    if (params?.agent) qs.set('agent', params.agent)
    const q = qs.toString()
    const data = await $fetch<{ timeline: TimelinePoint[] }>(`/api/tokens/timeline${q ? `?${q}` : ''}`)
    timeline.value = data.timeline || []
  } catch {}
}

export function useTokens() {
  if (!import.meta.server && !fetched) {
    fetchSummary()
  }

  return { summary, timeline, fetchSummary, fetchTimeline, loading, error }
}
