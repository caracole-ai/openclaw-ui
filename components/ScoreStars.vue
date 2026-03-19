<template>
  <div class="flex items-center gap-1">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      class="text-lg transition-colors focus:outline-none"
      :class="star <= modelValue ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'"
      :disabled="readonly"
      @click="!readonly && $emit('update:modelValue', star)"
    >
      {{ star <= modelValue ? '\u2605' : '\u2606' }}
    </button>
    <span v-if="showValue" class="text-xs text-gray-500 ml-1">{{ modelValue }}/5</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: number
  readonly?: boolean
  showValue?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>
