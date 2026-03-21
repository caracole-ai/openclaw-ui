<template>
  <div class="flex flex-col h-full">
    <!-- Search input -->
    <div class="p-3 border-b">
      <div class="relative">
        <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="treeFilter"
          type="text"
          placeholder="Filtrer..."
          class="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- Category filters -->
    <div class="flex flex-wrap gap-1 px-3 py-2 border-b">
      <button
        v-for="filter in filters"
        :key="filter.key"
        class="px-2 py-0.5 text-xs rounded-full transition-colors"
        :class="activeFilter === filter.key
          ? 'bg-indigo-100 text-indigo-700 font-medium'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
        @click="toggleFilter(filter.key)"
      >{{ filter.label }}</button>
    </div>

    <!-- Tree -->
    <div class="flex-1 overflow-y-auto py-1">
      <div v-if="treeLoading" class="p-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-5 bg-gray-100 rounded animate-pulse" :style="{ width: `${60 + Math.random() * 30}%` }"></div>
      </div>
      <template v-else>
        <VaultTreeItem
          v-for="node in filteredTree"
          :key="node.path"
          :node="node"
          :depth="0"
          :current-path="currentPath"
          :expanded-folders="expandedFolders"
          @select="openFile"
          @toggle="toggleFolder"
        />
        <div v-if="filteredTree.length === 0" class="p-4 text-sm text-gray-400 text-center">
          Aucun fichier
        </div>
      </template>
    </div>

    <!-- Footer stats -->
    <div class="px-3 py-2 border-t text-xs text-gray-400">
      {{ totalFiles }} fichiers
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  filteredTree,
  totalFiles,
  treeLoading,
  currentPath,
  expandedFolders,
  activeFilter,
  treeFilter,
  openFile,
  toggleFolder,
} = useVaultBrowser()

const filters = [
  { key: 'agents', label: 'Agents' },
  { key: 'projects', label: 'Projets' },
  { key: 'ideas', label: 'Idees' },
  { key: 'tools', label: 'Tools' },
  { key: 'metaflow', label: 'MetaFlow' },
  { key: 'dashboard', label: 'Dashboard' },
]

function toggleFilter(key: string) {
  activeFilter.value = activeFilter.value === key ? null : key
}
</script>
