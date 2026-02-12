<template>
  <div
    class="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow border-l-4"
    :class="borderClass"
  >
    <div class="p-4">
      <!-- Header: name + version + status badge -->
      <div class="flex items-start justify-between mb-2">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="font-semibold text-gray-900 truncate">{{ skill.name }}</h3>
            <span class="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              v{{ skill.version }}
            </span>
          </div>
          <p class="text-sm text-gray-500 line-clamp-2">{{ skill.description }}</p>
        </div>

        <!-- Status badge with dot -->
        <span
          class="flex-shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs inline-flex items-center gap-1.5 font-medium"
          :class="statusBadgeClasses"
        >
          <span class="w-2 h-2 rounded-full" :class="statusDotClasses" />
          {{ statusLabel }}
        </span>
      </div>

      <!-- Source -->
      <div class="flex items-center gap-1.5 mb-3 text-xs text-gray-400">
        <svg class="w-3.5 h-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.029 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd" />
        </svg>
        <span class="truncate">{{ skill.source }}</span>
      </div>

      <!-- Assigned agents -->
      <div v-if="assignedAgents.length > 0" class="mb-3">
        <div class="text-xs text-gray-400 mb-1.5">Agents</div>
        <div class="flex flex-wrap gap-1">
          <NuxtLink
            v-for="agent in assignedAgents"
            :key="agent"
            :to="`/agent/${agent}`"
            class="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-medium hover:bg-blue-200 transition-colors"
          >
            {{ agent }}
          </NuxtLink>
        </div>
      </div>

      <!-- Verify button (only when agentId is provided) -->
      <div v-if="agentId" class="mb-3">
        <SkillVerifyButton
          :agent-id="agentId"
          :skill-id="skill.id"
          @verified="onVerified"
        />
      </div>

      <!-- Footer: install date + installedBy -->
      <div class="flex items-center justify-between pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-400">
          {{ formatDate(skill.installedAt) }}
        </span>
        <span class="text-xs text-gray-400 truncate ml-2">
          par {{ skill.installedBy }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Skill, SkillVerification } from '~/types/skill'

const props = defineProps<{
  skill: Skill
  agentId?: string
  assignments: Record<string, string[]>
}>()

const emit = defineEmits<{
  (e: 'verified', result: SkillVerification): void
}>()

// --- Agents assigned to this skill ---
const assignedAgents = computed(() => {
  const agents: string[] = []
  for (const [id, skillIds] of Object.entries(props.assignments)) {
    if (skillIds.includes(props.skill.id)) {
      agents.push(id)
    }
  }
  return agents
})

// --- Border color by status ---
const borderClass = computed(() => {
  switch (props.skill.status) {
    case 'active': return 'border-l-green-500'
    case 'pending': return 'border-l-yellow-500'
    case 'disabled': return 'border-l-gray-400'
    default: return 'border-l-gray-400'
  }
})

// --- Status badge classes ---
const statusBadgeClasses = computed(() => {
  switch (props.skill.status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'disabled': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
})

const statusDotClasses = computed(() => {
  switch (props.skill.status) {
    case 'active': return 'bg-green-500 animate-pulse'
    case 'pending': return 'bg-yellow-500'
    case 'disabled': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
})

const statusLabel = computed(() => {
  switch (props.skill.status) {
    case 'active': return 'Actif'
    case 'pending': return 'En attente'
    case 'disabled': return 'Desactive'
    default: return props.skill.status
  }
})

// --- Event relay ---
function onVerified(result: SkillVerification) {
  emit('verified', result)
}

// --- Date formatting (matches project convention) ---
function formatDate(timestamp: string): string {
  if (!timestamp) return 'N/A'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return "A l'instant"
  if (diffHours < 24) return `Il y a ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Il y a ${diffDays}j`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
</script>
