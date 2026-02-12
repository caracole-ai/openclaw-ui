<template>
  <NuxtLink
    :to="`/project/${project.id}`"
    class="block bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
    :class="borderClass"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          :style="{ backgroundColor: stateConfig.bgLight }"
        >
          {{ stateConfig.icon }}
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">{{ project.name }}</h3>
          <div v-if="teamMembers.length" class="flex items-center gap-1 mt-1">
            <NuxtLink
              v-for="member in teamMembers"
              :key="member"
              :to="`/agent/${member}`"
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              @click.stop
            >
              {{ getAgentEmoji(member) }} {{ member }}
            </NuxtLink>
          </div>
        </div>
      </div>
      <span
        class="px-2 py-1 text-xs font-medium rounded-full"
        :style="{ backgroundColor: stateConfig.bgLight, color: stateConfig.color }"
      >
        {{ stateConfig.label }}
      </span>
    </div>

    <!-- Progress bar based on state index (0-6) -->
    <div class="mb-3">
      <div class="flex justify-between text-xs text-gray-500 mb-1">
        <span>{{ stateConfig.label }}</span>
        <span>{{ progressPercent }}%</span>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${progressPercent}%`, backgroundColor: stateConfig.color }"
        ></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center gap-2">
        <span v-if="project.agents?.length">
          👥 {{ project.agents.length }} agent{{ project.agents.length > 1 ? 's' : '' }}
        </span>
        <span v-if="project.lead">
          Lead: {{ project.lead }}
        </span>
      </div>
      <span>{{ formatDate(project.createdAt) }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Project, ProjectState } from '~/types/project'

const props = defineProps<{
  project: Project
}>()

const STATE_CONFIG: Record<ProjectState, { label: string; color: string; bgLight: string; icon: string; index: number }> = {
  backlog:   { label: 'Backlog',   color: '#6B7280', bgLight: '#F3F4F6', icon: '📋', index: 0 },
  planning:  { label: 'Planning',  color: '#3B82F6', bgLight: '#EFF6FF', icon: '📝', index: 1 },
  build:     { label: 'Build',     color: '#F59E0B', bgLight: '#FFFBEB', icon: '🔨', index: 2 },
  review:    { label: 'Review',    color: '#8B5CF6', bgLight: '#F5F3FF', icon: '👀', index: 3 },
  delivery:  { label: 'Delivery',  color: '#10B981', bgLight: '#ECFDF5', icon: '🚀', index: 4 },
  rex:       { label: 'REX',       color: '#EC4899', bgLight: '#FDF2F8', icon: '💡', index: 5 },
  done:      { label: 'Done',      color: '#059669', bgLight: '#ECFDF5', icon: '✅', index: 6 },
}

const AGENT_EMOJIS: Record<string, string> = {
  main: '🔧', winston: '🏗️', amelia: '💻', claudio: '⚙️'
}

const teamMembers = computed(() => {
  if (Array.isArray(props.project.team)) {
    return props.project.team.map((m: any) => typeof m === 'string' ? m : m.agent)
  }
  if (Array.isArray(props.project.agents)) return props.project.agents
  return []
})

function getAgentEmoji(name: string): string {
  return AGENT_EMOJIS[name] || '🤖'
}

const stateConfig = computed(() => {
  return STATE_CONFIG[props.project.state] || STATE_CONFIG.backlog
})

const progressPercent = computed(() => {
  return Math.round((stateConfig.value.index / 6) * 100)
})

const borderClass = computed(() => {
  const color = stateConfig.value.color
  // Use Tailwind classes for the most common states
  switch (props.project.state) {
    case 'backlog':  return 'border-l-4 border-l-gray-400'
    case 'planning': return 'border-l-4 border-l-blue-500'
    case 'build':    return 'border-l-4 border-l-amber-500'
    case 'review':   return 'border-l-4 border-l-violet-500'
    case 'delivery': return 'border-l-4 border-l-emerald-500'
    case 'rex':      return 'border-l-4 border-l-pink-500'
    case 'done':     return 'border-l-4 border-l-green-600'
    default:         return 'border-l-4 border-l-gray-300'
  }
})

function formatDate(timestamp: string): string {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return 'À l\'instant'
  if (diffHours < 24) return `Il y a ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Il y a ${diffDays}j`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
</script>
