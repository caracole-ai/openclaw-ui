<template>
  <section class="mb-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Projets</h2>
        <p class="text-sm text-gray-500">{{ total }} projet{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Filtre par état -->
        <select
          v-model="stateFilter"
          class="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">Tous les états</option>
          <option value="backlog">Backlog</option>
          <option value="planning">Planning</option>
          <option value="build">Build</option>
          <option value="review">Review</option>
          <option value="delivery">Delivery</option>
          <option value="rex">REX</option>
          <option value="done">Done</option>
        </select>

        <!-- Filtre par team -->
        <select
          v-model="teamFilter"
          class="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">Toutes les teams</option>
          <option v-for="team in uniqueTeams" :key="team" :value="team">
            {{ team }}
          </option>
        </select>

        <!-- View toggle -->
        <div class="flex border rounded-lg overflow-hidden">
          <button
            @click="viewMode = 'cards'"
            class="px-3 py-1.5 text-sm"
            :class="viewMode === 'cards' ? 'bg-gray-200 font-medium' : 'bg-white hover:bg-gray-50'"
          >
            ▦
          </button>
          <button
            @click="viewMode = 'kanban'"
            class="px-3 py-1.5 text-sm border-l"
            :class="viewMode === 'kanban' ? 'bg-gray-200 font-medium' : 'bg-white hover:bg-gray-50'"
          >
            ▤
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div class="h-2 bg-gray-200 rounded w-full"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredProjects.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
      <div class="text-4xl mb-2">📋</div>
      <p class="text-gray-500">
        {{ stateFilter !== 'all' || teamFilter !== 'all'
          ? 'Aucun projet avec ces filtres'
          : 'Aucun projet' }}
      </p>
      <button
        v-if="stateFilter !== 'all' || teamFilter !== 'all'"
        @click="stateFilter = 'all'; teamFilter = 'all'"
        class="mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
      >
        Réinitialiser les filtres
      </button>
    </div>

    <!-- Projects list view - grouped by state in accordions -->
    <div v-else-if="viewMode === 'cards'" class="space-y-4">
      <div
        v-for="group in projectGroups"
        :key="group.state"
        class="bg-white rounded-lg border shadow-sm overflow-hidden"
      >
        <!-- Accordion header -->
        <button
          @click="toggleAccordion(group.state)"
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span>{{ group.icon }}</span>
            <span class="font-semibold text-gray-900">{{ group.label }}</span>
            <span class="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {{ group.projects.length }}
            </span>
          </div>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': expandedAccordions[group.state] }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Accordion content -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[2000px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[2000px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="expandedAccordions[group.state]" class="overflow-hidden">
            <div class="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ProjectCard
                v-for="project in group.projects"
                :key="project.id"
                :project="project"
              />
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Kanban view -->
    <ProjectsKanban
      v-else
      :projects="filteredProjects"
      @state-change="handleStateChange"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjects } from '~/composables/useProjects'
import type { Project, ProjectState } from '~/types/project'

const { projects, loading } = useProjects()

const stateFilter = ref('all')
const teamFilter = ref('all')
const viewMode = ref<'cards' | 'kanban'>('kanban')

const total = computed(() => projects.value.length)

// Extract unique teams from all projects
const uniqueTeams = computed(() => {
  const teams = new Set<string>()
  projects.value.forEach(p => {
    if (p.team) teams.add(p.team)
  })
  return Array.from(teams).sort()
})

const filteredProjects = computed(() => {
  let result = projects.value

  if (stateFilter.value !== 'all') {
    result = result.filter(p => p.state === stateFilter.value)
  }

  if (teamFilter.value !== 'all') {
    result = result.filter(p => p.team === teamFilter.value)
  }

  return result
})

// Accordion state - all open by default
const expandedAccordions = ref<Record<string, boolean>>({
  backlog: true,
  planning: true,
  build: true,
  review: true,
  delivery: true,
  rex: true,
  done: true,
})

function toggleAccordion(state: string) {
  expandedAccordions.value[state] = !expandedAccordions.value[state]
}

// Group projects by state for accordion view
const STATE_CONFIG: { state: ProjectState; label: string; icon: string }[] = [
  { state: 'backlog', label: 'Backlog', icon: '📋' },
  { state: 'planning', label: 'Planning', icon: '📝' },
  { state: 'build', label: 'Build', icon: '🔨' },
  { state: 'review', label: 'Review', icon: '👀' },
  { state: 'delivery', label: 'Delivery', icon: '🚀' },
  { state: 'rex', label: 'REX', icon: '💡' },
  { state: 'done', label: 'Done', icon: '✅' },
]

const projectGroups = computed(() => {
  return STATE_CONFIG.map(config => ({
    ...config,
    projects: filteredProjects.value.filter(p => p.state === config.state)
  })).filter(group => group.projects.length > 0)
})

function handleStateChange(projectId: string, newState: ProjectState) {
  const project = projects.value.find(p => p.id === projectId)
  if (project) {
    project.state = newState
  }
}
</script>
