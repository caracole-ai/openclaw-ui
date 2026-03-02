<template>
  <div>
    <!-- Breadcrumb -->
    <Breadcrumb />

    <!-- Loading -->
    <div v-if="pending" class="max-w-7xl mx-auto px-4 py-8">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        <div class="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>

    <!-- Erreur -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 py-8">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 class="text-lg font-medium text-red-800">Agent non trouvé</h2>
        <p class="text-red-600 mt-2">{{ error.message }}</p>
        <NuxtLink to="/" class="inline-block mt-4 text-red-700 underline">
          Retour au dashboard
        </NuxtLink>
      </div>
    </div>

    <!-- Contenu -->
    <main v-else-if="agent" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header agent -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div 
              class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              :class="avatarClass"
            >
              {{ agent.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-gray-900">{{ agent.name }}</h1>
                <!-- Badge équipe -->
                <span 
                  class="px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="agentTeam.color"
                >
                  {{ agentTeam.icon }} {{ agentTeam.label }}
                </span>
                <span v-if="agent.role" class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {{ agent.role }}
                </span>
              </div>
              <p class="text-gray-500 font-mono text-sm">{{ agent.id }}</p>
              <!-- Dernière activité -->
              <p v-if="lastActivityText" class="text-xs text-gray-400 mt-1">{{ lastActivityText }}</p>
            </div>
          </div>
          <AgentStatusBadge :status="agent.status" />
        </div>

        <!-- Stats rapides -->
        <div class="grid grid-cols-4 gap-4 mt-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500">Sessions actives</div>
            <div class="text-2xl font-bold">{{ liveStats.activeSessions }}</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500">Tokens utilisés</div>
            <div class="text-2xl font-bold">{{ formatTokens(liveStats.totalTokens) }}</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500">Contexte utilisé</div>
            <div class="text-2xl font-bold" :class="percentClass">{{ liveStats.maxPercentUsed }}%</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500">Modèle</div>
            <div class="text-2xl font-bold">{{ formatModel(agent.model) }}</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="border-b">
          <nav class="flex -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-4 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Tab: Projets -->
          <div v-if="activeTab === 'projects'">
            <div v-if="agentProjects.length" class="space-y-3">
              <NuxtLink 
                v-for="project in agentProjects" 
                :key="project.id"
                :to="`/project/${project.id}`"
                class="block border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">
                      {{ project.type === 'writing' ? '✍️' : project.type === 'code' ? '💻' : '📁' }}
                    </span>
                    <div>
                      <div class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {{ project.name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ getAgentRole(project) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span 
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="{
                        'bg-gray-100 text-gray-700': project.state === 'backlog',
                        'bg-blue-100 text-blue-700': project.state === 'planning',
                        'bg-amber-100 text-amber-700': project.state === 'build',
                        'bg-purple-100 text-purple-700': project.state === 'review',
                        'bg-emerald-100 text-emerald-700': project.state === 'delivery',
                        'bg-pink-100 text-pink-700': project.state === 'rex',
                        'bg-green-100 text-green-700': project.state === 'done'
                      }"
                    >
                      {{ project.state || project.status }}
                    </span>
                    <span class="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">→</span>
                  </div>
                </div>
                <!-- Progress bar -->
                <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-blue-500 rounded-full transition-all"
                    :style="{ width: `${project.progress || 0}%` }"
                  ></div>
                </div>
              </NuxtLink>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              <span class="text-4xl mb-2 block">📭</span>
              Aucun projet assigné à cet agent
            </div>
          </div>

          <!-- Tab: Skills -->
          <div v-if="activeTab === 'skills'">
            <!-- Agent skills -->
            <div v-if="agent.skills && agent.skills.length" class="mb-6">
              <h3 class="text-sm font-medium text-gray-700 mb-3">Skills assignés ({{ agent.skills.length }})</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div
                  v-for="skillId in agent.skills"
                  :key="skillId"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border group hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-lg">📦</span>
                    <span class="font-medium text-gray-900">{{ skillId }}</span>
                  </div>
                  <button
                    @click="removeSkill(skillId)"
                    class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Available skills to add -->
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Skills disponibles</h3>
              <div v-if="availableSkills.length" class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  v-for="skill in availableSkills"
                  :key="skill.id"
                  @click="addSkill(skill.id)"
                  class="flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-lg">📦</span>
                    <div>
                      <div class="font-medium text-gray-900">{{ skill.name || skill.id }}</div>
                      <div v-if="skill.description" class="text-xs text-gray-500 line-clamp-1">{{ skill.description }}</div>
                    </div>
                  </div>
                  <span class="text-blue-500">+</span>
                </button>
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                Tous les skills sont déjà assignés
              </div>
            </div>
          </div>

          <!-- Tab: Fichiers -->
          <div v-if="activeTab === 'files'">
            <div v-if="agent.files && Object.keys(agent.files).length" class="space-y-4">
              <div 
                v-for="(content, filename) in agent.files" 
                :key="filename"
                class="border rounded-lg overflow-hidden"
              >
                <div class="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <span class="font-mono text-sm font-medium">{{ filename }}</span>
                </div>
                <pre class="p-4 text-sm overflow-x-auto bg-gray-900 text-gray-100"><code>{{ content }}</code></pre>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              Aucun fichier de configuration trouvé
            </div>
          </div>

          <!-- Tab: Sessions -->
          <div v-if="activeTab === 'sessions'">
            <div v-if="liveSessions.length" class="space-y-3">
              <div 
                v-for="session in liveSessions" 
                :key="session.sessionKey"
                class="border rounded-lg p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium font-mono text-sm">{{ formatSessionKey(session.sessionKey) }}</span>
                  <span class="text-sm text-gray-500">{{ formatTokens(session.totalTokens) }} tokens</span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                  <span>{{ session.model || '-' }}</span>
                  <span>{{ session.percentUsed }}% contexte</span>
                </div>
                <!-- Token bar -->
                <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all"
                    :class="session.percentUsed >= 80 ? 'bg-red-500' : session.percentUsed >= 50 ? 'bg-yellow-500' : 'bg-blue-500'"
                    :style="{ width: `${Math.min(session.percentUsed, 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              Aucune session active
            </div>
          </div>

          <!-- Tab: Channels -->
          <div v-if="activeTab === 'channels'">
            <div v-if="agent.channels?.length" class="space-y-2">
              <div 
                v-for="channel in agent.channels" 
                :key="channel.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <span class="text-lg">{{ channel.type === 'channel' ? '#' : '💬' }}</span>
                  <span class="font-medium">{{ channel.displayName || channel.name }}</span>
                </div>
                <span class="text-sm text-gray-500">{{ channel.platform }}</span>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              Aucun channel connecté
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const route = useRoute()
const agentId = computed(() => route.params.id as string)

const activeTab = ref('projects')
const tabs = [
  { id: 'projects', label: 'Projets' },
  { id: 'skills', label: 'Skills' },
  { id: 'files', label: 'Fichiers' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'channels', label: 'Channels' },
]

// Fetch agent details (includes live session data)
const { data: agent, pending, error, refresh } = await useFetch(`/api/agents/${agentId.value}`)

// Auto-refresh every 10s (client only)
let pollTimer: ReturnType<typeof setInterval> | null = null
if (!import.meta.server) {
  pollTimer = setInterval(() => refresh(), 10_000)
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
}

// Projects come from the agent API (source of truth: SQLite)
const agentProjects = computed(() => agent.value?.projects || [])

// Fetch all skills
const { data: allSkillsData } = await useFetch('/api/skills')
const allSkills = computed(() => allSkillsData.value?.skills || [])

// Available skills (not yet assigned to this agent)
const availableSkills = computed(() => {
  const agentSkillIds = agent.value?.skills || []
  return allSkills.value.filter(skill => !agentSkillIds.includes(skill.id))
})

// Live data now included in agent response
const liveStats = computed(() => ({
  totalTokens: agent.value?.totalTokens || 0,
  activeSessions: agent.value?.activeSessions || 0,
  maxPercentUsed: agent.value?.maxPercentUsed || 0,
}))
const liveSessions = computed(() => agent.value?.sessions || [])

// Skills management
async function addSkill(skillId: string) {
  try {
    await $fetch(`/api/agents/${agentId.value}/skills`, {
      method: 'POST',
      body: { skillId }
    })
    await refresh()
  } catch (err: any) {
    console.error('Failed to add skill:', err)
    alert(`Erreur: ${err.message || 'Impossible d\'ajouter le skill'}`)
  }
}

async function removeSkill(skillId: string) {
  try {
    await $fetch(`/api/agents/${agentId.value}/skills`, {
      method: 'DELETE',
      body: { skillId }
    })
    await refresh()
  } catch (err: any) {
    console.error('Failed to remove skill:', err)
    alert(`Erreur: ${err.message || 'Impossible de retirer le skill'}`)
  }
}

useHead({
  title: computed(() => `${agent.value?.name || agentId.value} - OpenClaw`)
})

// Set agent name in route meta for breadcrumb
watch(() => agent.value, (newAgent) => {
  if (newAgent?.name) {
    route.meta.agentName = newAgent.name
  }
}, { immediate: true })

const avatarClass = computed(() => {
  switch (agent.value?.status) {
    case 'online': return 'bg-green-100 text-green-700'
    case 'idle': return 'bg-yellow-100 text-yellow-700'
    case 'offline': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
})

const percentClass = computed(() => {
  const p = liveStats.value?.maxPercentUsed ?? 0
  if (p >= 80) return 'text-red-600'
  if (p >= 60) return 'text-yellow-600'
  return 'text-gray-900'
})

// formatTokens, formatModel, formatAge, formatSessionKey are auto-imported from utils/format.ts

function getAgentRole(project: any): string {
  // Check team first
  const teamMember = project.team?.find((t: any) => t.agent === agentId.value)
  if (teamMember?.role) return teamMember.role
  
  // Check if owner
  if (project.owner === agentId.value) return 'owner'
  
  // Fallback
  return 'assigné'
}

// Get channel display name from context ID
function getChannelDisplayName(contextId: string): string {
  const channel = agent.value?.channels?.find((c: any) => c.name === contextId)
  return channel?.displayName || channel?.name || contextId
}

// Team & role from source of truth (agents.json fields)
const TEAM_MAP: Record<string, { label: string; icon: string; color: string }> = {
  code: { label: 'Code', icon: '💻', color: 'bg-blue-100 text-blue-700' },
  writing: { label: 'Écriture', icon: '✍️', color: 'bg-purple-100 text-purple-700' },
  system: { label: 'System', icon: '🔧', color: 'bg-orange-100 text-orange-700' },
  free: { label: 'Libre', icon: '🌟', color: 'bg-yellow-100 text-yellow-700' },
}
const agentTeam = computed(() => {
  const team = agent.value?.team || 'unknown'
  return TEAM_MAP[team] || { label: team, icon: '❓', color: 'bg-gray-100 text-gray-700' }
})

// Format last activity — prefer live data
const lastActivityText = computed(() => {
  const ts = agent.value?.lastActivity
  if (!ts) return null
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  if (diffSeconds < 60) return `Actif il y a ${diffSeconds}s`
  if (diffMinutes < 60) return `Actif il y a ${diffMinutes}m`
  if (diffHours < 24) return `Actif il y a ${diffHours}h`
  return `Actif le ${date.toLocaleDateString('fr-FR')}`
})
</script>
