<template>
  <div class="flex items-start space-x-4 animate-slide-in" :style="{ animationDelay: `${(number - 1) * 0.1}s` }">
    <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
      {{ number }}
    </div>
    <div class="flex-1 pt-2">
      <p class="text-purple-100">{{ text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  number: number
  text: string
}>()
</script>

<style scoped>
.animate-slide-in {
  animation: slideIn 0.5s ease-out backwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
