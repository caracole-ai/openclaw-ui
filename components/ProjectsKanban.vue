<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
    <!-- Column for each status -->
    <div 
      v-for="column in columns" 
      :key="column.status"
      class="bg-gray-100 rounded-lg transition-colors min-w-0"
      :class="{ 'bg-blue-100 ring-2 ring-blue-300': dragOverColumn === column.status }"
      @dragover.prevent="dragOverColumn = column.status"
      @dragleave="dragOverColumn = null"
      @drop="handleDrop($event, column.status)"
    >
      <!-- Column header -->
      <div 
        class="p-3 border-b-2 flex items-center justify-between"
        :class="column.borderColor"
      >
        <div class="flex items-center gap-2">
          <span>{{ column.icon }}</span>
          <span class="font-semibold text-gray-700">{{ column.label }}</span>
        </div>
        <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
          {{ getProjectsForColumn(column.status).length }}
        </span>
      </div>

      <!-- Cards -->
      <div class="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
        <div 
          v-for="project in getProjectsForColumn(column.status)" 
          :key="project.id"
          draggable="true"
          class="bg-white rounded-lg p-3 shadow-sm border cursor-grab hover:shadow-md transition-all"
          :class="{ 
            'ring-2 ring-orange-300': project.isStale,
            'opacity-50 scale-95': draggingId === project.id 
          }"
          @click="navigateTo(`/project/${project.id}`)"
          @dragstart="handleDragStart($event, project)"
          @dragend="handleDragEnd"
        >
          <!-- Stale indicator -->
          <div v-if="project.isStale" class="text-xs text-orange-600 mb-1">
            ⚠️ Stale ({{ project.staleHours }}h)
          </div>
          
          <!-- Title -->
          <div class="font-medium text-sm text-gray-900 mb-1">
            {{ project.name }}
          </div>
          
          <!-- Type badge -->
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs">{{ typeIcon(project.type) }}</span>
            <span 
              v-if="project.priority === 'urgent'"
              class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600"
            >
              urgent
            </span>
          </div>

          <!-- Progress -->
          <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500 rounded-full"
              :style="{ width: `${project.progress}%` }"
            ></div>
          </div>
          
          <!-- Footer -->
          <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span v-if="project.team?.length">👥 {{ project.team.length }}</span>
            <span>{{ project.progress }}%</span>
          </div>
        </div>

        <!-- Empty column -->
        <div 
          v-if="getProjectsForColumn(column.status).length === 0"
          class="text-center py-8 text-gray-400 text-sm"
        >
          Aucun projet
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Project, ProjectType, ProjectStatus } from '~/types/projects'
import { KANBAN_COLUMNS } from '~/composables/useProjectsData'

const props = defineProps<{
  projects: Project[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', projectId: string, newStatus: ProjectStatus): void
}>()

// Drag state
const draggingId = ref<string | null>(null)
const dragOverColumn = ref<string | null>(null)

function handleDragStart(event: DragEvent, project: Project) {
  draggingId.value = project.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', project.id)
  }
}

function handleDragEnd() {
  draggingId.value = null
  dragOverColumn.value = null
}

async function handleDrop(event: DragEvent, newStatus: string) {
  event.preventDefault()
  const projectId = event.dataTransfer?.getData('text/plain')
  
  if (projectId) {
    const project = props.projects.find(p => p.id === projectId)
    if (project && project.status !== newStatus) {
      // Update via API
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: newStatus,
            message: `Status changé: ${project.status} → ${newStatus} (drag & drop)`
          })
        })
        if (response.ok) {
          emit('statusChange', projectId, newStatus as ProjectStatus)
        }
      } catch (error) {
        console.error('Failed to update project status:', error)
      }
    }
  }
  
  draggingId.value = null
  dragOverColumn.value = null
}

// Use columns from composable (review column removed)
const columns = KANBAN_COLUMNS

function getProjectsForColumn(status: string): Project[] {
  return props.projects.filter(p => p.status === status)
}

function typeIcon(type: ProjectType): string {
  switch (type) {
    case 'code': return '💻'
    case 'writing': return '✍️'
    case 'hybrid': return '🔀'
    default: return '📁'
  }
}
</script>
