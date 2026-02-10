<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Stats Overview -->
    <div class="mb-8">
      <StatsOverview :agents="agents" />
    </div>

      <!-- Agents Dashboard -->
      <AgentsDashboard />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAgentsStatus } from '~/composables/useAgentsStatus'

useHead({
  title: 'Agents - OpenClaw Dashboard'
})

const { agents } = useAgentsStatus()
</script>
