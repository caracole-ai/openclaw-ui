<template>
  <div 
    class="bg-slate-800/50 backdrop-blur-sm border rounded-xl p-6 hover:scale-105 hover:border-opacity-100 transition-all duration-300 cursor-pointer"
    :class="borderClass"
  >
    <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
      {{ title }}
    </h4>
    <div 
      class="text-4xl font-black bg-clip-text text-transparent"
      :class="gradientClass"
    >
      {{ value }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  value: string | number
  color?: 'cyan' | 'purple' | 'pink' | 'green'
}>()

const borderClass = computed(() => {
  switch (props.color) {
    case 'cyan': return 'border-cyan-500/30 hover:border-cyan-500'
    case 'purple': return 'border-purple-500/30 hover:border-purple-500'
    case 'pink': return 'border-pink-500/30 hover:border-pink-500'
    case 'green': return 'border-green-500/30 hover:border-green-500'
    default: return 'border-gray-500/30 hover:border-gray-500'
  }
})

const gradientClass = computed(() => {
  switch (props.color) {
    case 'cyan': return 'bg-gradient-to-r from-cyan-400 to-cyan-600'
    case 'purple': return 'bg-gradient-to-r from-purple-400 to-purple-600'
    case 'pink': return 'bg-gradient-to-r from-pink-400 to-pink-600'
    case 'green': return 'bg-gradient-to-r from-green-400 to-green-600'
    default: return 'bg-gradient-to-r from-gray-400 to-gray-600'
  }
})
</script>
