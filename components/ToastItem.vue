<template>
  <div
    class="rounded-lg shadow-lg p-4 cursor-pointer border"
    :class="containerClasses"
    role="alert"
    @click="$emit('dismiss', toast.id)"
  >
    <div class="flex items-start gap-3">
      <span class="text-lg shrink-0" aria-hidden="true">{{ icon }}</span>
      <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
      <button
        class="text-gray-400 hover:text-gray-600 shrink-0 leading-none text-lg"
        aria-label="Fermer la notification"
        @click.stop="$emit('dismiss', toast.id)"
      >
        &times;
      </button>
    </div>
    <div class="mt-3 h-0.5 rounded-full overflow-hidden bg-black/5">
      <div
        class="h-full rounded-full"
        :class="progressBarColor"
        :style="{ animation: 'toast-progress 5s linear forwards' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Toast } from '~/composables/useToast'

const props = defineProps<{
  toast: Toast
}>()

defineEmits<{
  dismiss: [id: string]
}>()

const containerClasses = computed(() => {
  const styles: Record<string, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    realtime: 'bg-purple-50 border-purple-200 text-purple-800',
  }
  return styles[props.toast.type] ?? styles.info
})

const icon = computed(() => {
  const icons: Record<string, string> = {
    success: '\u2705',
    error: '\u274C',
    info: '\u2139\uFE0F',
    warning: '\u26A0\uFE0F',
    realtime: '\uD83D\uDD04',
  }
  return icons[props.toast.type] ?? icons.info
})

const progressBarColor = computed(() => {
  const colors: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-orange-500',
    realtime: 'bg-purple-500',
  }
  return colors[props.toast.type] ?? colors.info
})
</script>

<style scoped>
@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
