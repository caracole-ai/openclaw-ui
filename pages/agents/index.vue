<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Stats Overview + Create button -->
    <div class="mb-8 flex items-start justify-between gap-4">
      <div class="flex-1">
        <StatsOverview :agents="agents" />
      </div>
      <NuxtLink
        to="/agents/create-agent"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nouvel agent
      </NuxtLink>
    </div>

      <!-- Agents Dashboard -->
      <AgentsDashboard />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAgents } from '~/composables/useAgents'

useHead({
  title: 'Agents - OpenClaw Dashboard'
})

const { agents } = useAgents()
</script>
