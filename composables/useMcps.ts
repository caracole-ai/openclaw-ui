import { ref, computed } from 'vue'
import type { Mcp, McpsSource } from '~/types/mcp'

// Singleton state
const installed = ref<Mcp[]>([])
const assignments = ref<Record<string, string[]>>({})
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false

async function fetchMcps() {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<McpsSource>('/api/mcps')
    installed.value = data.installed || []
    assignments.value = data.assignments || {}
    fetched = true
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement MCPs'
  } finally {
    loading.value = false
  }
}

export function useMcps() {
  function getMcpsForAgent(agentId: string): Mcp[] {
    const mcpIds = assignments.value[agentId] || []
    return installed.value.filter(m => mcpIds.includes(m.id))
  }

  if (!import.meta.server && !fetched) {
    const { on } = useWebSocket()
    on('mcp:installed', () => fetchMcps())
    on('mcp:assigned', () => fetchMcps())
    on('mcp:unassigned', () => fetchMcps())
    on('data:updated', () => {
      console.log('[useMcps] Data updated via WebSocket, refreshing...')
      fetchMcps()
    })

    fetchMcps()
  }

  return { installed, assignments, getMcpsForAgent, fetchMcps, loading, error }
}
