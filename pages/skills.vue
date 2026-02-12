<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Page Title -->
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Skills</h1>

      <!-- Loading State -->
      <template v-if="loading">
        <!-- Skeleton Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div v-for="i in 4" :key="i" class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-gray-200 animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div class="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>

        <!-- Skeleton Filters -->
        <div class="bg-white rounded-xl shadow-sm border p-4 mb-6 animate-pulse">
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="h-10 bg-gray-200 rounded-lg flex-1"></div>
            <div class="h-10 bg-gray-200 rounded-lg w-48"></div>
            <div class="h-10 bg-gray-200 rounded-lg w-48"></div>
          </div>
        </div>

        <!-- Skeleton Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div class="h-5 bg-gray-200 rounded-full w-16 ml-2"></div>
            </div>
            <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div class="space-y-2">
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
              <div class="h-3 bg-gray-200 rounded w-2/5"></div>
              <div class="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- Loaded Content -->
      <template v-else>

        <!-- Stats Counters -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total Skills -->
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Total skills</p>
                <p class="text-3xl font-bold mt-2 text-blue-600">{{ allSkills.length }}</p>
              </div>
              <div class="text-4xl">🧩</div>
            </div>
          </div>

          <!-- Active -->
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Actifs</p>
                <p class="text-3xl font-bold mt-2 text-green-600">{{ activeCount }}</p>
              </div>
              <div class="text-4xl">✅</div>
            </div>
          </div>

          <!-- Pending -->
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-yellow-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Pending</p>
                <p class="text-3xl font-bold mt-2 text-yellow-600">{{ pendingCount }}</p>
              </div>
              <div class="text-4xl">⏳</div>
            </div>
          </div>

          <!-- Disabled -->
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-gray-400">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Desactives</p>
                <p class="text-3xl font-bold mt-2 text-gray-500">{{ disabledCount }}</p>
              </div>
              <div class="text-4xl">🚫</div>
            </div>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Search Input -->
            <div class="relative flex-1">
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <!-- Agent Filter -->
            <select
              v-model="selectedAgent"
              class="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Tous les agents</option>
              <option v-for="agentId in agentIds" :key="agentId" :value="agentId">
                {{ agentId }}
              </option>
            </select>

            <!-- Status Filter -->
            <select
              v-model="selectedStatus"
              class="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Tous</option>
              <option value="active">Actif</option>
              <option value="pending">Pending</option>
              <option value="disabled">Desactive</option>
            </select>
          </div>
        </div>

        <!-- Skills Grid -->
        <div v-if="filteredSkills.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TransitionGroup name="skill-list">
            <SkillCard
              v-for="skill in filteredSkills"
              :key="skill.id"
              :skill="skill"
              :assignments="assignments"
            />
          </TransitionGroup>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-16">
          <div class="text-5xl mb-4">🧩</div>
          <p class="text-lg font-medium text-gray-500">Aucun skill trouve</p>
          <p class="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres de recherche</p>
        </div>

      </template>

      <!-- Error State -->
      <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Skill } from '~/types/skill'
import { useSkills } from '~/composables/useSkills'

useHead({
  title: 'Skills - OpenClaw Dashboard'
})

const { installed, pending, assignments, loading, error } = useSkills()

// Filter state
const searchQuery = ref('')
const selectedAgent = ref('')
const selectedStatus = ref('')

// Combine installed + pending into a single list
const allSkills = computed<Skill[]>(() => {
  return [...installed.value, ...pending.value]
})

// Stats counters
const activeCount = computed(() => allSkills.value.filter(s => s.status === 'active').length)
const pendingCount = computed(() => allSkills.value.filter(s => s.status === 'pending').length)
const disabledCount = computed(() => allSkills.value.filter(s => s.status === 'disabled').length)

// Extract unique agent IDs from assignments
const agentIds = computed(() => {
  return Object.keys(assignments.value).sort()
})

// Filtered skills based on search, agent, and status
const filteredSkills = computed(() => {
  let result = allSkills.value

  // Search filter: name or description (case-insensitive)
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(skill =>
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query)
    )
  }

  // Agent filter: only skills assigned to the selected agent
  if (selectedAgent.value) {
    const agentSkillIds = assignments.value[selectedAgent.value] || []
    result = result.filter(skill => agentSkillIds.includes(skill.id))
  }

  // Status filter
  if (selectedStatus.value) {
    result = result.filter(skill => skill.status === selectedStatus.value)
  }

  return result
})
</script>

<style scoped>
.skill-list-enter-active,
.skill-list-leave-active {
  transition: all 0.3s ease;
}

.skill-list-enter-from,
.skill-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
