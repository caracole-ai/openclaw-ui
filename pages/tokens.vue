<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Loading State -->
      <template v-if="loading && !summary">
        <!-- KPI Skeletons -->
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
        <!-- Chart Skeleton -->
        <div class="bg-white rounded-xl shadow-sm border p-6 animate-pulse mb-8">
          <div class="h-5 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div class="space-y-3">
            <div v-for="i in 6" :key="i" class="flex items-center gap-3">
              <div class="h-4 bg-gray-200 rounded w-20"></div>
              <div class="h-8 bg-gray-200 rounded" :style="{ width: `${80 - i * 10}%` }"></div>
            </div>
          </div>
        </div>
        <!-- Two-column Skeleton -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
            <div class="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
            <div class="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-8 bg-gray-200 rounded"></div>
            </div>
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

      <!-- Empty State -->
      <div
        v-else-if="summary && summary.totalUsage === 0 && timeline.length === 0"
        class="bg-white rounded-xl shadow-sm border p-16 text-center"
      >
        <div class="text-5xl mb-4">&#x1F4B0;</div>
        <p class="text-gray-500 text-lg">Aucune donnee de tokens disponible</p>
      </div>

      <!-- Data State -->
      <template v-else-if="summary">

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Cout total -->
          <div class="bg-white rounded-xl shadow-sm border border-l-4 border-l-purple-500 p-6">
            <p class="text-sm text-gray-500 mb-1">Cout total</p>
            <p class="text-3xl font-bold text-purple-600">{{ formatCost(totalCost) }}</p>
            <p class="text-xs text-gray-400 mt-1">Tous agents confondus</p>
          </div>

          <!-- Total tokens -->
          <div class="bg-white rounded-xl shadow-sm border border-l-4 border-l-blue-500 p-6">
            <p class="text-sm text-gray-500 mb-1">Total tokens</p>
            <p class="text-3xl font-bold text-blue-600">{{ formatTokens(summary.totalUsage) }}</p>
            <p class="text-xs text-gray-400 mt-1">Cumul global</p>
          </div>

          <!-- Cout moyen / jour -->
          <div class="bg-white rounded-xl shadow-sm border border-l-4 border-l-green-500 p-6">
            <p class="text-sm text-gray-500 mb-1">Cout moyen/jour</p>
            <p class="text-3xl font-bold text-green-600">{{ formatCost(averageDailyCost) }}</p>
            <p class="text-xs text-gray-400 mt-1">Sur la periode</p>
          </div>

          <!-- Agents actifs -->
          <div class="bg-white rounded-xl shadow-sm border border-l-4 border-l-yellow-500 p-6">
            <p class="text-sm text-gray-500 mb-1">Agents actifs</p>
            <p class="text-3xl font-bold text-yellow-600">{{ summary.topAgents?.length ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">Avec consommation</p>
          </div>
        </div>

        <!-- Timeline Section -->
        <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 class="text-lg font-semibold text-gray-900">Timeline d'utilisation</h2>
            <div class="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                v-for="option in periodOptions"
                :key="option.value"
                class="px-4 py-2 text-sm font-medium transition-colors"
                :class="selectedPeriod === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'"
                @click="changePeriod(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div v-if="timeline.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Aucune donnee pour cette periode
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="point in timeline"
              :key="point.period"
              class="flex items-center gap-3"
            >
              <span class="text-xs text-gray-500 w-24 shrink-0 text-right font-mono">
                {{ formatDate(point.period) }}
              </span>
              <div class="flex-1 bg-gray-100 rounded-r h-8 relative overflow-hidden">
                <div
                  class="bg-blue-500 h-full rounded-r transition-all duration-300"
                  :style="{ width: barWidth(point.tokens, maxTimelineTokens) }"
                ></div>
              </div>
              <span class="text-xs text-gray-600 w-20 shrink-0 text-right font-mono">
                {{ formatTokens(point.tokens) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Top Agents & Top Projects -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          <!-- Top Agents -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Top agents</h2>
            <div v-if="!summary.topAgents?.length" class="text-gray-400 text-sm text-center py-4">
              Aucun agent
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="agent in summary.topAgents"
                :key="agent.agentId"
                class="group"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-700 truncate">{{ agent.agentId }}</span>
                  <span class="text-xs text-gray-500 shrink-0 ml-2">
                    {{ formatTokens(agent.tokens) }} &middot; {{ formatCost(agent.cost) }}
                  </span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3">
                  <div
                    class="bg-blue-500 h-full rounded-full transition-all duration-300"
                    :style="{ width: barWidth(agent.tokens, maxAgentTokens) }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Projects -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Top projets</h2>
            <div v-if="!summary.topProjects?.length" class="text-gray-400 text-sm text-center py-4">
              Aucun projet
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="project in summary.topProjects"
                :key="project.projectId"
                class="group"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-700 truncate">{{ project.projectId }}</span>
                  <span class="text-xs text-gray-500 shrink-0 ml-2">
                    {{ formatTokens(project.tokens) }} &middot; {{ formatCost(project.cost) }}
                  </span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3">
                  <div
                    class="bg-green-500 h-full rounded-full transition-all duration-300"
                    :style="{ width: barWidth(project.tokens, maxProjectTokens) }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <div class="bg-white rounded-xl shadow-sm border p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Details</h2>

          <div v-if="timeline.length === 0" class="text-gray-400 text-sm text-center py-4">
            Aucune donnee
          </div>
          <template v-else>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left py-3 px-4 font-medium text-gray-500">Periode</th>
                    <th class="text-right py-3 px-4 font-medium text-gray-500">Tokens</th>
                    <th class="text-right py-3 px-4 font-medium text-gray-500">Cout</th>
                    <th class="text-right py-3 px-4 font-medium text-gray-500">Evenements</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="(point, index) in paginatedTimeline"
                    :key="point.period"
                    :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
                  >
                    <td class="py-3 px-4 text-gray-700 font-mono">{{ formatDate(point.period) }}</td>
                    <td class="py-3 px-4 text-right text-gray-700 font-mono">{{ formatTokens(point.tokens) }}</td>
                    <td class="py-3 px-4 text-right text-gray-700 font-mono">{{ formatCost(point.cost) }}</td>
                    <td class="py-3 px-4 text-right text-gray-700 font-mono">{{ point.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div
              v-if="totalPages > 1"
              class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100"
            >
              <p class="text-xs text-gray-500">
                Page {{ currentPage }} / {{ totalPages }}
                ({{ timeline.length }} lignes)
              </p>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                  :class="currentPage <= 1
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                  :disabled="currentPage <= 1"
                  @click="currentPage--"
                >
                  Precedent
                </button>
                <button
                  class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                  :class="currentPage >= totalPages
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                  :disabled="currentPage >= totalPages"
                  @click="currentPage++"
                >
                  Suivant
                </button>
              </div>
            </div>
          </template>
        </div>

      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useTokens } from '~/composables/useTokens'

useHead({
  title: 'Tokens - OpenClaw Dashboard'
})

const { summary, timeline, fetchSummary, fetchTimeline, loading, error } = useTokens()

// -- Period selector --

type PeriodGroupBy = 'day' | 'week' | 'month'

const periodOptions: { label: string; value: PeriodGroupBy }[] = [
  { label: 'Jour', value: 'day' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' }
]

const selectedPeriod = ref<PeriodGroupBy>('day')

function changePeriod(period: PeriodGroupBy) {
  selectedPeriod.value = period
  currentPage.value = 1
  fetchTimeline({ groupBy: period })
}

// -- Pagination --

const PAGE_SIZE = 10
const currentPage = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(timeline.value.length / PAGE_SIZE)))

const paginatedTimeline = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return timeline.value.slice(start, start + PAGE_SIZE)
})

// -- Computed KPIs --

const totalCost = computed(() => {
  if (!summary.value?.topAgents?.length) return 0
  return summary.value.topAgents.reduce((acc, a) => acc + a.cost, 0)
})

const averageDailyCost = computed(() => {
  if (!timeline.value.length) return 0
  const total = timeline.value.reduce((acc, p) => acc + p.cost, 0)
  return total / timeline.value.length
})

// -- Bar chart helpers --

const maxTimelineTokens = computed(() => {
  if (!timeline.value.length) return 1
  return Math.max(...timeline.value.map(p => p.tokens), 1)
})

const maxAgentTokens = computed(() => {
  if (!summary.value?.topAgents?.length) return 1
  return Math.max(...summary.value.topAgents.map(a => a.tokens), 1)
})

const maxProjectTokens = computed(() => {
  if (!summary.value?.topProjects?.length) return 1
  return Math.max(...summary.value.topProjects.map(p => p.tokens), 1)
})

function barWidth(value: number, max: number): string {
  if (max <= 0) return '0%'
  const pct = Math.max(1, Math.round((value / max) * 100))
  return `${pct}%`
}

// -- Formatting helpers --

function formatTokens(n: number): string {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

function formatCost(n: number): string {
  if (n == null) return '\u20AC0.0000'
  return `\u20AC${n.toFixed(4)}`
}

function formatDate(period: string): string {
  if (!period) return ''
  try {
    const d = new Date(period)
    if (isNaN(d.getTime())) return period
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return period
  }
}

// -- Retry handler --

function retry() {
  fetchSummary()
  fetchTimeline({ groupBy: selectedPeriod.value })
}

// -- Init --

onMounted(() => {
  fetchTimeline({ groupBy: 'day' })
})
</script>
