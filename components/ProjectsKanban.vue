<template>
  <div class="-mx-4 px-4 pb-4">
    <div class="grid grid-cols-7 gap-2">
      <!-- Column for each state -->
      <div
        v-for="column in columns"
        :key="column.state"
        class="bg-gray-100 rounded-lg transition-colors min-w-0"
        :class="{ 'bg-blue-100 ring-2 ring-blue-300': dragOverColumn === column.state }"
        @dragover.prevent="dragOverColumn = column.state"
        @dragleave="dragOverColumn = null"
        @drop="handleDrop($event, column.state)"
      >
        <!-- Column header -->
        <div
          class="p-3 border-b-2 flex items-center justify-between"
          :style="{ borderColor: column.color }"
        >
          <div class="flex items-center gap-2">
            <span>{{ getIcon(column.state) }}</span>
            <span class="font-semibold text-gray-700 text-sm">{{ column.label }}</span>
          </div>
          <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {{ getProjectsForColumn(column.state).length }}
          </span>
        </div>

        <!-- Cards -->
        <div class="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
          <div
            v-for="project in getProjectsForColumn(column.state)"
            :key="project.id"
            draggable="true"
            class="bg-white rounded-lg p-3 shadow-sm border cursor-grab hover:shadow-md transition-all"
            :class="{ 'opacity-50 scale-95': draggingId === project.id }"
            @click="navigateTo(`/project/${project.id}`)"
            @dragstart="handleDragStart($event, project)"
            @dragend="handleDragEnd"
          >
            <!-- Title -->
            <div class="font-medium text-sm text-gray-900 mb-1">
              {{ project.name }}
            </div>

            <!-- Team badges -->
            <div class="flex flex-wrap gap-1 mb-2">
              <NuxtLink
                v-for="member in getTeamMembers(project)"
                :key="member"
                :to="`/agent/${member}`"
                class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                @click.stop
              >
                {{ AGENT_EMOJIS[member] || '🤖' }} {{ member }}
              </NuxtLink>
            </div>

            <!-- Progress -->
            <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :style="{ width: `${getProgressPercent(column.state)}%`, backgroundColor: column.color }"
              ></div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span v-if="project.agents?.length">👥 {{ project.agents.length }}</span>
              <span v-if="project.lead" class="truncate">{{ project.lead }}</span>
            </div>
          </div>

          <!-- Empty column -->
          <div
            v-if="getProjectsForColumn(column.state).length === 0"
            class="text-center py-8 text-gray-400 text-sm"
          >
            Aucun projet
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Project, ProjectState } from '~/types/project'
import { KANBAN_COLUMNS } from '~/composables/useProjects'

const props = defineProps<{
  projects: Project[]
}>()

const emit = defineEmits<{
  (e: 'stateChange', projectId: string, newState: ProjectState): void
}>()

// Drag state
const draggingId = ref<string | null>(null)
const dragOverColumn = ref<string | null>(null)

// Valid transitions (state machine)
const VALID_TRANSITIONS: Record<ProjectState, ProjectState[]> = {
  backlog:  ['planning'],
  planning: ['backlog', 'build'],
  build:    ['planning', 'review'],
  review:   ['build', 'delivery'],
  delivery: ['review', 'rex'],
  rex:      ['delivery', 'done'],
  done:     [],
}

const AGENT_EMOJIS: Record<string, string> = {
  main: '🔧', winston: '🏗️', amelia: '💻', claudio: '⚙️'
}

function getTeamMembers(project: Project): string[] {
  if (Array.isArray(project.team)) {
    return project.team.map((m: any) => typeof m === 'string' ? m : m.agent)
  }
  if (Array.isArray((project as any).agents)) return (project as any).agents
  return []
}

const STATE_ICONS: Record<ProjectState, string> = {
  backlog: '📋',
  planning: '📝',
  build: '🔨',
  review: '👀',
  delivery: '🚀',
  rex: '💡',
  done: '✅',
}

const STATE_INDEX: Record<ProjectState, number> = {
  backlog: 0, planning: 1, build: 2, review: 3, delivery: 4, rex: 5, done: 6
}

function getIcon(state: ProjectState): string {
  return STATE_ICONS[state] || '📁'
}

function getProgressPercent(state: ProjectState): number {
  return Math.round((STATE_INDEX[state] / 6) * 100)
}

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

async function handleDrop(event: DragEvent, newState: ProjectState) {
  event.preventDefault()
  const projectId = event.dataTransfer?.getData('text/plain')

  if (projectId) {
    const project = props.projects.find(p => p.id === projectId)
    if (project && project.state !== newState) {
      // Validate transition
      const validTargets = VALID_TRANSITIONS[project.state] || []
      if (!validTargets.includes(newState)) {
        draggingId.value = null
        dragOverColumn.value = null
        return
      }

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: newState,
            message: `State changé: ${project.state} → ${newState} (drag & drop)`
          })
        })
        if (response.ok) {
          emit('stateChange', projectId, newState)
        }
      } catch (error) {
        console.error('Failed to update project state:', error)
      }
    }
  }

  draggingId.value = null
  dragOverColumn.value = null
}

const columns = KANBAN_COLUMNS

function getProjectsForColumn(state: ProjectState): Project[] {
  return props.projects.filter(p => p.state === state)
}
</script>
