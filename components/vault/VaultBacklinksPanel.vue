<template>
  <div class="space-y-6">
    <!-- Backlinks -->
    <div v-if="backlinks.length">
      <h3 class="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Backlinks ({{ backlinks.length }})
      </h3>
      <div class="space-y-1">
        <button
          v-for="bl in backlinks"
          :key="bl.path"
          class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
          @click="$emit('navigate', bl.path)"
        >
          <div class="flex items-center gap-1.5">
            <span v-if="bl.emoji" class="text-sm">{{ bl.emoji }}</span>
            <span v-else class="text-xs text-gray-400">{{ fileTypeIcon(bl.fileType) }}</span>
            <span class="text-sm font-medium text-gray-700 group-hover:text-indigo-600 truncate">{{ bl.displayName }}</span>
          </div>
          <p v-if="bl.context" class="text-xs text-gray-400 truncate mt-0.5 pl-5">{{ bl.context }}</p>
        </button>
      </div>
    </div>

    <!-- Related files -->
    <div v-if="groupedRelated.length">
      <h3 class="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Relations
      </h3>
      <div v-for="group in groupedRelated" :key="group.relation" class="mb-3">
        <div class="text-xs text-gray-400 font-medium mb-1 capitalize">{{ relationLabel(group.relation) }}</div>
        <div class="space-y-0.5">
          <button
            v-for="file in group.files"
            :key="file.path"
            class="w-full text-left px-2 py-1 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 group"
            @click="$emit('navigate', file.path)"
          >
            <span v-if="file.emoji" class="text-sm">{{ file.emoji }}</span>
            <span class="text-sm text-gray-600 group-hover:text-indigo-600 truncate">{{ file.displayName }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!backlinks.length && !relatedFiles.length" class="text-sm text-gray-400 text-center py-4">
      Aucun lien entrant
    </div>
  </div>
</template>

<script setup lang="ts">
interface BacklinkEntry {
  path: string
  displayName: string
  emoji?: string
  fileType: string
  context: string
}

interface RelatedFile {
  path: string
  displayName: string
  emoji?: string
  relation: string
}

const props = defineProps<{
  backlinks: BacklinkEntry[]
  relatedFiles: RelatedFile[]
}>()

defineEmits<{
  (e: 'navigate', path: string): void
}>()

function fileTypeIcon(ft: string): string {
  const map: Record<string, string> = {
    agent: '🤖', project: '📁', idea: '💡', mcp: '🔌',
    skill: '⚡', metaflow: '🔄', dashboard: '📊',
  }
  return map[ft] || '📄'
}

function relationLabel(relation: string): string {
  const map: Record<string, string> = {
    skill: 'Skills',
    mcp: 'MCPs',
    project: 'Projets',
    'project (lead)': 'Projets (lead)',
    team: 'Equipe',
    lead: 'Lead',
    teammate: 'Co-equipiers',
    agent: 'Agents',
    idea_source: 'Idee source',
  }
  return map[relation] || relation
}

const groupedRelated = computed(() => {
  const groups = new Map<string, RelatedFile[]>()
  for (const file of props.relatedFiles) {
    const existing = groups.get(file.relation) || []
    existing.push(file)
    groups.set(file.relation, existing)
  }
  return Array.from(groups.entries()).map(([relation, files]) => ({ relation, files }))
})
</script>
