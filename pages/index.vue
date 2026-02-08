<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Global Metrics -->
    <section class="mb-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">📊 Vue d'ensemble</h2>
      
      <!-- Loading state -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div class="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>

      <!-- Stats cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">👥</span>
            <span class="text-sm font-medium text-gray-500">Agents</span>
          </div>
          <div class="text-3xl font-bold text-gray-900">{{ metrics.totalAgents }}</div>
          <div class="text-sm text-green-600 mt-1">
            {{ metrics.activeAgents }} actif{{ metrics.activeAgents > 1 ? 's' : '' }}
          </div>
          
          <!-- Active agents with their projects -->
          <div v-if="activeAgentsWithProjects.length > 0" class="mt-4 pt-3 border-t border-gray-100 space-y-2">
            <div 
              v-for="agent in activeAgentsWithProjects" 
              :key="agent.id"
              class="flex items-center gap-2 text-sm"
            >
              <NuxtLink 
                :to="`/agent/${agent.id}`"
                class="font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                {{ formatAgentName(agent.id) }}
              </NuxtLink>
              <span class="text-gray-400">→</span>
              <div class="flex flex-wrap gap-1">
                <NuxtLink
                  v-for="project in agent.projects"
                  :key="project.id"
                  :to="`/project/${project.id}`"
                  class="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  {{ project.name }}
                </NuxtLink>
                <span v-if="agent.projects.length === 0" class="text-xs">🫡</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">📋</span>
            <span class="text-sm font-medium text-gray-500">Projets</span>
          </div>
          <div class="text-3xl font-bold text-gray-900">{{ metrics.totalProjects }}</div>
          
          <!-- Status breakdown -->
          <div class="flex flex-col gap-1 mt-2 text-xs">
            <span class="text-gray-500">📝 Planification : {{ projectsByStatus.planning }}</span>
            <span class="text-blue-600">🔄 En cours : {{ projectsByStatus.inProgress }}</span>
            <span class="text-purple-600">👀 En revue : {{ projectsByStatus.review }}</span>
            <span class="text-green-600">✅ Terminé : {{ projectsByStatus.completed }}</span>
          </div>
          
          <!-- Active projects preview -->
          <div v-if="activeProjects.length > 0" class="mt-4 pt-3 border-t border-gray-100 space-y-3">
            <div 
              v-for="project in activeProjects.slice(0, 2)" 
              :key="project.id"
              class="space-y-2"
            >
              <NuxtLink 
                :to="`/project/${project.id}`"
                class="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate"
              >
                {{ getStatusEmoji(project.status) }} {{ project.name }}
              </NuxtLink>
              <div v-if="getProjectAgents(project).length > 0" class="flex flex-wrap gap-1">
                <NuxtLink
                  v-for="agent in getProjectAgents(project)"
                  :key="agent"
                  :to="`/agent/${agent}`"
                  class="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  {{ formatAgentName(agent) }}
                </NuxtLink>
              </div>
            </div>
            <div v-if="activeProjects.length > 2" class="text-xs text-gray-400">
              +{{ activeProjects.length - 2 }} autre{{ activeProjects.length > 3 ? 's' : '' }}
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">💬</span>
            <span class="text-sm font-medium text-gray-500">Sessions</span>
          </div>
          <div class="text-3xl font-bold text-gray-900">{{ metrics.totalSessions }}</div>
          <div class="text-sm text-purple-600 mt-1">
            {{ formatTokens(metrics.totalTokens) }} tokens
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">🧪</span>
            <span class="text-sm font-medium text-gray-500">Tests</span>
          </div>
          <div class="text-3xl font-bold text-gray-900">—</div>
          <div class="text-sm text-gray-400 mt-1">
            Non connecté
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Navigation -->
    <section>
      <h2 class="text-2xl font-bold text-gray-900 mb-6">🚀 Navigation</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Agents -->
        <NuxtLink 
          to="/agents" 
          class="group bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg hover:border-blue-300 transition-all"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-200 transition-colors">
              🤖
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Agents</h3>
              <p class="text-sm text-gray-500">Dashboard agents</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm">
            Statuts, métriques, sessions et activité de tous les agents configurés.
          </p>
          <div class="mt-4 text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Voir les agents →
          </div>
        </NuxtLink>

        <!-- Projets -->
        <NuxtLink 
          to="/projets" 
          class="group bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg hover:border-green-300 transition-all"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-green-200 transition-colors">
              📋
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Projets</h3>
              <p class="text-sm text-gray-500">Vue Kanban & liste</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm">
            Suivi des projets, progression, statuts et assignations.
          </p>
          <div class="mt-4 text-green-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Voir les projets →
          </div>
        </NuxtLink>

        <!-- Tests -->
        <NuxtLink 
          to="/tests" 
          class="group bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg hover:border-purple-300 transition-all"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-purple-200 transition-colors">
              🧪
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Tests</h3>
              <p class="text-sm text-gray-500">Playwright & Vitest</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm">
            Exécution et résultats des tests E2E et unitaires.
          </p>
          <div class="mt-4 text-purple-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Voir les tests →
          </div>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useAgentsStatus } from '~/composables/useAgentsStatus'
import { useProjectsData } from '~/composables/useProjectsData'

useHead({
  title: 'OpenClaw - Dashboard'
})

// Use real composables for reactive data
const { agents, pending: agentsPending } = useAgentsStatus()
const { projects, loading: projectsLoading, fetchProjects } = useProjectsData()

// Combined loading state
const loading = computed(() => agentsPending.value || projectsLoading.value)

// Active projects for preview (in-progress + review)
const activeProjects = computed(() => {
  return (projects.value || []).filter(p => p.status === 'in-progress' || p.status === 'review')
})

// Active agents with their assigned projects (in-progress only)
const activeAgentsWithProjects = computed(() => {
  const onlineAgents = (agents.value || []).filter(a => a.status === 'online')
  const inProgressProjects = activeProjects.value
  
  return onlineAgents.map(agent => {
    // Find projects where this agent is assigned
    const agentProjects = inProgressProjects.filter(p => 
      p.assignees?.includes(agent.id) || 
      p.lead === agent.id || 
      p.team?.includes(agent.id)
    )
    return {
      id: agent.id,
      name: agent.name,
      projects: agentProjects
    }
  })
})

// Projects count by status
const projectsByStatus = computed(() => {
  const list = projects.value || []
  return {
    planning: list.filter(p => p.status === 'planning').length,
    inProgress: list.filter(p => p.status === 'in-progress').length,
    review: list.filter(p => p.status === 'review').length,
    completed: list.filter(p => p.status === 'completed').length,
    paused: list.filter(p => p.status === 'paused').length
  }
})

// Reactive metrics from real data
const metrics = computed(() => {
  const agentsList = agents.value || []
  const projectsList = projects.value || []
  
  // Count total sessions from all agents
  const totalSessions = agentsList.reduce((sum, a) => sum + (a.sessions?.length || 0), 0)
  
  return {
    // Agents - use real status (online = active)
    totalAgents: agentsList.length,
    activeAgents: agentsList.filter(a => a.status === 'online').length,
    
    // Projects - use normalized data (review already mapped to in-progress)
    totalProjects: projectsList.length,
    activeProjects: projectsList.filter(p => p.status === 'in-progress').length,
    
    // Sessions - derived from agents data
    totalSessions,
    totalTokens: agentsList.reduce((sum, a) => sum + (a.totalTokens || 0), 0)
  }
})

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}k`
  }
  return tokens.toString()
}

// Get agents from project (supports both assignees and team/lead)
function getProjectAgents(project: any): string[] {
  if (project.assignees?.length) {
    return project.assignees
  }
  const agents: string[] = []
  if (project.lead) agents.push(project.lead)
  if (project.team?.length) {
    project.team.forEach((a: string) => {
      if (!agents.includes(a)) agents.push(a)
    })
  }
  return agents
}

// Format agent name for display (remove suffix like -dev, -architecte)
function formatAgentName(agent: string): string {
  return agent.split('-')[0]
}

// Get emoji for project status
function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    'planning': '📝',
    'in-progress': '🔄',
    'review': '👀',
    'paused': '⏸️',
    'completed': '✅'
  }
  return emojis[status] || '📋'
}

let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchProjects()
  // Refresh every 30s
  refreshInterval = setInterval(() => {
    fetchProjects()
  }, 30000)
})

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
