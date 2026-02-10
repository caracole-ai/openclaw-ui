<template>
  <div class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <nav class="flex items-center gap-2 text-sm">
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <NuxtLink 
            :to="crumb.path"
            :class="index === breadcrumbs.length - 1 
              ? 'text-gray-900 font-medium pointer-events-none' 
              : 'text-gray-500 hover:text-gray-700 transition-colors'"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span 
            v-if="index < breadcrumbs.length - 1"
            class="text-gray-300"
          >/</span>
        </template>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface Breadcrumb {
  label: string
  path: string
}

const route = useRoute()

const breadcrumbs = computed<Breadcrumb[]>(() => {
  const crumbs: Breadcrumb[] = [
    { label: 'Dashboard', path: '/' }
  ]

  const path = route.path
  const segments = path.split('/').filter(Boolean)

  // Handle different routes
  if (segments.length === 0) {
    return crumbs // Just Dashboard for home
  }

  // /agents
  if (segments[0] === 'agents') {
    crumbs.push({ label: 'Agents', path: '/agents' })
    return crumbs
  }

  // /agent/:id
  if (segments[0] === 'agent' && segments[1]) {
    crumbs.push({ label: 'Agents', path: '/agents' })
    // Try to get agent name from meta or use ID
    const agentName = route.meta.agentName as string || segments[1]
    crumbs.push({ label: agentName, path: `/agent/${segments[1]}` })
    return crumbs
  }

  // /projets
  if (segments[0] === 'projets') {
    crumbs.push({ label: 'Projets', path: '/projets' })
    return crumbs
  }

  // /project/:id
  if (segments[0] === 'project' && segments[1]) {
    crumbs.push({ label: 'Projets', path: '/projets' })
    const projectName = route.meta.projectName as string || segments[1]
    crumbs.push({ label: projectName, path: `/project/${segments[1]}` })
    return crumbs
  }

  // /tests
  if (segments[0] === 'tests') {
    crumbs.push({ label: 'Tests', path: '/tests' })
    return crumbs
  }

  // /settings
  if (segments[0] === 'settings') {
    crumbs.push({ label: 'Settings', path: '/settings' })
    // /settings/:section
    if (segments[1]) {
      const sectionName = segments[1].charAt(0).toUpperCase() + segments[1].slice(1)
      crumbs.push({ label: sectionName, path: `/settings/${segments[1]}` })
    }
    return crumbs
  }

  // Generic fallback: capitalize segments
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    crumbs.push({ label, path: currentPath })
  })

  return crumbs
})
</script>
