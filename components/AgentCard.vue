<template>
  <!-- Vue compacte -->
  <NuxtLink
    v-if="compact"
    :to="`/agent/${agent.id}`"
    class="bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-shadow flex items-center gap-2"
    :class="borderClass"
  >
    <div
      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
      :class="avatarClass"
    >
      {{ agent.emoji || initial }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="font-medium text-gray-900 truncate text-sm">{{ agent.name }}</div>
      <div class="text-xs text-gray-500">{{ agent.role }}</div>
    </div>
    <AgentStatusBadge :status="agent.status" size="sm" />
  </NuxtLink>

  <!-- Vue détaillée -->
  <div
    v-else
    class="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
    :class="borderClass"
  >
    <!-- Header : Avatar + Nom + Badges -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          :class="avatarClass"
        >
          {{ agent.emoji || initial }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/agent/${agent.id}`"
              class="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {{ agent.name }}
            </NuxtLink>
            <!-- Team Badge -->
            <span
              class="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded"
              :class="teamBadgeClass"
            >
              {{ agent.team }}
            </span>
          </div>
          <p class="text-xs text-gray-500">{{ agent.role }}</p>
          <p class="text-xs text-gray-400 font-mono">{{ agent.model }}</p>
        </div>
      </div>
      <AgentStatusBadge :status="agent.status" />
    </div>

    <!-- Skills Badges -->
    <div v-if="agent.skills?.length" class="flex flex-wrap gap-1.5 mb-3">
      <span
        v-for="skill in agent.skills"
        :key="skill"
        class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
      >
        {{ skill }}
      </span>
    </div>

    <!-- Stats principales -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <!-- Projets -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="text-xs text-gray-500 mb-1">Projets</div>
        <div class="font-semibold text-gray-900">{{ agent.projects?.length ?? 0 }}</div>
      </div>

      <!-- Modèle -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="text-xs text-gray-500 mb-1">Modèle</div>
        <span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
          {{ formatModel(agent.model) }}
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between text-xs text-gray-500">
      <span v-if="agent.skills?.length">
        {{ agent.skills.length }} skill{{ agent.skills.length > 1 ? 's' : '' }}
      </span>
      <span v-else class="text-gray-400">Aucun skill</span>
      <span>{{ formatAge(agent.createdAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Agent, AgentTeam } from '~/types/agent'

const props = defineProps<{
  agent: Agent
  compact?: boolean
}>()

const initial = computed(() =>
  props.agent.name.charAt(0).toUpperCase()
)

const borderClass = computed(() => {
  switch (props.agent.status) {
    case 'active': return 'border-l-4 border-l-green-500'
    case 'idle': return 'border-l-4 border-l-yellow-500'
    case 'error': return 'border-l-4 border-l-red-500'
    case 'offline': return 'border-l-4 border-l-gray-300'
    default: return ''
  }
})

const avatarClass = computed(() => {
  switch (props.agent.status) {
    case 'active': return 'bg-green-100 text-green-700'
    case 'idle': return 'bg-yellow-100 text-yellow-700'
    case 'error': return 'bg-red-100 text-red-700'
    case 'offline': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
})

const teamBadgeClass = computed(() => {
  const team: AgentTeam = props.agent.team
  switch (team) {
    case 'code': return 'bg-blue-100 text-blue-700'
    case 'writing': return 'bg-amber-100 text-amber-700'
    case 'system': return 'bg-emerald-100 text-emerald-700'
    default: return 'bg-gray-100 text-gray-500'
  }
})

function formatModel(model: string): string {
  if (model.includes('opus')) return 'Opus'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('gpt-4')) return 'GPT-4'
  return model.split('/').pop()?.split('-')[0] ?? model
}

function formatAge(timestamp: string | null): string {
  if (!timestamp) return 'Jamais'

  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 60) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes}m`
  if (diffHours < 24) return `Il y a ${diffHours}h`

  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
}
</script>
