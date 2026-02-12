<template>
  <!-- Card variant -->
  <div
    v-if="variant === 'card'"
    class="bg-white rounded-xl shadow-sm border p-6 space-y-3 animate-pulse"
  >
    <div class="h-4 bg-gray-200 rounded w-3/4" />
    <div class="h-3 bg-gray-200 rounded w-1/2" />
    <div class="h-8 bg-gray-200 rounded w-full" />
    <div class="h-3 bg-gray-200 rounded w-2/3" />
  </div>

  <!-- Table row variant -->
  <div
    v-else-if="variant === 'table-row'"
    class="flex items-center gap-4 px-4 py-3 animate-pulse"
  >
    <div class="h-4 bg-gray-200 rounded w-1/4" />
    <div class="h-4 bg-gray-200 rounded w-1/3" />
    <div class="h-4 bg-gray-200 rounded w-1/6" />
    <div class="h-4 bg-gray-200 rounded w-1/5" />
  </div>

  <!-- Chart variant -->
  <div
    v-else-if="variant === 'chart'"
    class="bg-white rounded-xl shadow-sm border p-6 animate-pulse"
  >
    <div class="h-4 bg-gray-200 rounded w-1/3 mb-4" />
    <div class="flex items-end gap-2 h-40">
      <div class="bg-gray-200 rounded-t flex-1" style="height: 20%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 45%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 65%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 40%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 80%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 55%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 70%" />
      <div class="bg-gray-200 rounded-t flex-1" style="height: 35%" />
    </div>
  </div>

  <!-- Text block variant -->
  <div
    v-else-if="variant === 'text-block'"
    class="space-y-2 animate-pulse"
  >
    <div class="h-4 bg-gray-200 rounded w-full" />
    <div class="h-4 bg-gray-200 rounded w-5/6" />
    <div class="h-4 bg-gray-200 rounded w-4/5" />
    <div class="h-4 bg-gray-200 rounded w-2/3" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'card' | 'table-row' | 'chart' | 'text-block'
}>(), {
  variant: 'card',
})
</script>
