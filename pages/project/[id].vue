<template>
  <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back link -->
    <NuxtLink to="/" class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
      ← Retour au dashboard
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div class="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
      <div class="h-32 bg-gray-200 rounded"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <div class="text-4xl mb-4">😕</div>
      <p class="text-gray-500">{{ error }}</p>
    </div>

    <!-- Project content -->
    <div v-else-if="project">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-4">
            <div 
              class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
              :class="typeIconClass"
            >
              {{ typeIcon }}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ project.name }}</h1>
              <div class="flex items-center gap-2 mt-1">
                <span 
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="statusClass"
                >
                  {{ statusLabel }}
                </span>
                <span class="text-sm text-gray-500">{{ project.type }}</span>
                <span 
                  v-if="project.priority === 'urgent'"
                  class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"
                >
                  Urgent
                </span>
                <span 
                  v-if="project.isStale"
                  class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700"
                  :title="`Aucune mise à jour depuis ${project.staleHours}h`"
                >
                  ⚠️ Stale ({{ project.staleHours }}h)
                </span>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-2">
            <select 
              v-model="project.status"
              @change="updateStatus"
              class="text-sm border rounded-lg px-3 py-2"
            >
              <option value="planning">Planification</option>
              <option value="in-progress">En cours</option>
              <option value="review">En revue</option>
              <option value="paused">En pause</option>
              <option value="completed">Terminé</option>
            </select>
          </div>
        </div>

        <p v-if="project.description" class="text-gray-600 mb-4">
          {{ project.description }}
        </p>

        <!-- Progress -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-2">
            <span class="font-medium">Progression</span>
            <span>{{ project.progress }}%</span>
          </div>
          <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500 rounded-full transition-all"
              :style="{ width: `${project.progress}%` }"
            ></div>
          </div>
          <input 
            type="range" 
            v-model.number="project.progress"
            @change="updateProgress"
            min="0" 
            max="100"
            class="w-full mt-2"
          >
        </div>

        <!-- Meta -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Créé le</span>
            <div class="font-medium">{{ formatDate(project.createdAt) }}</div>
          </div>
          <div>
            <span class="text-gray-500">Mis à jour</span>
            <div class="font-medium">{{ formatDate(project.updatedAt) }}</div>
          </div>
          <div>
            <span class="text-gray-500">Team</span>
            <div class="font-medium">{{ project.team?.length ?? 0 }} agent(s)</div>
          </div>
          <div>
            <span class="text-gray-500">Phases</span>
            <div class="font-medium">{{ completedPhases }}/{{ project.phases?.length ?? 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Phases -->
      <div v-if="project.phases?.length > 0" class="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 class="font-bold text-lg mb-4">📋 Phases</h2>
        <div class="space-y-3">
          <div 
            v-for="(phase, index) in project.phases" 
            :key="index"
            class="flex items-center gap-3 p-3 rounded-lg"
            :class="{
              'bg-green-50': phase.status === 'completed',
              'bg-blue-50': phase.status === 'in-progress',
              'bg-gray-50': phase.status === 'pending'
            }"
          >
            <span class="text-lg">
              {{ phase.status === 'completed' ? '✅' : phase.status === 'in-progress' ? '🔄' : '⏳' }}
            </span>
            <div class="flex-1">
              <div class="font-medium">{{ phase.name }}</div>
              <div v-if="phase.assignedTo?.length" class="text-xs text-gray-500">
                {{ phase.assignedTo.join(', ') }}
              </div>
            </div>
            <button 
              v-if="phase.status !== 'completed'"
              @click="completePhase(phase.name)"
              class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Terminer
            </button>
          </div>
        </div>
      </div>

      <!-- Updates log -->
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-lg">📝 Journal des mises à jour</h2>
          <button 
            @click="showAddUpdate = !showAddUpdate"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            + Ajouter une note
          </button>
        </div>

        <!-- Add update form -->
        <div v-if="showAddUpdate" class="mb-4 p-4 bg-gray-50 rounded-lg">
          <textarea 
            v-model="newUpdate"
            rows="2"
            class="w-full border rounded-lg px-3 py-2 mb-2"
            placeholder="Note de mise à jour..."
          ></textarea>
          <div class="flex justify-end gap-2">
            <button @click="showAddUpdate = false" class="text-sm px-3 py-1 border rounded">
              Annuler
            </button>
            <button 
              @click="addUpdate"
              class="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Ajouter
            </button>
          </div>
        </div>

        <!-- Updates list -->
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div 
            v-for="(update, index) in (project.updates ?? []).slice().reverse()" 
            :key="index"
            class="flex gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div class="text-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-900">{{ update.agentId }}</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-500">{{ formatDate(update.timestamp) }}</span>
                <span 
                  v-if="update.status"
                  class="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700"
                >
                  {{ update.status }}
                </span>
              </div>
              <p class="text-gray-600">{{ update.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Project } from '~/types/projects'

const route = useRoute()
const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref('')
const showAddUpdate = ref(false)
const newUpdate = ref('')

const typeIcon = computed(() => {
  switch (project.value?.type) {
    case 'code': return '💻'
    case 'writing': return '✍️'
    case 'hybrid': return '🔀'
    default: return '📁'
  }
})

const typeIconClass = computed(() => {
  switch (project.value?.type) {
    case 'code': return 'bg-blue-100'
    case 'writing': return 'bg-amber-100'
    case 'hybrid': return 'bg-purple-100'
    default: return 'bg-gray-100'
  }
})

const statusClass = computed(() => {
  switch (project.value?.status) {
    case 'planning': return 'bg-gray-100 text-gray-700'
    case 'in-progress': return 'bg-blue-100 text-blue-700'
    case 'review': return 'bg-purple-100 text-purple-700'
    case 'paused': return 'bg-yellow-100 text-yellow-700'
    case 'completed': return 'bg-green-100 text-green-700'
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
  return labels[project.value?.status || ''] || project.value?.status
})

const completedPhases = computed(() => {
  return project.value?.phases?.filter(p => p.status === 'completed').length ?? 0
})

async function fetchProject() {
  loading.value = true
  try {
    const response = await fetch(`/api/projects/${route.params.id}`)
    if (!response.ok) throw new Error('Project not found')
    project.value = await response.json()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function updateProject(updates: any) {
  if (!project.value) return
  try {
    const response = await fetch(`/api/projects/${project.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (response.ok) {
      project.value = await response.json()
    }
  } catch (e) {
    console.error('Failed to update project:', e)
  }
}

function updateStatus() {
  updateProject({ 
    status: project.value?.status,
    message: `Status changé en ${project.value?.status}`
  })
}

function updateProgress() {
  updateProject({ 
    progress: project.value?.progress,
    message: `Progression mise à jour: ${project.value?.progress}%`
  })
}

function completePhase(phaseName: string) {
  // Find next phase
  const phases = project.value?.phases || []
  const currentIndex = phases.findIndex(p => p.name === phaseName)
  const nextPhase = phases[currentIndex + 1]?.name

  updateProject({
    currentPhase: nextPhase,
    message: `Phase "${phaseName}" terminée`
  })
}

function addUpdate() {
  if (!newUpdate.value.trim()) return
  updateProject({ message: newUpdate.value })
  newUpdate.value = ''
  showAddUpdate.value = false
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(fetchProject)

useHead({
  title: computed(() => project.value?.name ? `${project.value.name} - OpenClaw` : 'Projet - OpenClaw')
})
</script>
