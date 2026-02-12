import { ref, computed } from 'vue'
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

export function useProjects() {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { on } = useWebSocket()

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{ projects: Project[] }>('/api/sources/projects')
      projects.value = data.projects || []
    } catch (err: any) {
      error.value = err.message || 'Erreur chargement projets'
    } finally {
      loading.value = false
    }
  }

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

  on('project:stateChanged', (data: { id: string; state: ProjectState }) => {
    const p = projects.value.find(p => p.id === data.id)
    if (p) p.state = data.state
  })

  on('project:created', (data: Project) => {
    projects.value.push(data)
  })

  fetchProjects()

  return { projects, projectsByState, getProject, fetchProjects, loading, error, KANBAN_COLUMNS }
}
