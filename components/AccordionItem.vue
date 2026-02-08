<template>
  <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-purple-500/30 overflow-hidden transition-all duration-300 hover:border-purple-400/50">
    <button
      @click="$emit('toggle')"
      class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
    >
      <div class="flex items-center space-x-3">
        <span class="text-3xl">{{ emoji }}</span>
        <span class="text-lg font-semibold text-white">{{ title }}</span>
      </div>
      <svg
        class="w-6 h-6 text-purple-300 transition-transform duration-300"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-screen opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="max-h-screen opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-show="isOpen" class="px-6 pb-6 text-purple-100">
        <div class="pt-4 border-t border-purple-500/20">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  emoji: string
  isOpen: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
