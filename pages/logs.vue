<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Loading State -->
      <template v-if="loading && !stats">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-white rounded-xl shadow-sm border p-6 animate-pulse"
          >
            <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div class="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
          <div class="h-5 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div class="space-y-2">
            <div v-for="i in 8" :key="i" class="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </template>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-xl p-8 text-center"
      >
        <p class="text-red-600 font-medium text-lg mb-2">Erreur de chargement</p>
        <p class="text-red-500 text-sm mb-4">{{ error }}</p>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          @click="retry"
        >
          Reessayer
        </button>
      </div>

      <!-- Data State -->
      <template v-else>
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total today -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <p class="text-sm text-gray-500 mb-1">Total aujourd'hui</p>
            <p class="text-3xl font-bold text-blue-600">{{ stats?.total_today || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">logs enregistres</p>
          </div>
          <!-- Errors -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <p class="text-sm text-gray-500 mb-1">Erreurs</p>
            <p class="text-3xl font-bold text-red-600">{{ stats?.errors_today || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">ERROR + CRITICAL</p>
          </div>
          <!-- Warnings -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <p class="text-sm text-gray-500 mb-1">Warnings</p>
            <p class="text-3xl font-bold text-yellow-600">{{ stats?.warnings_today || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">WARNING</p>
          </div>
          <!-- Active scripts -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <p class="text-sm text-gray-500 mb-1">Scripts actifs</p>
            <p class="text-3xl font-bold text-green-600">{{ stats?.active_scripts?.length || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1 truncate">{{ (stats?.active_scripts || []).join(', ') || 'aucun' }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Level filter -->
            <div class="flex items-center gap-1">
              <button
                v-for="lvl in levels"
                :key="lvl"
                class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                :class="selectedLevel === lvl
                  ? levelActiveClass(lvl)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="setLevel(lvl)"
              >
                {{ lvl }}
              </button>
            </div>

            <!-- Script filter -->
            <select
              v-model="selectedScript"
              class="px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-300 focus:outline-none"
              @change="applyFilters"
            >
              <option value="">Tous les scripts</option>
              <option v-for="s in scriptList" :key="s" :value="s">{{ s }}</option>
            </select>

            <!-- Search -->
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher dans les messages..."
              class="flex-1 min-w-[200px] px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
              @input="debouncedSearch"
            />

            <!-- Pause / Resume -->
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              :class="paused ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="paused = !paused"
            >
              {{ paused ? 'Resume' : 'Pause' }}
            </button>

            <!-- Refresh -->
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              @click="retry"
            >
              Refresh
            </button>
          </div>
        </div>

        <!-- Log Stream -->
        <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Log Stream</h2>
            <span class="text-xs text-gray-400">{{ filteredLogs.length }} entrees</span>
          </div>

          <!-- Empty state -->
          <div v-if="!filteredLogs.length" class="text-center py-16 text-gray-400">
            <p class="text-4xl mb-3">📋</p>
            <p class="text-lg">Aucun log</p>
            <p class="text-sm mt-1">Les logs Python apparaitront ici en temps reel</p>
          </div>

          <!-- Log table -->
          <div v-else ref="logContainer" class="max-h-[600px] overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-24">Heure</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-20">Niveau</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">Script</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">Fonction</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Message</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="log in paginatedLogs" :key="log.id">
                  <tr
                    class="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                    :class="logRowClass(log.level)"
                    @click="toggleExpand(log.id)"
                  >
                    <td class="px-4 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {{ formatLogTime(log.created_at) }}
                    </td>
                    <td class="px-4 py-2">
                      <span
                        class="px-2 py-0.5 text-xs font-semibold rounded-full"
                        :class="levelBadgeClass(log.level)"
                      >
                        {{ log.level }}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-xs font-mono text-gray-700 truncate max-w-[120px]">
                      {{ log.script }}
                    </td>
                    <td class="px-4 py-2 text-xs font-mono text-gray-500 truncate max-w-[120px]">
                      {{ log.function || '-' }}
                    </td>
                    <td class="px-4 py-2 text-xs text-gray-800 truncate max-w-[400px]">
                      {{ log.message }}
                    </td>
                  </tr>
                  <!-- Expanded detail -->
                  <tr v-if="expandedId === log.id" class="border-t bg-gray-50">
                    <td colspan="5" class="px-6 py-4">
                      <div class="space-y-2 text-xs font-mono">
                        <div v-if="log.module">
                          <span class="text-gray-500">Module:</span>
                          <span class="ml-2 text-gray-800">{{ log.module }}</span>
                        </div>
                        <div v-if="log.args">
                          <span class="text-gray-500">Args:</span>
                          <pre class="mt-1 p-2 bg-white rounded border text-gray-800 whitespace-pre-wrap">{{ log.args }}</pre>
                        </div>
                        <div v-if="log.return_value">
                          <span class="text-gray-500">Return:</span>
                          <pre class="mt-1 p-2 bg-white rounded border text-gray-800 whitespace-pre-wrap">{{ log.return_value }}</pre>
                        </div>
                        <div v-if="log.traceback">
                          <span class="text-gray-500">Traceback:</span>
                          <pre class="mt-1 p-2 bg-red-50 rounded border border-red-200 text-red-800 whitespace-pre-wrap overflow-x-auto">{{ log.traceback }}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="px-6 py-3 border-t flex items-center justify-between">
            <span class="text-xs text-gray-500">
              Page {{ currentPage }} / {{ totalPages }}
            </span>
            <div class="flex gap-2">
              <button
                :disabled="currentPage <= 1"
                class="px-3 py-1 text-xs rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
                @click="currentPage--"
              >
                Precedent
              </button>
              <button
                :disabled="currentPage >= totalPages"
                class="px-3 py-1 text-xs rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
                @click="currentPage++"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <!-- Latest Errors -->
        <div v-if="stats?.latest_errors?.length" class="mt-8 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold text-gray-900">Dernieres erreurs</h2>
          </div>
          <div class="divide-y">
            <div
              v-for="err in stats.latest_errors"
              :key="err.id"
              class="px-6 py-3 hover:bg-red-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">{{ err.level }}</span>
                <span class="text-xs font-mono text-gray-500">{{ err.script }}</span>
                <span class="text-xs text-gray-400">{{ formatLogTime(err.created_at) }}</span>
              </div>
              <p class="text-sm text-gray-800 mt-1 font-mono">{{ err.message }}</p>
              <pre
                v-if="err.traceback"
                class="mt-2 p-2 bg-red-50 rounded border border-red-200 text-xs text-red-800 whitespace-pre-wrap overflow-x-auto max-h-40"
              >{{ err.traceback }}</pre>
            </div>
          </div>
        </div>

        <!-- Script breakdown -->
        <div v-if="Object.keys(stats?.by_script || {}).length" class="mt-8 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold text-gray-900">Volume par script</h2>
          </div>
          <div class="p-6 space-y-3">
            <div
              v-for="[script, count] in sortedScripts"
              :key="script"
              class="flex items-center gap-3"
            >
              <span class="text-xs font-mono text-gray-600 w-40 truncate">{{ script }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-500 rounded-full transition-all duration-500"
                  :style="{ width: barWidth(count, maxScriptCount) }"
                ></div>
              </div>
              <span class="text-xs font-semibold text-gray-700 w-12 text-right">{{ count }}</span>
            </div>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { LogEntry } from '~/types/log'

useHead({ title: 'Logs Python - OpenClaw Dashboard' })

const { logs, stats, fetchLogs, fetchStats, loading, error } = usePythonLogs()

// ─── Filters ───
const levels = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR'] as const
const selectedLevel = ref('ALL')
const selectedScript = ref('')
const searchQuery = ref('')
const paused = ref(false)
const expandedId = ref<string | null>(null)

// ─── Pagination ───
const currentPage = ref(1)
const PAGE_SIZE = 50

// ─── Script list (from stats) ───
const scriptList = computed(() => Object.keys(stats.value?.by_script || {}))

// ─── Filtered logs ───
const filteredLogs = computed(() => {
  let result = logs.value
  if (selectedLevel.value !== 'ALL') {
    result = result.filter(l => l.level === selectedLevel.value)
  }
  if (selectedScript.value) {
    result = result.filter(l => l.script === selectedScript.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(l => l.message.toLowerCase().includes(q))
  }
  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / PAGE_SIZE)))
const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredLogs.value.slice(start, start + PAGE_SIZE)
})

// ─── Script breakdown chart ───
const sortedScripts = computed(() => {
  const entries = Object.entries(stats.value?.by_script || {})
  return entries.sort((a, b) => b[1] - a[1])
})

const maxScriptCount = computed(() => {
  if (!sortedScripts.value.length) return 1
  return sortedScripts.value[0][1]
})

function barWidth(count: number, max: number): string {
  return `${Math.max(2, (count / max) * 100)}%`
}

// ─── Auto-scroll ───
const logContainer = ref<HTMLElement | null>(null)

watch(logs, () => {
  if (!paused.value && logContainer.value) {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = 0 // newest first, scroll to top
      }
    })
  }
}, { deep: false })

// ─── Filter actions ───
function setLevel(lvl: string) {
  selectedLevel.value = lvl
  currentPage.value = 1
  applyFilters()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    applyFilters()
  }, 300)
}

function applyFilters() {
  fetchLogs({
    level: selectedLevel.value !== 'ALL' ? selectedLevel.value : undefined,
    script: selectedScript.value || undefined,
    search: searchQuery.value || undefined,
    limit: 200,
  })
}

function retry() {
  fetchStats()
  applyFilters()
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Styling helpers ───
function levelBadgeClass(level: string): string {
  switch (level) {
    case 'DEBUG': return 'bg-gray-100 text-gray-600'
    case 'INFO': return 'bg-blue-100 text-blue-700'
    case 'WARNING': return 'bg-yellow-100 text-yellow-800'
    case 'ERROR': return 'bg-red-100 text-red-700'
    case 'CRITICAL': return 'bg-red-200 text-red-900 font-bold'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function levelActiveClass(level: string): string {
  switch (level) {
    case 'ALL': return 'bg-blue-600 text-white'
    case 'DEBUG': return 'bg-gray-600 text-white'
    case 'INFO': return 'bg-blue-600 text-white'
    case 'WARNING': return 'bg-yellow-500 text-white'
    case 'ERROR': return 'bg-red-600 text-white'
    default: return 'bg-blue-600 text-white'
  }
}

function logRowClass(level: string): string {
  if (level === 'ERROR' || level === 'CRITICAL') return 'bg-red-50/50'
  if (level === 'WARNING') return 'bg-yellow-50/30'
  return ''
}

function formatLogTime(ts: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      + '.' + String(d.getMilliseconds()).padStart(3, '0')
  } catch {
    return ts
  }
}
</script>
