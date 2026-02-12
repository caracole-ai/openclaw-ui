<template>
  <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo + Nav -->
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="flex items-center gap-2">
            <span class="text-2xl">🦞</span>
            <span class="text-xl font-bold text-gray-900">OpenClaw</span>
          </NuxtLink>
          <nav class="hidden sm:flex items-center gap-1">
            <NuxtLink to="/agents" class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" active-class="bg-gray-100 text-gray-900 font-medium">Agents</NuxtLink>
            <NuxtLink to="/projets" class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" active-class="bg-gray-100 text-gray-900 font-medium">Projets</NuxtLink>
            <NuxtLink to="/skills" class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" active-class="bg-gray-100 text-gray-900 font-medium">Skills</NuxtLink>
            <NuxtLink to="/tokens" class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" active-class="bg-gray-100 text-gray-900 font-medium">Tokens</NuxtLink>
            <NuxtLink to="/tests" class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" active-class="bg-gray-100 text-gray-900 font-medium">🧪 Tests</NuxtLink>
          </nav>
          <!-- WebSocket status indicator -->
          <span 
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :class="{
              'bg-green-500': wsStatus === 'connected',
              'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
              'bg-gray-400': wsStatus === 'disconnected',
              'bg-red-500': wsStatus === 'error'
            }"
            :title="`WebSocket: ${wsStatus}`"
          ></span>
        </div>

        <!-- Stats rapides -->
        <div class="flex items-center gap-4">
          <!-- Compteurs de statut -->
          <div class="flex items-center gap-3 text-sm">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span class="font-medium">{{ stats.online }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span class="font-medium">{{ stats.idle }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-gray-400"></span>
              <span class="font-medium">{{ stats.offline }}</span>
            </div>
          </div>

          <!-- Divider -->
          <div class="w-px h-6 bg-gray-200"></div>

          <!-- Tokens -->
          <div class="text-sm">
            <span class="text-gray-500">Tokens:</span>
            <span class="font-semibold ml-1">{{ formatTokens(stats.totalTokens) }}</span>
          </div>

          <!-- Divider -->
          <div class="w-px h-6 bg-gray-200"></div>

          <!-- Thomas Widget: Time + Tokens -->
          <div 
            class="flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            :class="thomasWidgetClass"
            @click="showThomasDetails = !showThomasDetails"
            title="Session Status"
          >
            <!-- Countdown -->
            <div class="flex items-center gap-1.5">
              <span class="text-sm">⏱️</span>
              <span class="text-sm font-semibold" :class="timeTextClass">{{ countdownText }}</span>
            </div>
            
            <!-- Separator -->
            <div class="w-px h-4 bg-gray-300"></div>
            
            <!-- Token % with mini progress bar -->
            <div class="flex items-center gap-1.5">
              <div class="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="tokenProgressClass"
                  :style="{ width: `${Math.min(thomas.percent, 100)}%` }"
                ></div>
              </div>
              <span class="text-xs font-semibold" :class="tokenTextClass">{{ thomas.percent }}%</span>
            </div>

            <!-- Paused badge -->
            <span v-if="thomas.pausedCount > 0" class="text-xs px-1.5 py-0.5 bg-orange-200 text-orange-800 rounded-full font-medium">
              {{ thomas.pausedCount }} ⏸️
            </span>
          </div>

          <!-- Thomas Details Popup -->
          <div 
            v-if="showThomasDetails"
            class="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-xl border p-4 z-50"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">👁️</span>
                <span class="font-semibold">Thomas v3 — Session</span>
              </div>
              <span 
                class="w-3 h-3 rounded-full"
                :class="{
                  'bg-green-500': thomas.health === 'green',
                  'bg-yellow-500': thomas.health === 'yellow',
                  'bg-red-500': thomas.health === 'red'
                }"
              ></span>
            </div>
            
            <!-- Time section -->
            <div class="mb-3 p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">⏱️ Temps restant</span>
                <span class="text-lg font-bold" :class="timeTextClass">{{ countdownText }}</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">Reset à {{ nextResetTime }}</div>
            </div>

            <!-- Tokens section -->
            <div class="mb-3 p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-500">📊 Tokens</span>
                <span class="text-lg font-bold" :class="tokenTextClass">{{ thomas.percent }}%</span>
              </div>
              <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="tokenProgressClass"
                  :style="{ width: `${Math.min(thomas.percent, 100)}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>{{ formatTokens(thomas.tokensUsed) }}</span>
                <span>~{{ formatTokens(thomas.estimatedMax) }}</span>
              </div>
            </div>

            <!-- Stats -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Schedule</span>
                <span class="font-medium text-xs">{{ thomas.schedule.join(' • ') }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Dernière calibration</span>
                <span class="font-medium">{{ thomasLastCalibrationText }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Projets en pause</span>
                <span class="font-medium" :class="thomas.pausedCount > 0 ? 'text-orange-600' : 'text-green-600'">
                  {{ thomas.pausedCount }}
                </span>
              </div>
            </div>

            <!-- Paused projects list -->
            <div v-if="thomas.pausedProjects.length > 0" class="mt-3 pt-3 border-t">
              <div class="text-xs text-gray-500 mb-2">En attente de relance :</div>
              <div class="space-y-1">
                <div 
                  v-for="p in thomas.pausedProjects" 
                  :key="p.id"
                  class="text-xs p-2 bg-orange-50 rounded flex justify-between items-center"
                >
                  <span class="font-medium truncate">{{ p.name }}</span>
                  <span class="text-gray-500">→ {{ p.assignedAgent || '?' }}</span>
                </div>
              </div>
            </div>

            <!-- Refresh button -->
            <button 
              @click.stop="refresh"
              class="mt-3 w-full py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              🔄 Rafraîchir
            </button>
          </div>

          <!-- Alerte quota -->
          <div 
            v-if="stats.nearLimit > 0"
            class="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs"
          >
            <span class="text-red-500">⚠️</span>
            <span class="text-red-700 font-medium">{{ stats.nearLimit }} > 80%</span>
          </div>

          <!-- Divider -->
          <div class="w-px h-6 bg-gray-200"></div>

          <!-- Dernière mise à jour -->
          <span class="text-xs text-gray-500">
            {{ lastRefreshText }}
          </span>

          <!-- Bouton refresh -->
          <button 
            @click="refresh"
            :disabled="pending"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <svg 
              class="w-5 h-5" 
              :class="{ 'animate-spin': pending }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAgents } from '~/composables/useAgents'
import { useWebSocket } from '~/composables/useWebSocket'

const { agents: agentsList, fetchAgents } = useAgents()
const { status: wsStatus } = useWebSocket()

// Live stats from gateway session stores
const liveData = ref<{ totalTokens: number; nearLimit: number } | null>(null)
async function fetchLiveStats() {
  try {
    liveData.value = await $fetch('/api/agents/live')
  } catch {}
}

interface Stats {
  online: number
  idle: number
  offline: number
  totalTokens: number
  nearLimit: number
}

interface PausedProject {
  id: string
  name: string
  assignedAgent: string | null
}

interface ThomasStatus {
  version: string
  nextReset: string
  hoursUntilReset: number
  schedule: string[]
  percent: number
  tokensUsed: number
  estimatedMax: number
  health: 'green' | 'yellow' | 'red'
  pausedProjects: PausedProject[]
  pausedCount: number
  lastCalibration: { timestamp: string; percent: number } | null
}

const stats = ref<Stats>({
  online: 0,
  idle: 0,
  offline: 0,
  totalTokens: 0,
  nearLimit: 0
})

const thomas = ref<ThomasStatus>({
  version: '3.0',
  nextReset: new Date().toISOString(),
  hoursUntilReset: 0,
  schedule: ['00:00', '05:00', '10:00', '15:00', '20:00'],
  percent: 0,
  tokensUsed: 0,
  estimatedMax: 50_000_000,
  health: 'green',
  pausedProjects: [],
  pausedCount: 0,
  lastCalibration: null
})

const showThomasDetails = ref(false)
const pending = ref(false)
const lastRefresh = ref<Date | null>(null)
let pollInterval: ReturnType<typeof setInterval> | null = null
let countdownInterval: ReturnType<typeof setInterval> | null = null

// Live countdown
const liveHoursUntilReset = ref(0)

// Widget background class (combines time + token alerts)
const thomasWidgetClass = computed(() => {
  // Red if tokens >= 90% OR time <= 5min
  if (thomas.value.percent >= 90 || liveHoursUntilReset.value <= 0.083) {
    return 'bg-red-100 border border-red-300'
  }
  // Orange if tokens >= 75% OR time <= 30min
  if (thomas.value.percent >= 75 || liveHoursUntilReset.value <= 0.5) {
    return 'bg-orange-100 border border-orange-300'
  }
  // Yellow if paused projects
  if (thomas.value.pausedCount > 0) {
    return 'bg-yellow-100 border border-yellow-300'
  }
  return 'bg-gray-100 hover:bg-gray-200'
})

// Time text color
const timeTextClass = computed(() => {
  if (liveHoursUntilReset.value <= 0.083) return 'text-red-700' // < 5min
  if (liveHoursUntilReset.value <= 0.5) return 'text-orange-700' // < 30min
  return 'text-gray-700'
})

// Token progress bar color
const tokenProgressClass = computed(() => {
  if (thomas.value.percent >= 90) return 'bg-red-500'
  if (thomas.value.percent >= 75) return 'bg-orange-500'
  if (thomas.value.percent >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
})

// Token text color
const tokenTextClass = computed(() => {
  if (thomas.value.percent >= 90) return 'text-red-700'
  if (thomas.value.percent >= 75) return 'text-orange-700'
  if (thomas.value.percent >= 50) return 'text-yellow-700'
  return 'text-gray-700'
})

const countdownText = computed(() => {
  const hours = Math.floor(liveHoursUntilReset.value)
  const minutes = Math.round((liveHoursUntilReset.value - hours) * 60)
  if (hours === 0) return `${minutes}min`
  return `${hours}h${minutes.toString().padStart(2, '0')}`
})

const nextResetTime = computed(() => {
  const date = new Date(thomas.value.nextReset)
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  })
})

const thomasLastCalibrationText = computed(() => {
  if (!thomas.value.lastCalibration) return 'Jamais'
  const date = new Date(thomas.value.lastCalibration.timestamp)
  return `${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (${thomas.value.lastCalibration.percent}%)`
})

const lastRefreshText = computed(() => {
  if (!lastRefresh.value) return 'Chargement...'
  const diffSeconds = Math.floor((Date.now() - lastRefresh.value.getTime()) / 1000)
  if (diffSeconds < 5) return 'À l\'instant'
  if (diffSeconds < 60) return `Il y a ${diffSeconds}s`
  const diffMinutes = Math.floor(diffSeconds / 60)
  return `Il y a ${diffMinutes}m`
})

function updateLiveCountdown() {
  const now = Date.now()
  const resetTime = new Date(thomas.value.nextReset).getTime()
  const diffMs = resetTime - now
  liveHoursUntilReset.value = Math.max(0, diffMs / (1000 * 60 * 60))
}

// Sync stats: agent status from composable, tokens from live gateway data
watch([agentsList, liveData], ([list, live]) => {
  if (!list.length) return
  stats.value = {
    online: list.filter((a: any) => a.status === 'active').length,
    idle: list.filter((a: any) => a.status === 'idle').length,
    offline: list.filter((a: any) => a.status === 'offline' || a.status === 'error').length,
    totalTokens: live?.totalTokens ?? 0,
    nearLimit: live?.nearLimit ?? 0,
  }
  lastRefresh.value = new Date()
}, { immediate: true })

async function refresh() {
  pending.value = true
  try {
    await Promise.all([fetchAgents(), fetchLiveStats()])
  } catch (e) {
    console.error('[AppHeader] Refresh error:', e)
  } finally {
    pending.value = false
  }
}

async function refreshThomas() {
  // TODO: implement when thomas/status endpoint is available
  console.log('[AppHeader] refreshThomas skipped — no endpoint yet')
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`
  return tokens.toString()
}

onMounted(() => {
  refresh()
  pollInterval = setInterval(refresh, 30_000)
  countdownInterval = setInterval(updateLiveCountdown, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>
