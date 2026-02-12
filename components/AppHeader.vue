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
          <!-- Compteurs de statut agents -->
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

          <div class="w-px h-6 bg-gray-200"></div>

          <!-- Tokens globaux -->
          <div class="text-sm">
            <span class="text-gray-500">Tokens:</span>
            <span class="font-semibold ml-1">{{ formatTokens(stats.totalTokens) }}</span>
          </div>

          <div class="w-px h-6 bg-gray-200"></div>

          <!-- Session timer widget -->
          <div
            class="flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all"
            :class="sessionWidgetClass"
          >
            <div class="flex items-center gap-1.5">
              <span class="text-sm">⏱️</span>
              <span class="text-sm font-semibold" :class="timeTextClass">{{ countdownText }}</span>
            </div>
            <div class="w-px h-4 bg-gray-300"></div>
            <div class="flex items-center gap-1.5">
              <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-1000"
                  :class="timeProgressClass"
                  :style="{ width: `${sessionPercent}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-500">{{ nextResetLabel }}</span>
            </div>
          </div>

          <div class="w-px h-6 bg-gray-200"></div>

          <!-- Dernière mise à jour -->
          <span class="text-xs text-gray-500">{{ lastRefreshText }}</span>

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
const liveData = ref<{ totalTokens: number } | null>(null)
async function fetchLiveStats() {
  try { liveData.value = await $fetch('/api/agents/live') } catch {}
}

// --- Agent stats ---
const stats = ref({ online: 0, idle: 0, offline: 0, totalTokens: 0 })

watch([agentsList, liveData], ([list, live]) => {
  if (!list.length) return
  stats.value = {
    online: list.filter((a: any) => a.status === 'active').length,
    idle: list.filter((a: any) => a.status === 'idle').length,
    offline: list.filter((a: any) => a.status === 'offline' || a.status === 'error').length,
    totalTokens: live?.totalTokens ?? 0,
  }
  lastRefresh.value = new Date()
}, { immediate: true })

// --- Session countdown (5h sessions) ---
// Schedule: sessions reset every 5h. Next reset times from now.
const SESSION_DURATION_H = 5
// Reset schedule: 00:00, 05:00, 10:00, 15:00, 20:00 (Paris)
const RESET_HOURS = [0, 5, 10, 15, 20]

const now = ref(Date.now())

function getNextReset(): Date {
  const paris = new Date(now.value).toLocaleString('en-US', { timeZone: 'Europe/Paris' })
  const parisDate = new Date(paris)
  const currentHour = parisDate.getHours()
  const currentMin = parisDate.getMinutes()
  const currentDecimal = currentHour + currentMin / 60

  // Find next reset hour
  let nextH = RESET_HOURS.find(h => h > currentDecimal)
  const isNextDay = nextH === undefined
  if (isNextDay) nextH = RESET_HOURS[0] // tomorrow 00:00

  // Build the reset date in Paris time
  const reset = new Date(parisDate)
  reset.setHours(nextH!, 0, 0, 0)
  if (isNextDay) reset.setDate(reset.getDate() + 1)

  return reset
}

const nextReset = computed(() => getNextReset())

const hoursRemaining = computed(() => {
  const diffMs = nextReset.value.getTime() - new Date(now.value).getTime()
  // Adjust for timezone offset between local and Paris
  return Math.max(0, diffMs / (1000 * 60 * 60))
})

const sessionPercent = computed(() => {
  const elapsed = SESSION_DURATION_H - hoursRemaining.value
  return Math.min(100, Math.max(0, (elapsed / SESSION_DURATION_H) * 100))
})

const countdownText = computed(() => {
  const h = hoursRemaining.value
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  if (hours === 0) return `${minutes}min`
  return `${hours}h${minutes.toString().padStart(2, '0')}`
})

const nextResetLabel = computed(() => {
  const h = nextReset.value.getHours()
  return `${h.toString().padStart(2, '0')}:00`
})

const sessionWidgetClass = computed(() => {
  if (hoursRemaining.value <= 0.083) return 'bg-red-100 border border-red-300'
  if (hoursRemaining.value <= 0.5) return 'bg-orange-100 border border-orange-300'
  return 'bg-gray-100'
})

const timeTextClass = computed(() => {
  if (hoursRemaining.value <= 0.083) return 'text-red-700'
  if (hoursRemaining.value <= 0.5) return 'text-orange-700'
  return 'text-gray-700'
})

const timeProgressClass = computed(() => {
  if (sessionPercent.value >= 95) return 'bg-red-500'
  if (sessionPercent.value >= 80) return 'bg-orange-500'
  if (sessionPercent.value >= 50) return 'bg-yellow-500'
  return 'bg-blue-500'
})

// --- Refresh ---
const pending = ref(false)
const lastRefresh = ref<Date | null>(null)
let pollInterval: ReturnType<typeof setInterval> | null = null
let tickInterval: ReturnType<typeof setInterval> | null = null

const lastRefreshText = computed(() => {
  if (!lastRefresh.value) return 'Chargement...'
  const diffSeconds = Math.floor((now.value - lastRefresh.value.getTime()) / 1000)
  if (diffSeconds < 5) return 'À l\'instant'
  if (diffSeconds < 60) return `Il y a ${diffSeconds}s`
  return `Il y a ${Math.floor(diffSeconds / 60)}m`
})

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

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`
  return tokens.toString()
}

onMounted(() => {
  refresh()
  pollInterval = setInterval(refresh, 30_000)
  tickInterval = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (tickInterval) clearInterval(tickInterval)
})
</script>
