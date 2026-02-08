<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Breadcrumb -->
    <nav class="mb-6">
      <NuxtLink to="/" class="text-blue-600 hover:text-blue-800">
        ← Retour au dashboard
      </NuxtLink>
    </nav>

    <!-- Projects Section with Kanban -->
    <ProjectsSection />
  </main>
</template>

<script setup lang="ts">
useHead({
  title: 'Projets - OpenClaw Dashboard'
})
</script>
