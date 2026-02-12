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
import type { Agent } from '~/types/agent'

const props = defineProps<{
  agents: Agent[]
}>()

const stats = computed(() => {
  const totalAgents = props.agents.length
  const activeAgents = props.agents.filter(a => a.status === 'active').length
  const activePercentage = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0
  
  return {
    totalAgents,
    activeAgents,
    activePercentage
  }
})
</script>
