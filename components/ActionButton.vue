<template>
  <button
    @click="$emit('click')"
    class="relative overflow-hidden rounded-lg px-6 py-4 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
    :class="buttonClass"
  >
    <div class="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
    <span class="relative z-10">
      {{ icon }} {{ label }}
    </span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  icon: string
  label: string
  variant?: 'default' | 'success' | 'warning'
}>()

defineEmits(['click'])

const buttonClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/50'
    case 'warning':
      return 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/50'
    default:
      return 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-cyan-500/50'
  }
})
</script>
