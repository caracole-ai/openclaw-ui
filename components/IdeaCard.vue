<template>
  <div
    class="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
    :class="borderClass"
    @click="$emit('select', idea)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          :style="{ backgroundColor: statutConfig.bgLight }"
        >
          {{ energieIcon }}
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 line-clamp-1">{{ idea.titre }}</h3>
          <div class="flex items-center gap-1 mt-1 flex-wrap">
            <span
              v-for="theme in idea.themes.slice(0, 3)"
              :key="theme"
              class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700"
            >
              #{{ theme }}
            </span>
            <span v-if="idea.themes.length > 3" class="text-xs text-gray-400">
              +{{ idea.themes.length - 3 }}
            </span>
          </div>
        </div>
      </div>
      <span
        class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
        :style="{ backgroundColor: statutConfig.bgLight, color: statutConfig.color }"
      >
        {{ statutConfig.label }}
      </span>
    </div>

    <!-- Body preview -->
    <p v-if="idea.bodyPreview" class="text-sm text-gray-600 line-clamp-2 mb-3">
      {{ idea.bodyPreview }}
    </p>

    <!-- Score bar (if scored) -->
    <div v-if="hasScore" class="mb-3">
      <div class="flex justify-between text-xs text-gray-500 mb-1">
        <span>Score</span>
        <span>{{ aggregateScore }}/10</span>
      </div>
      <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="scoreBarClass"
          :style="{ width: `${(aggregateScore / 10) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center gap-2">
        <span :class="energieClass">{{ idea.energie }}</span>
        <span v-if="idea.source">via {{ idea.source }}</span>
      </div>
      <span>{{ formatDate(idea.date) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Idea, IdeaStatut } from '~/types/idea'

const props = defineProps<{
  idea: Idea
}>()

defineEmits<{
  select: [idea: Idea]
}>()

const STATUT_CONFIG: Record<IdeaStatut, { label: string; color: string; bgLight: string }> = {
  'a-explorer':  { label: 'A explorer',  color: '#6B7280', bgLight: '#F3F4F6' },
  'en-revue':    { label: 'En revue',    color: '#3B82F6', bgLight: '#EFF6FF' },
  'approuvee':   { label: 'Approuvee',   color: '#10B981', bgLight: '#ECFDF5' },
  'rejetee':     { label: 'Rejetee',     color: '#EF4444', bgLight: '#FEF2F2' },
  'promue':      { label: 'Promue',      color: '#8B5CF6', bgLight: '#F5F3FF' },
}

const statutConfig = computed(() => STATUT_CONFIG[props.idea.statut] || STATUT_CONFIG['a-explorer'])

const energieIcon = computed(() => {
  switch (props.idea.energie) {
    case 'haute': return '\u26A1'
    case 'moyenne': return '\uD83D\uDCA1'
    case 'basse': return '\uD83D\uDCAD'
    default: return '\uD83D\uDCA1'
  }
})

const energieClass = computed(() => {
  switch (props.idea.energie) {
    case 'haute': return 'text-orange-600 font-medium'
    case 'moyenne': return 'text-yellow-600'
    case 'basse': return 'text-gray-500'
    default: return ''
  }
})

const borderClass = computed(() => {
  switch (props.idea.statut) {
    case 'a-explorer': return 'border-l-4 border-l-gray-300'
    case 'en-revue':   return 'border-l-4 border-l-blue-400'
    case 'approuvee':  return 'border-l-4 border-l-green-400'
    case 'rejetee':    return 'border-l-4 border-l-red-400'
    case 'promue':     return 'border-l-4 border-l-purple-400'
    default:           return 'border-l-4 border-l-gray-300'
  }
})

const aggregateScore = computed(() => {
  return props.idea.scoreRealisme + props.idea.scoreImpact - props.idea.scoreEffort + 5
})

const hasScore = computed(() => {
  return props.idea.scoreRealisme > 0 || props.idea.scoreEffort > 0 || props.idea.scoreImpact > 0
})

const scoreBarClass = computed(() => {
  if (aggregateScore.value >= 8) return 'bg-green-500'
  if (aggregateScore.value >= 5) return 'bg-yellow-500'
  return 'bg-red-500'
})

function formatDate(date: string): string {
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
  } catch {
    return date
  }
}
</script>
