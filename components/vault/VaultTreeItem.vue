<template>
  <div>
    <!-- Folder -->
    <div
      v-if="node.type === 'folder'"
      class="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-gray-100 rounded text-sm select-none"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="toggle"
    >
      <svg
        class="w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0"
        :class="{ 'rotate-90': isExpanded }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span class="text-gray-400 flex-shrink-0">{{ folderIcon }}</span>
      <span class="text-gray-700 font-medium truncate">{{ node.name }}</span>
      <span v-if="childCount" class="text-xs text-gray-400 ml-auto flex-shrink-0">{{ childCount }}</span>
    </div>

    <!-- File -->
    <div
      v-else
      class="flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded text-sm truncate transition-colors"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      :class="isActive
        ? 'bg-indigo-50 text-indigo-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
      @click="$emit('select', node.path)"
    >
      <span v-if="node.emoji" class="flex-shrink-0">{{ node.emoji }}</span>
      <span v-else class="flex-shrink-0 text-gray-400">{{ fileIcon }}</span>
      <span class="truncate">{{ node.displayName || node.name }}</span>
    </div>

    <!-- Children (if folder is expanded) -->
    <div v-if="node.type === 'folder' && isExpanded && node.children">
      <VaultTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :current-path="currentPath"
        :expanded-folders="expandedFolders"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface TreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  displayName?: string
  emoji?: string
  fileType?: string
  children?: TreeNode[]
}

const props = defineProps<{
  node: TreeNode
  depth: number
  currentPath: string | null
  expandedFolders: Set<string>
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
  (e: 'toggle', path: string): void
}>()

const isExpanded = computed(() => props.expandedFolders.has(props.node.path))
const isActive = computed(() => props.currentPath === props.node.path)

const childCount = computed(() => {
  if (props.node.type !== 'folder' || !props.node.children) return 0
  return countFiles(props.node.children)
})

function countFiles(nodes: TreeNode[]): number {
  let count = 0
  for (const n of nodes) {
    if (n.type === 'file') count++
    else if (n.children) count += countFiles(n.children)
  }
  return count
}

const folderIcon = computed(() => {
  const iconMap: Record<string, string> = {
    'Agents': '🤖',
    'Projets': '📁',
    'Idées': '💡',
    'Tools': '🔧',
    'MetaFlow': '🔄',
    'Dashboard': '📊',
    'Templates': '📋',
    'MCPs': '🔌',
    'Skills': '⚡',
    'Excalidraw': '🎨',
  }
  return iconMap[props.node.name] || '📂'
})

const fileIcon = computed(() => {
  const iconMap: Record<string, string> = {
    agent: '🤖',
    project: '📁',
    idea: '💡',
    mcp: '🔌',
    skill: '⚡',
    metaflow: '🔄',
    dashboard: '📊',
    template: '📋',
    kanban: '📋',
  }
  return iconMap[props.node.fileType || ''] || '📄'
})

function toggle() {
  emit('toggle', props.node.path)
}
</script>
