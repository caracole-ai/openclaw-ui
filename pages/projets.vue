<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Projects Section with Kanban -->
      <ProjectsSection />
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Projets - OpenClaw Dashboard'
})
</script>
