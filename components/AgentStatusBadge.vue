<template>
  <span
    class="inline-flex items-center rounded-full font-medium"
    :class="[badgeClasses, sizeClasses]"
  >
    <span class="rounded-full" :class="[dotClasses, dotSizeClasses]"></span>
    <span v-if="size !== 'sm'">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentStatus } from '~/types/agent'

const props = withDefaults(defineProps<{
  status: AgentStatus
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

const sizeClasses = computed(() => {
  if (props.size === 'sm') {
    return 'px-1.5 py-0.5 text-[10px] gap-0'
  }
  return 'px-2.5 py-1 text-xs gap-1.5'
})

const dotSizeClasses = computed(() => {
  return 'w-2 h-2'
})

const badgeClasses = computed(() => {
  switch (props.status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'idle':
      return 'bg-yellow-100 text-yellow-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'offline':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'active':
      return 'bg-green-500 animate-pulse'
    case 'idle':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    case 'offline':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'active':
      return 'Actif'
    case 'idle':
      return 'Inactif'
    case 'error':
      return 'Erreur'
    case 'offline':
      return 'Hors ligne'
    default:
      return 'Inconnu'
  }
})
</script>
