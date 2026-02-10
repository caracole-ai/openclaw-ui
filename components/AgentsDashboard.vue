<template>
  <div class="space-y-6">
    <!-- Header avec contrôles -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 class="text-2xl font-bold text-gray-900">Agents</h2>
      
      <div class="flex items-center gap-3">
        <!-- Bouton Tout déplier / Tout replier (visible seulement si groupé) -->
        <button
          v-if="groupBy !== 'none'"
          @click="allExpanded ? collapseAll() : expandAll()"
          class="text-sm border rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <svg v-if="!allExpanded" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          {{ allExpanded ? 'Tout replier' : 'Tout déplier' }}
        </button>
        
        <!-- Groupement -->
        <select 
          v-model="groupBy"
          class="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="status">Par status</option>
          <option value="team">Par équipe</option>
          <option value="none">Sans groupement</option>
        </select>
        
        <!-- Toggle densité -->
        <div class="flex border rounded-lg overflow-hidden">
          <button
            @click="viewMode = 'compact'"
            class="px-3 py-1.5 text-sm flex items-center gap-1"
            :class="viewMode === 'compact' ? 'bg-gray-200 font-medium' : 'bg-white hover:bg-gray-50'"
            title="Vue compacte"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            @click="viewMode = 'detailed'"
            class="px-3 py-1.5 text-sm border-l flex items-center gap-1"
            :class="viewMode === 'detailed' ? 'bg-gray-200 font-medium' : 'bg-white hover:bg-gray-50'"
            title="Vue détaillée"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- État d'erreur -->
    <div 
      v-if="error" 
      class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
    >
      <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <h3 class="text-sm font-medium text-red-800">Erreur de connexion</h3>
        <p class="text-sm text-red-600 mt-1">{{ error.message }}</p>
        <button 
          @click="refresh"
          class="text-sm text-red-700 underline mt-2 hover:text-red-800"
        >
          Réessayer
        </button>
      </div>
    </div>

    <!-- Skeleton loading -->
    <div v-else-if="pending && !agents.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="i in 6" 
        :key="i"
        class="bg-white rounded-lg shadow-sm border p-4 animate-pulse"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gray-200"></div>
            <div>
              <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div class="h-3 bg-gray-100 rounded w-32"></div>
            </div>
          </div>
          <div class="h-6 bg-gray-200 rounded-full w-20"></div>
        </div>
      </div>
    </div>

    <!-- État vide -->
    <div 
      v-else-if="!agents.length" 
      class="text-center py-12 bg-gray-50 rounded-lg"
    >
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900">Aucun agent configuré</h3>
      <p class="text-gray-500 mt-1">Les agents apparaîtront ici une fois configurés dans OpenClaw.</p>
    </div>

    <!-- Vue groupée -->
    <div v-else-if="groupBy !== 'none'" class="space-y-4">
      <div 
        v-for="group in groupedAgents" 
        :key="group.key"
        class="bg-white rounded-lg border shadow-sm overflow-hidden transition-all"
      >
        <!-- Group header (cliquable) -->
        <button
          @click="toggleGroup(group.key)"
          class="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <svg 
              class="w-5 h-5 text-gray-400 transition-transform"
              :class="{ 'rotate-90': expandedGroups.has(group.key) }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="text-2xl">{{ group.icon }}</span>
            <h3 class="font-semibold text-gray-900">{{ group.label }}</h3>
            <span class="text-sm text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
              {{ group.agents.length }}
            </span>
          </div>
          <span class="text-xs text-gray-400">
            {{ expandedGroups.has(group.key) ? 'Replier' : 'Déplier' }}
          </span>
        </button>
        
        <!-- Agents grid (collapsible) -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-screen"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 max-h-screen"
          leave-to-class="opacity-0 max-h-0"
        >
          <div 
            v-if="expandedGroups.has(group.key)"
            class="border-t bg-gray-50 p-4"
          >
            <div 
              class="grid gap-4"
              :class="viewMode === 'compact' 
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'"
            >
              <AgentCard 
                v-for="agent in group.agents" 
                :key="agent.id"
                :agent="agent"
                :compact="viewMode === 'compact'"
              />
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Vue sans groupement -->
    <div 
      v-else 
      class="grid gap-4"
      :class="viewMode === 'compact' 
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' 
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'"
    >
      <AgentCard 
        v-for="agent in sortedAgents" 
        :key="agent.id"
        :agent="agent"
        :compact="viewMode === 'compact'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAgentsStatus } from '~/composables/useAgentsStatus'
import AgentCard from '~/components/AgentCard.vue'

const {
  agents,
  sortedAgents,
  pending,
  error,
  refresh,
} = useAgentsStatus()

const groupBy = ref<'status' | 'team' | 'none'>('team') // Default: par équipe
const viewMode = ref<'compact' | 'detailed'>('compact') // Default: vue compacte
const expandedGroups = ref<Set<string>>(new Set()) // Track which groups are expanded

const GROUP_CONFIG = {
  status: [
    { key: 'online', label: 'En ligne', icon: '🟢' },
    { key: 'idle', label: 'Inactif', icon: '🟡' },
    { key: 'offline', label: 'Hors ligne', icon: '⚫' }
  ],
  team: [
    { key: 'code', label: 'Code', icon: '💻' },
    { key: 'writing', label: 'Écriture', icon: '✍️' },
    { key: 'free', label: 'Libre', icon: '🌟' },
    { key: 'unknown', label: 'Autre', icon: '❓' }
  ]
}

const groupedAgents = computed(() => {
  const config = GROUP_CONFIG[groupBy.value as keyof typeof GROUP_CONFIG]
  if (!config) return []
  
  return config.map(group => ({
    ...group,
    agents: sortedAgents.value.filter(agent => {
      if (groupBy.value === 'status') {
        return agent.status === group.key
      }
      return (agent.team || 'unknown') === group.key
    })
  })).filter(group => group.agents.length > 0)
})

// Auto-expand tous les groupes au chargement
watch(groupedAgents, (newGroups) => {
  if (newGroups.length > 0 && expandedGroups.value.size === 0) {
    newGroups.forEach(g => expandedGroups.value.add(g.key))
  }
}, { immediate: true })

function toggleGroup(key: string) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
}

function expandAll() {
  groupedAgents.value.forEach(g => expandedGroups.value.add(g.key))
}

function collapseAll() {
  expandedGroups.value.clear()
}

const allExpanded = computed(() => {
  return groupedAgents.value.every(g => expandedGroups.value.has(g.key))
})
</script>
