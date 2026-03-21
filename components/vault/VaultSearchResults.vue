<template>
  <div class="space-y-1">
    <div
      v-for="result in results"
      :key="result.path"
      class="px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
      @click="$emit('select', result.path)"
    >
      <div class="flex items-center gap-2">
        <span v-if="result.emoji" class="text-sm">{{ result.emoji }}</span>
        <span v-else class="text-xs text-gray-400">{{ fileTypeIcon(result.fileType) }}</span>
        <span class="text-sm font-medium text-gray-700 group-hover:text-indigo-600 truncate">{{ result.displayName }}</span>
        <span class="text-xs text-gray-400 ml-auto flex-shrink-0 capitalize">{{ result.fileType }}</span>
      </div>
      <p class="text-xs text-gray-400 mt-0.5 truncate pl-6" v-html="highlightSnippet(result.snippet)"></p>
    </div>

    <div v-if="results.length === 0 && query.length >= 2" class="px-3 py-4 text-sm text-gray-400 text-center">
      Aucun resultat pour "{{ query }}"
    </div>
  </div>
</template>

<script setup lang="ts">
interface SearchResult {
  path: string
  displayName: string
  emoji?: string
  fileType: string
  snippet: string
  score: number
}

const props = defineProps<{
  results: SearchResult[]
  query: string
}>()

defineEmits<{
  (e: 'select', path: string): void
}>()

function fileTypeIcon(ft: string): string {
  const map: Record<string, string> = {
    agent: '🤖', project: '📁', idea: '💡', mcp: '🔌',
    skill: '⚡', metaflow: '🔄', dashboard: '📊',
  }
  return map[ft] || '📄'
}

function highlightSnippet(snippet: string): string {
  if (!props.query) return snippet
  const escaped = props.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return snippet.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>',
  )
}
</script>
