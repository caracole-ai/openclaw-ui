<template>
  <div class="bg-white rounded-lg shadow p-6 border-l-4" :class="borderColor">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-600 font-medium">{{ title }}</p>
        <p class="text-3xl font-bold mt-2" :class="textColor">{{ value }}</p>
        <p v-if="subtitle" class="text-xs text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <div class="text-4xl">{{ icon }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
  subtitle?: string;
}>();

const borderColor = computed(() => {
  const colors = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500'
  };
  return colors[props.color];
});

const textColor = computed(() => {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };
  return colors[props.color];
});
</script>
