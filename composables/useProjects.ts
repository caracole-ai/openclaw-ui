import { ref, computed, onUnmounted } from 'vue'
import type { Project, ProjectState } from '~/types/project'

export interface KanbanColumn {
  state: ProjectState
  label: string
  color: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { state: 'backlog', label: 'Backlog', color: '#6B7280' },
  { state: 'planning', label: 'Planning', color: '#3B82F6' },
  { state: 'build', label: 'Build', color: '#F59E0B' },
  { state: 'review', label: 'Review', color: '#8B5CF6' },
  { state: 'delivery', label: 'Delivery', color: '#10B981' },
  { state: 'rex', label: 'REX', color: '#EC4899' },
  { state: 'done', label: 'Done', color: '#059669' },
]

// Singleton state
const projects = ref<Project[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false
let pollTimer: ReturnType<typeof setInterval> | null = null
let subscribers = 0

const POLL_INTERVAL = 10_000

async function fetchProjects() {
  if (!fetched) loading.value = true
  error.value = null
  try {
    const data = await $fetch<{ projects: Project[] }>('/api/projects')
    projects.value = data.projects || []
    fetched = true
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement projets'
  } finally {
    loading.value = false
  }
}

function startPolling() {
  if (pollTimer || import.meta.server) return
  fetchProjects()
  pollTimer = setInterval(() => fetchProjects(), POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function useProjects() {
  function getProject(id: string): Project | undefined {
    return projects.value.find(p => p.id === id)
  }

  const projectsByState = computed(() => {
    const map: Record<ProjectState, Project[]> = {
      backlog: [], planning: [], build: [], review: [], delivery: [], rex: [], done: []
    }
    for (const project of projects.value) {
      if (map[project.state]) {
        map[project.state].push(project)
      }
    }
    return map
  })

  // Auto-manage polling lifecycle (client only)
  if (!import.meta.server) {
    subscribers++
    startPolling()

    onUnmounted(() => {
      subscribers--
      if (subscribers <= 0) {
        subscribers = 0
        stopPolling()
      }
    })
  }

  return { projects, projectsByState, getProject, fetchProjects, loading, error, KANBAN_COLUMNS }
}
