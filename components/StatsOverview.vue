<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <StatCard
      title="Total Agents"
      :value="stats.totalAgents"
      icon="👥"
      color="blue"
    />
    <StatCard
      title="Agents Actifs"
      :value="stats.activeAgents"
      icon="⚡"
      color="green"
      :subtitle="`${stats.activePercentage}% du total`"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentStatus } from '~/types/agents'

const props = defineProps<{
  agents: AgentStatus[]
}>()

const stats = computed(() => {
  const totalAgents = props.agents.length
  // Use real status values: online = active
  const activeAgents = props.agents.filter(a => a.status === 'online').length
  const activePercentage = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0
  
  return {
    totalAgents,
    activeAgents,
    activePercentage
  }
})
</script>
