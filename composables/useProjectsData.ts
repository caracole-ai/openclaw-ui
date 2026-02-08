import { ref, computed } from 'vue'
import type { Project, ProjectStatus } from '~/types/projects'

/**
 * Kanban column configuration
 */
export const KANBAN_COLUMNS = [
  { status: 'planning' as ProjectStatus, label: 'Planification', icon: '📝', borderColor: 'border-gray-400' },
  { status: 'in-progress' as ProjectStatus, label: 'En cours', icon: '🔄', borderColor: 'border-blue-500' },
  { status: 'review' as ProjectStatus, label: 'En revue', icon: '👀', borderColor: 'border-purple-500' },
  { status: 'paused' as ProjectStatus, label: 'En pause', icon: '⏸️', borderColor: 'border-yellow-500' },
  { status: 'completed' as ProjectStatus, label: 'Terminé', icon: '✅', borderColor: 'border-green-500' }
] as const

/**
 * Normalize project status (passthrough - no mapping)
 */
export function normalizeProjectStatus(status: string): ProjectStatus {
  return status as ProjectStatus
}

/**
 * Normalize a project's status field
 * Returns a new project object with normalized status
 */
export function normalizeProject(project: Project): Project {
  return {
    ...project,
    status: normalizeProjectStatus(project.status)
  }
}

/**
 * Normalize an array of projects
 */
export function normalizeProjects(projects: Project[]): Project[] {
  return projects.map(normalizeProject)
}

/**
 * Composable for projects data with normalization
 */
export function useProjectsData() {
  const rawProjects = ref<Project[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)
  
  // Normalized projects (review → in-progress)
  const projects = computed(() => normalizeProjects(rawProjects.value))
  
  // Column configuration
  const columns = KANBAN_COLUMNS
  
  // Get projects for a specific column
  function getProjectsForColumn(status: ProjectStatus): Project[] {
    return projects.value.filter(p => p.status === status)
  }
  
  // Stats
  const stats = computed(() => ({
    total: projects.value.length,
    byStatus: Object.fromEntries(
      columns.map(col => [col.status, getProjectsForColumn(col.status).length])
    ),
    stale: projects.value.filter(p => p.isStale).length,
    inProgress: getProjectsForColumn('in-progress').length
  }))
  
  // Fetch projects
  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      rawProjects.value = data.projects || []
    } catch (e) {
      error.value = e as Error
      console.error('Failed to fetch projects:', e)
    } finally {
      loading.value = false
    }
  }
  
  // Update raw projects (e.g., after local mutation)
  function setProjects(newProjects: Project[]) {
    rawProjects.value = newProjects
  }
  
  return {
    // State
    projects,
    rawProjects,
    loading,
    error,
    columns,
    stats,
    
    // Methods
    fetchProjects,
    setProjects,
    getProjectsForColumn,
    
    // Utilities (exported for direct use)
    normalizeProjectStatus,
    normalizeProject,
    normalizeProjects
  }
}
