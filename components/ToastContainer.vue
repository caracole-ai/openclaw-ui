<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 w-80 max-w-sm"
      aria-live="polite"
      aria-label="Notifications"
    >
      <TransitionGroup name="toast">
        <ToastItem
          v-for="toast in toasts"
          :key="toast.id"
          :toast="toast"
          @dismiss="remove"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
