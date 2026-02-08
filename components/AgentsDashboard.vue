<template>
  <div class="space-y-6">
    <!-- Titre simple -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Agents</h2>
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
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="h-16 bg-gray-100 rounded-lg"></div>
          <div class="h-16 bg-gray-100 rounded-lg"></div>
        </div>
        <div class="h-3 bg-gray-100 rounded w-full"></div>
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

    <!-- Grille d'agents -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AgentCard 
        v-for="agent in sortedAgents" 
        :key="agent.id"
        :agent="agent" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAgentsStatus } from '~/composables/useAgentsStatus'
import AgentCard from '~/components/AgentCard.vue'

const {
  agents,
  sortedAgents,
  pending,
  error,
  refresh,
} = useAgentsStatus()
</script>
