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
          :class="typeIconClass"
        >
          {{ typeIcon }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900">{{ project.name }}</h3>
            <span 
              v-if="project.priority === 'urgent'"
              class="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-red-100 text-red-700"
            >
              urgent
            </span>
          </div>
          <p class="text-xs text-gray-500">{{ project.type }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span 
          v-if="project.isStale"
          class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 flex items-center gap-1"
          :title="`Pas de mise à jour depuis ${project.staleHours}h`"
        >
          ⚠️ {{ project.staleHours }}h
        </span>
        <span 
          class="px-2 py-1 text-xs font-medium rounded-full"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Description -->
    <p v-if="project.description" class="text-sm text-gray-600 mb-3 line-clamp-2">
      {{ project.description }}
    </p>

    <!-- Progress bar -->
    <div class="mb-3">
      <div class="flex justify-between text-xs text-gray-500 mb-1">
        <span>{{ project.currentPhase || 'Démarrage' }}</span>
        <span>{{ project.progress ?? 0 }}%</span>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-300"
          :class="progressBarClass"
          :style="{ width: `${project.progress ?? 0}%` }"
        ></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center gap-2">
        <span v-if="teamLength > 0">
          👥 {{ teamLength }} agent{{ teamLength > 1 ? 's' : '' }}
        </span>
        <span v-if="phasesLength > 0">
          📋 {{ completedPhases }}/{{ phasesLength }} phases
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Nudge button - visible on all active projects -->
        <button
          v-if="canNudge"
          @click.prevent.stop="nudgeProject"
          :disabled="nudging || nudgeCooldownSeconds > 0"
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
          :class="nudging || nudgeCooldownSeconds > 0
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'"
          :title="nudgeCooldownText"
        >
          {{ nudging ? '⏳' : '🔄' }}
        </button>
        <span>{{ formatDate(project.updatedAt) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Project } from '~/types/projects'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  (e: 'nudged', projectId: string): void
}>()

// Nudge state
const nudging = ref(false)

// Can nudge on all active projects (not completed/archived)
const canNudge = computed(() => {
  return !['completed', 'archived'].includes(props.project.status)
})

// Cooldown check (15 seconds)
const nudgeCooldownSeconds = computed(() => {
  const lastNudge = props.project.lastNudgeAt
  if (!lastNudge) return 0
  const diffMs = Date.now() - new Date(lastNudge).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  return Math.max(0, 15 - diffSec)
})

const nudgeCooldownText = computed(() => {
  if (nudgeCooldownSeconds.value > 0) {
    return `Cooldown: ${nudgeCooldownSeconds.value}s`
  }
  return 'Relancer le projet'
})

async function nudgeProject() {
  if (nudging.value || nudgeCooldownSeconds.value > 0) return
  
  nudging.value = true
  try {
    const response = await fetch(`/api/projects/${props.project.id}/nudge`, {
      method: 'POST'
    })
    if (response.ok) {
      emit('nudged', props.project.id)
    }
  } catch (error) {
    console.error('Failed to nudge project:', error)
  } finally {
    nudging.value = false
  }
}

// Safe accessors for optional arrays
const teamLength = computed(() => props.project.team?.length ?? 0)
const phasesLength = computed(() => props.project.phases?.length ?? 0)

const typeIcon = computed(() => {
  switch (props.project.type) {
    case 'code': return '💻'
    case 'writing': return '✍️'
    case 'hybrid': return '🔀'
    default: return '📁'
  }
})

const typeIconClass = computed(() => {
  switch (props.project.type) {
    case 'code': return 'bg-blue-100'
    case 'writing': return 'bg-amber-100'
    case 'hybrid': return 'bg-purple-100'
    default: return 'bg-gray-100'
  }
})

const borderClass = computed(() => {
  // Stale projects get orange border (priority visual)
  if (props.project.isStale) return 'border-l-4 border-l-orange-500 ring-1 ring-orange-200'
  
  switch (props.project.status) {
    case 'in-progress': return 'border-l-4 border-l-blue-500'
    case 'review': return 'border-l-4 border-l-purple-500'
    case 'paused': return 'border-l-4 border-l-yellow-500'
    case 'completed': return 'border-l-4 border-l-green-500'
    default: return 'border-l-4 border-l-gray-300'
  }
})

const statusClass = computed(() => {
  switch (props.project.status) {
    case 'planning': return 'bg-gray-100 text-gray-700'
    case 'in-progress': return 'bg-blue-100 text-blue-700'
    case 'review': return 'bg-purple-100 text-purple-700'
    case 'paused': return 'bg-yellow-100 text-yellow-700'
    case 'completed': return 'bg-green-100 text-green-700'
    case 'archived': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-700'
  }
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    'planning': 'Planification',
    'in-progress': 'En cours',
    'review': 'En revue',
    'paused': 'En pause',
    'completed': 'Terminé',
    'archived': 'Archivé'
  }
  return labels[props.project.status] || props.project.status
})

const progressBarClass = computed(() => {
  const progress = props.project.progress ?? 0
  if (props.project.status === 'completed') return 'bg-green-500'
  if (props.project.status === 'paused') return 'bg-yellow-500'
  if (progress >= 80) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  return 'bg-blue-400'
})

const completedPhases = computed(() => {
  return (props.project.phases ?? []).filter(p => p.status === 'completed').length
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
