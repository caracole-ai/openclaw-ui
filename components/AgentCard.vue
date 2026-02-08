<template>
  <!-- Vue compacte -->
  <NuxtLink 
    v-if="compact"
    :to="`/agent/${agent.id}`"
    class="bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-shadow flex items-center gap-2"
    :class="borderClass"
  >
    <div 
      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
      :class="avatarClass"
    >
      {{ initial }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="font-medium text-gray-900 truncate text-sm">{{ agent.name }}</div>
      <div class="text-xs text-gray-500">{{ formatTokens(agent.totalTokens) }}</div>
    </div>
    <AgentStatusBadge :status="agent.status" size="sm" />
  </NuxtLink>

  <!-- Vue détaillée -->
  <div 
    v-else
    class="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
    :class="borderClass"
  >
    <!-- Header : Avatar + Nom + Badges -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <div 
          class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          :class="avatarClass"
        >
          {{ initial }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <NuxtLink 
              :to="`/agent/${agent.id}`"
              class="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {{ agent.name }}
            </NuxtLink>
            <!-- Team Badge -->
            <span 
              class="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded"
              :class="teamBadgeClass"
            >
              {{ agent.team }}
            </span>
          </div>
          <p class="text-xs text-gray-500 font-mono">{{ agent.id }}</p>
        </div>
      </div>
      <AgentStatusBadge :status="agent.status" />
    </div>

    <!-- Stats principales -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <!-- Tokens -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="text-xs text-gray-500 mb-1">Tokens</div>
        <div class="font-semibold text-gray-900">{{ formatTokens(agent.totalTokens) }}</div>
      </div>
      
      <!-- Contexte utilisé -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="text-xs text-gray-500 mb-1">Contexte</div>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full transition-all"
              :class="percentBarClass"
              :style="{ width: `${agent.maxPercentUsed}%` }"
            ></div>
          </div>
          <span 
            class="text-sm font-medium"
            :class="percentTextClass"
          >{{ agent.maxPercentUsed }}%</span>
        </div>
      </div>
    </div>

    <!-- Modèle + Sessions Badge -->
    <div class="flex items-center justify-between text-sm mb-3">
      <div class="flex items-center gap-2">
        <span 
          v-if="agent.model"
          class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium"
        >
          {{ formatModel(agent.model) }}
        </span>
        <!-- Sessions Badge (clickable) -->
        <button
          v-if="displayedSessions.length > 0"
          @click.stop="sessionsExpanded = !sessionsExpanded"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all"
          :class="sessionsExpanded 
            ? 'bg-blue-500 text-white' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'"
        >
          <span>{{ displayedSessions.length }} session{{ displayedSessions.length > 1 ? 's' : '' }}</span>
          <svg 
            class="w-3 h-3 transition-transform" 
            :class="{ 'rotate-180': sessionsExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span v-else class="text-gray-500 text-xs">
          Aucune session
        </span>
      </div>
      <span class="text-gray-500 text-xs">
        {{ formatAge(agent.lastActivity) }}
      </span>
    </div>

    <!-- Sessions Accordion (inline) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <div 
        v-if="sessionsExpanded && displayedSessions.length > 0" 
        class="overflow-hidden"
      >
        <div class="space-y-2 pt-2 border-t border-gray-100">
          <div 
            v-for="session in displayedSessions" 
            :key="session.sessionId"
            class="bg-gray-50 rounded-lg p-3 text-sm"
          >
            <!-- Session header -->
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-700 truncate flex-1">
                {{ formatSessionContext(session.context) }}
              </span>
              <div class="flex items-center gap-2 ml-2">
                <span 
                  class="px-1.5 py-0.5 text-[10px] rounded"
                  :class="getSessionStatusClass(session)"
                >
                  {{ session.ageMs < 120000 ? 'active' : 'idle' }}
                </span>
                <!-- Clear button -->
                <button
                  @click.stop="clearSession(session)"
                  class="px-1.5 py-0.5 text-[10px] rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  :disabled="clearingSession === session.sessionId"
                  title="Vider le contexte de cette session"
                >
                  {{ clearingSession === session.sessionId ? '...' : '🗑️' }}
                </button>
              </div>
            </div>
            
            <!-- Session stats -->
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span class="text-gray-500">Tokens</span>
                <div class="font-semibold text-gray-900">{{ formatTokens(session.totalTokens) }}</div>
              </div>
              <div>
                <span class="text-gray-500">Contexte</span>
                <div class="font-semibold" :class="getPercentClass(session.percentUsed)">
                  {{ session.percentUsed }}%
                </div>
              </div>
              <div>
                <span class="text-gray-500">Modèle</span>
                <div class="font-semibold text-gray-900">{{ formatModel(session.model) }}</div>
              </div>
            </div>

            <!-- Context progress bar -->
            <div class="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all"
                :class="getPercentBarClass(session.percentUsed)"
                :style="{ width: `${session.percentUsed}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AgentStatus, AgentTeam, SessionInfo } from '~/types/agents'

const props = defineProps<{
  agent: AgentStatus
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'sessionCleared', sessionId: string): void
}>()

// Accordion state - open by default
const sessionsExpanded = ref(true)

// Clear session state
const clearingSession = ref<string | null>(null)

async function clearSession(session: SessionInfo) {
  const confirmed = confirm(
    `Vider le contexte de ${props.agent.name} - ${session.context} ?\n\n` +
    `Cette action est irréversible.\n` +
    `Tokens actuels : ${formatTokens(session.totalTokens)}`
  )
  
  if (!confirmed) return
  
  clearingSession.value = session.sessionId
  
  try {
    const response = await fetch('/api/sessions/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey: session.key,
        message: '/clear'
      })
    })
    
    if (response.ok) {
      alert(`✅ Contexte vidé pour ${props.agent.name} - ${session.context}`)
      emit('sessionCleared', session.sessionId)
    } else {
      const error = await response.json()
      alert(`❌ Erreur: ${error.statusMessage || 'Impossible de vider le contexte'}`)
    }
  } catch (error: any) {
    alert(`❌ Erreur: ${error.message}`)
  } finally {
    clearingSession.value = null
  }
}

// Filter sessions: hide "main" if multiple sessions exist
const displayedSessions = computed(() => {
  const sessions = props.agent.sessions || []
  if (sessions.length <= 1) {
    return sessions
  }
  // Multi-sessions: filter out "main"
  return sessions.filter(s => s.context !== 'main')
})

const initial = computed(() => 
  props.agent.name.charAt(0).toUpperCase()
)

const borderClass = computed(() => {
  switch (props.agent.status) {
    case 'online': return 'border-l-4 border-l-green-500'
    case 'idle': return 'border-l-4 border-l-yellow-500'
    case 'offline': return 'border-l-4 border-l-gray-300'
    default: return ''
  }
})

const avatarClass = computed(() => {
  switch (props.agent.status) {
    case 'online': return 'bg-green-100 text-green-700'
    case 'idle': return 'bg-yellow-100 text-yellow-700'
    case 'offline': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
})

const teamBadgeClass = computed(() => {
  const team: AgentTeam = props.agent.team || 'unknown'
  switch (team) {
    case 'code': return 'bg-blue-100 text-blue-700'
    case 'writing': return 'bg-amber-100 text-amber-700'
    case 'free': return 'bg-emerald-100 text-emerald-700'
    default: return 'bg-gray-100 text-gray-500'
  }
})

const percentBarClass = computed(() => {
  const p = props.agent.maxPercentUsed
  if (p >= 80) return 'bg-red-500'
  if (p >= 60) return 'bg-yellow-500'
  return 'bg-green-500'
})

const percentTextClass = computed(() => {
  const p = props.agent.maxPercentUsed
  if (p >= 80) return 'text-red-600'
  if (p >= 60) return 'text-yellow-600'
  return 'text-gray-600'
})

function getPercentBarClass(p: number): string {
  if (p >= 80) return 'bg-red-500'
  if (p >= 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

function getPercentClass(p: number): string {
  if (p >= 80) return 'text-red-600'
  if (p >= 60) return 'text-yellow-600'
  return 'text-gray-900'
}

function getSessionStatusClass(session: SessionInfo): string {
  if (session.ageMs < 120000) {
    return 'bg-green-100 text-green-700'
  }
  return 'bg-gray-200 text-gray-600'
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return tokens.toString()
}

function formatModel(model: string): string {
  if (model.includes('opus')) return 'Opus'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('gpt-4')) return 'GPT-4'
  return model.split('/').pop()?.split('-')[0] ?? model
}

function formatSessionContext(context: string): string {
  // Extract meaningful part from session context
  // e.g., "mattermost:channel:xxx" → "mattermost"
  if (context.includes(':')) {
    const parts = context.split(':')
    if (parts[0] === 'mattermost') {
      return `💬 ${parts[1] === 'channel' ? 'Canal' : 'DM'}`
    }
    if (parts[0] === 'telegram') {
      return `📱 Telegram`
    }
    return parts[0]
  }
  return context || 'Session'
}

function formatAge(timestamp: string | null): string {
  if (!timestamp) return 'Jamais'
  
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  if (diffSeconds < 60) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes}m`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  
  return new Date(timestamp).toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short'
  })
}
</script>
