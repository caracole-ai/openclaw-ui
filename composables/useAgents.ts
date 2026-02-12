import { ref, computed } from 'vue'
import type { Agent, AgentTeam } from '~/types/agent'

// Singleton state — shared across all components
const agents = ref<Agent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false

async function fetchAgents(filters?: { team?: AgentTeam; status?: string }) {
  loading.value = true
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

export function useAgents() {
  const sortedAgents = computed(() =>
    [...agents.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  const agentsByTeam = computed(() => {
    const map: Record<string, Agent[]> = {}
    for (const agent of agents.value) {
      if (!map[agent.team]) map[agent.team] = []
      map[agent.team].push(agent)
    }
    return map
  })

  function getAgent(id: string): Agent | undefined {
    return agents.value.find(a => a.id === id)
  }

  // Listen for real-time updates (client only, once)
  if (!import.meta.server && !fetched) {
    const { on } = useWebSocket()
    on('agent:updated', (data: Partial<Agent> & { id: string }) => {
      const idx = agents.value.findIndex(a => a.id === data.id)
      if (idx !== -1) {
        agents.value[idx] = { ...agents.value[idx], ...data }
      }
    })
    on('agent:created', (data: Agent) => {
      agents.value.push(data)
    })

    // Initial fetch — once
    fetchAgents()
  }

  return { agents, sortedAgents, agentsByTeam, getAgent, fetchAgents, loading, error }
}
