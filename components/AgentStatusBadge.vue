<template>
  <span 
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
    :class="badgeClasses"
  >
    <span class="w-2 h-2 rounded-full" :class="dotClasses"></span>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentStatusType } from '~/types/agents'

const props = defineProps<{
  status: AgentStatusType
}>()

const badgeClasses = computed(() => {
  switch (props.status) {
    case 'online':
      return 'bg-green-100 text-green-800'
    case 'idle':
      return 'bg-yellow-100 text-yellow-800'
    case 'offline':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'online':
      return 'bg-green-500 animate-pulse'
    case 'idle':
      return 'bg-yellow-500'
    case 'offline':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'online':
      return 'En ligne'
    case 'idle':
      return 'Inactif'
    case 'offline':
      return 'Hors ligne'
    default:
      return 'Inconnu'
  }
})
</script>
