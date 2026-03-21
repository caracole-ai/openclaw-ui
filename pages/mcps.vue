<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Page Title -->
      <h1 class="text-2xl font-bold text-gray-900 mb-6">MCP Servers</h1>

      <!-- Loading State -->
      <template v-if="loading">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div v-for="i in 4" :key="i" class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-gray-200 animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div class="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
            <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-full mb-4"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </template>

      <!-- Loaded Content -->
      <template v-else>

        <!-- Stats Counters -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Total MCPs</p>
                <p class="text-3xl font-bold mt-2 text-purple-600">{{ allMcps.length }}</p>
              </div>
              <div class="text-4xl">🔌</div>
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Actifs</p>
                <p class="text-3xl font-bold mt-2 text-green-600">{{ activeCount }}</p>
              </div>
              <div class="text-4xl">✅</div>
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-yellow-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Pending</p>
                <p class="text-3xl font-bold mt-2 text-yellow-600">{{ pendingCount }}</p>
              </div>
              <div class="text-4xl">⏳</div>
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-gray-400">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 font-medium">Desactives</p>
                <p class="text-3xl font-bold mt-2 text-gray-500">{{ disabledCount }}</p>
              </div>
              <div class="text-4xl">🚫</div>
            </div>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>
            <select
              v-model="selectedAgent"
              class="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              <option value="">Tous les agents</option>
              <option v-for="agentId in agentIds" :key="agentId" :value="agentId">
                {{ agentId }}
              </option>
            </select>
            <select
              v-model="selectedStatus"
              class="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              <option value="">Tous</option>
              <option value="active">Actif</option>
              <option value="pending">Pending</option>
              <option value="disabled">Desactive</option>
            </select>
          </div>
        </div>

        <!-- MCPs Grid -->
        <div v-if="filteredMcps.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TransitionGroup name="mcp-list">
            <McpCard
              v-for="mcp in filteredMcps"
              :key="mcp.id"
              :mcp="mcp"
              :assignments="assignments"
            />
          </TransitionGroup>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-16">
          <div class="text-5xl mb-4">🔌</div>
          <p class="text-lg font-medium text-gray-500">Aucun MCP trouve</p>
          <p class="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres de recherche</p>
        </div>

      </template>

      <!-- Error State -->
      <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Mcp } from '~/types/mcp'
import { useMcps } from '~/composables/useMcps'

useHead({
  title: 'MCPs - OpenClaw Dashboard'
})

const { installed, assignments, loading, error } = useMcps()

const searchQuery = ref('')
const selectedAgent = ref('')
const selectedStatus = ref('')

const allMcps = computed<Mcp[]>(() => installed.value)

const activeCount = computed(() => allMcps.value.filter(m => m.status === 'active').length)
const pendingCount = computed(() => allMcps.value.filter(m => m.status === 'pending').length)
const disabledCount = computed(() => allMcps.value.filter(m => m.status === 'disabled').length)

const agentIds = computed(() => Object.keys(assignments.value).sort())

const filteredMcps = computed(() => {
  let result = allMcps.value

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(mcp =>
      mcp.name.toLowerCase().includes(query) ||
      (mcp.description || '').toLowerCase().includes(query)
    )
  }

  if (selectedAgent.value) {
    const agentMcpIds = assignments.value[selectedAgent.value] || []
    result = result.filter(mcp => agentMcpIds.includes(mcp.id))
  }

  if (selectedStatus.value) {
    result = result.filter(mcp => mcp.status === selectedStatus.value)
  }

  return result
})
</script>

<style scoped>
.mcp-list-enter-active,
.mcp-list-leave-active {
  transition: all 0.3s ease;
}
.mcp-list-enter-from,
.mcp-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
