import { ref, computed, onUnmounted } from 'vue'
import type { Idea, IdeaStatut, IdeaEnergie } from '~/types/idea'

// Singleton state
const ideas = ref<Idea[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false
let pollTimer: ReturnType<typeof setInterval> | null = null
let subscribers = 0
let wsListenerRegistered = false

const POLL_INTERVAL = 10_000

async function fetchIdeas(filters?: { statut?: IdeaStatut; energie?: IdeaEnergie }) {
  if (!fetched) loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams()
    if (filters?.statut) params.set('statut', filters.statut)
    if (filters?.energie) params.set('energie', filters.energie)

    const qs = params.toString()
    const url = qs ? `/api/ideas?${qs}` : '/api/ideas'

    const data = await $fetch<{ ideas: Idea[] }>(url)
    ideas.value = data.ideas || []
    fetched = true
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement idées'
  } finally {
    loading.value = false
  }
}

function startPolling() {
  if (pollTimer || import.meta.server) return
  fetchIdeas()
  pollTimer = setInterval(() => fetchIdeas(), POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function useIdeas() {
  function getIdea(id: string): Idea | undefined {
    return ideas.value.find(i => i.id === id)
  }

  const ideasByStatut = computed(() => {
    const map: Record<IdeaStatut, Idea[]> = {
      'a-explorer': [],
      'en-revue': [],
      'approuvee': [],
      'rejetee': [],
      'promue': [],
    }
    for (const idea of ideas.value) {
      if (map[idea.statut]) {
        map[idea.statut].push(idea)
      }
    }
    return map
  })

  const scoredIdeas = computed(() => {
    return [...ideas.value]
      .filter(i => i.statut !== 'rejetee' && i.statut !== 'promue')
      .sort((a, b) => {
        const scoreA = a.scoreRealisme + a.scoreImpact - a.scoreEffort
        const scoreB = b.scoreRealisme + b.scoreImpact - b.scoreEffort
        return scoreB - scoreA
      })
  })

  // Auto-manage polling lifecycle (client only)
  if (!import.meta.server) {
    subscribers++
    startPolling()

    if (!wsListenerRegistered) {
      wsListenerRegistered = true
      const { on } = useWebSocket()
      on('data:updated', () => {
        fetchIdeas()
      })
    }

    onUnmounted(() => {
      subscribers--
      if (subscribers <= 0) {
        subscribers = 0
        stopPolling()
      }
    })
  }

  return { ideas, ideasByStatut, scoredIdeas, getIdea, fetchIdeas, loading, error }
}
