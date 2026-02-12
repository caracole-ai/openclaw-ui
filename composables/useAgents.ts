import { ref, computed, onUnmounted } from 'vue'
import type { Agent, AgentTeam } from '~/types/agent'

// Singleton state — shared across all components
const agents = ref<Agent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false
let pollTimer: ReturnType<typeof setInterval> | null = null
let subscribers = 0

const POLL_INTERVAL = 10_000 // 10s

async function fetchAgents(filters?: { team?: AgentTeam; status?: string }) {
  // Only show loading on first fetch
  if (!fetched) loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams()
    if (filters?.team) params.set('team', filters.team)
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    const url = `/api/agents${qs ? `?${qs}` : ''}`
    const data = await $fetch<{ agents: Agent[] }>(url)
    agents.value = data.agents || []
    fetched = true
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement agents'
  } finally {
    loading.value = false
  }
}

function startPolling() {
  if (pollTimer || import.meta.server) return
  fetchAgents()
  pollTimer = setInterval(() => fetchAgents(), POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function useAgents() {
  const sortedAgents = computed(() =>
    [...agents.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  const agentsByTeam = computed(() => {
    const map: Record<string, Agent[]> = {}
    for (const agent of agents.value) {
      const team = agent.team || 'other'
      if (!map[team]) map[team] = []
      map[team].push(agent)
    }
    return map
  })

  function getAgent(id: string): Agent | undefined {
    return agents.value.find(a => a.id === id)
  }

  // Auto-manage polling lifecycle (client only)
  if (!import.meta.server) {
    subscribers++
    startPolling()

    onUnmounted(() => {
      subscribers--
      if (subscribers <= 0) {
        subscribers = 0
        stopPolling()
      }
    })
  }

  return { agents, sortedAgents, agentsByTeam, getAgent, fetchAgents, loading, error }
}
