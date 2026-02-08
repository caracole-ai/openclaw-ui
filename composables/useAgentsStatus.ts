/**
 * Composable pour récupérer le statut des agents
 * Polling toutes les 30s, gestion d'erreur, états de chargement
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { AgentStatus, AgentsStatusResponse } from '~/types/agents'

const POLL_INTERVAL_MS = 30_000
const API_ENDPOINT = '/api/agents/status'

export function useAgentsStatus() {
  const data = ref<AgentsStatusResponse | null>(null)
  const pending = ref(true)
  const error = ref<Error | null>(null)
  const lastRefresh = ref<Date | null>(null)
  
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    try {
      const response = await $fetch<AgentsStatusResponse>(API_ENDPOINT)
      data.value = response
      error.value = null
      lastRefresh.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Erreur de chargement')
      console.error('[useAgentsStatus] Fetch error:', e)
    } finally {
      pending.value = false
    }
  }

  function startPolling() {
    if (pollInterval) return
    pollInterval = setInterval(refresh, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  onMounted(async () => {
    await refresh()
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  // Computed helpers
  const agents = computed<AgentStatus[]>(() => data.value?.agents ?? [])
  
  const onlineAgents = computed(() => 
    agents.value.filter(a => a.status === 'online')
  )
  
  const idleAgents = computed(() => 
    agents.value.filter(a => a.status === 'idle')
  )
  
  const offlineAgents = computed(() => 
    agents.value.filter(a => a.status === 'offline')
  )

  // Agents triés : online first, puis idle, puis offline
  const sortedAgents = computed(() => {
    const statusOrder = { online: 0, idle: 1, offline: 2 }
    return [...agents.value].sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status]
      if (orderDiff !== 0) return orderDiff
      return a.name.localeCompare(b.name)
    })
  })

  // Temps depuis le dernier refresh (pour affichage "Mis à jour il y a Xs")
  const secondsSinceRefresh = computed(() => {
    if (!lastRefresh.value) return null
    return Math.floor((Date.now() - lastRefresh.value.getTime()) / 1000)
  })

  return {
    // État brut
    data,
    pending,
    error,
    lastRefresh,
    
    // Actions
    refresh,
    startPolling,
    stopPolling,
    
    // Computed
    agents,
    sortedAgents,
    onlineAgents,
    idleAgents,
    offlineAgents,
    secondsSinceRefresh,
  }
}
