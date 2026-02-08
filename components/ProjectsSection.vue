<template>
  <section class="mb-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-bold text-gray-900">📋 Projets</h2>
        <p class="text-sm text-gray-500">{{ total }} projet{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select 
          v-model="agentFilter"
          class="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">Tous les agents</option>
          <option v-for="agent in uniqueAgents" :key="agent" :value="agent">
            {{ agent }}
          </option>
        </select>
        <select 
          v-model="statusFilter"
          class="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">Tous les status</option>
          <option value="stale">⚠️ Stale</option>
          <option value="planning">Planification</option>
          <option value="in-progress">En cours</option>
          <option value="review">En revue</option>
          <option value="paused">En pause</option>
          <option value="completed">Terminés</option>
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
        
        <button 
          @click="showCreateModal = true"
          class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Nouveau
        </button>
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
        {{ statusFilter !== 'all' || agentFilter !== 'all' 
          ? 'Aucun projet avec ces filtres' 
          : 'Aucun projet' }}
      </p>
      <button 
        v-if="statusFilter === 'all' && agentFilter === 'all'"
        @click="showCreateModal = true"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Créer un projet
      </button>
      <button 
        v-else
        @click="statusFilter = 'all'; agentFilter = 'all'"
        class="mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
      >
        Réinitialiser les filtres
      </button>
    </div>

    <!-- Projects list view - grouped by status in accordions -->
    <div v-else-if="viewMode === 'cards'" class="space-y-4">
      <div 
        v-for="group in projectGroups" 
        :key="group.status"
        class="bg-white rounded-lg border shadow-sm overflow-hidden"
      >
        <!-- Accordion header -->
        <button
          @click="toggleAccordion(group.status)"
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
            :class="{ 'rotate-180': expandedAccordions[group.status] }"
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
          <div v-if="expandedAccordions[group.status]" class="overflow-hidden">
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
      @status-change="handleStatusChange"
    />

    <!-- Create Modal -->
    <Teleport to="body">
      <div 
        v-if="showCreateModal" 
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showCreateModal = false"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
          <h3 class="text-lg font-bold mb-4">Nouveau projet</h3>
          
          <form @submit.prevent="createProject">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input 
                  v-model="newProject.name"
                  type="text"
                  required
                  class="w-full border rounded-lg px-3 py-2"
                  placeholder="Mon super projet"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select v-model="newProject.type" class="w-full border rounded-lg px-3 py-2">
                  <option value="code">💻 Code</option>
                  <option value="writing">✍️ Écriture</option>
                  <option value="hybrid">🔀 Hybride</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  v-model="newProject.description"
                  rows="3"
                  class="w-full border rounded-lg px-3 py-2"
                  placeholder="Description du projet..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select v-model="newProject.priority" class="w-full border rounded-lg px-3 py-2">
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button 
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button 
                type="submit"
                :disabled="creating"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ creating ? 'Création...' : 'Créer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { Project, ProjectCreateRequest } from '~/types/projects'
import { normalizeProjects, normalizeProjectStatus } from '~/composables/useProjectsData'

const rawProjects = ref<Project[]>([])
const loading = ref(true)
const statusFilter = ref('all')
const agentFilter = ref('all')
const viewMode = ref<'cards' | 'kanban'>('kanban')
const showCreateModal = ref(false)
const creating = ref(false)

let refreshInterval: ReturnType<typeof setInterval> | null = null

const newProject = ref<ProjectCreateRequest>({
  name: '',
  type: 'code',
  description: '',
  priority: 'medium'
})

// Normalize projects (review → in-progress mapping in data layer)
const projects = computed(() => normalizeProjects(rawProjects.value))

const total = computed(() => projects.value.length)

// Extract unique agents from all projects
const uniqueAgents = computed(() => {
  const agents = new Set<string>()
  projects.value.forEach(p => {
    if (p.lead) agents.add(p.lead)
    p.team?.forEach(a => agents.add(a))
  })
  return Array.from(agents).sort()
})

const filteredProjects = computed(() => {
  let result = projects.value
  
  // Filter by status
  if (statusFilter.value === 'stale') {
    result = result.filter(p => p.isStale)
  } else if (statusFilter.value !== 'all') {
    result = result.filter(p => p.status === statusFilter.value)
  }
  
  // Filter by agent
  if (agentFilter.value !== 'all') {
    result = result.filter(p => 
      p.lead === agentFilter.value || 
      p.team?.includes(agentFilter.value)
    )
  }
  
  return result
})

// Sort filtered projects by status for cards view
const STATUS_ORDER: Record<string, number> = {
  'planning': 0,
  'in-progress': 1,
  'review': 2,
  'paused': 3,
  'completed': 4
}

const sortedFilteredProjects = computed(() => {
  return [...filteredProjects.value].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 99
    const orderB = STATUS_ORDER[b.status] ?? 99
    return orderA - orderB
  })
})

// Accordion state - all open by default
const expandedAccordions = ref<Record<string, boolean>>({
  'planning': true,
  'in-progress': true,
  'review': true,
  'paused': true,
  'completed': true
})

function toggleAccordion(status: string) {
  expandedAccordions.value[status] = !expandedAccordions.value[status]
}

// Group projects by status for accordion view
const STATUS_CONFIG = [
  { status: 'planning', label: 'Planification', icon: '📝' },
  { status: 'in-progress', label: 'En cours', icon: '🔄' },
  { status: 'review', label: 'En revue', icon: '👀' },
  { status: 'paused', label: 'En pause', icon: '⏸️' },
  { status: 'completed', label: 'Terminé', icon: '✅' }
]

const projectGroups = computed(() => {
  return STATUS_CONFIG.map(config => ({
    ...config,
    projects: filteredProjects.value.filter(p => p.status === config.status)
  })).filter(group => group.projects.length > 0)
})

async function fetchProjects() {
  loading.value = true
  try {
    const response = await fetch('/api/projects')
    const data = await response.json()
    rawProjects.value = data.projects
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  } finally {
    loading.value = false
  }
}

function handleStatusChange(projectId: string, newStatus: string) {
  // Update local state immediately (on raw data, normalization happens in computed)
  const project = rawProjects.value.find(p => p.id === projectId)
  if (project) {
    project.status = newStatus as any
    project.updatedAt = new Date().toISOString()
  }
}

async function createProject() {
  creating.value = true
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject.value)
    })
    
    if (response.ok) {
      const project = await response.json()
      rawProjects.value.unshift(project)
      showCreateModal.value = false
      newProject.value = { name: '', type: 'code', description: '', priority: 'medium' }
    }
  } catch (error) {
    console.error('Failed to create project:', error)
  } finally {
    creating.value = false
  }
}

// Client-side only: fetch + polling
onMounted(() => {
  fetchProjects()
  refreshInterval = setInterval(fetchProjects, 30000)
})

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
