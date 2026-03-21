<template>
  <div>
    <Breadcrumb />

    <div class="vault-layout">
      <!-- Left: File Tree -->
      <aside class="border-r bg-white overflow-y-auto">
        <VaultFileTree />
      </aside>

      <!-- Center: Content -->
      <main class="overflow-y-auto bg-gray-50">
        <!-- No file selected → welcome -->
        <div v-if="!currentFile && !loading" class="p-8">
          <div class="max-w-2xl mx-auto">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Obsidian Vault</h1>
            <p class="text-gray-500 mb-6">Naviguez dans le vault, cliquez sur les wikilinks pour explorer les connexions.</p>

            <!-- Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <div v-for="stat in vaultStats" :key="stat.label" class="bg-white rounded-lg border p-3">
                <div class="text-2xl mb-1">{{ stat.icon }}</div>
                <div class="text-lg font-bold text-gray-900">{{ stat.count }}</div>
                <div class="text-xs text-gray-500">{{ stat.label }}</div>
              </div>
            </div>

            <!-- Search -->
            <div class="relative mb-6">
              <svg class="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchInput"
                type="text"
                placeholder="Rechercher dans le vault... (Cmd+K)"
                class="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                @input="onSearchInput"
              />
            </div>

            <!-- Search results -->
            <div v-if="searchResults.length" class="bg-white rounded-xl border shadow-sm p-2">
              <VaultSearchResults
                :results="searchResults"
                :query="searchQuery"
                @select="onSearchSelect"
              />
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-else-if="loading" class="p-8">
          <div class="max-w-3xl mx-auto space-y-4 animate-pulse">
            <div class="h-8 bg-gray-200 rounded w-1/3"></div>
            <div class="h-4 bg-gray-200 rounded w-full"></div>
            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
            <div class="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>

        <!-- File content -->
        <div v-else-if="currentFile" class="p-6">
          <div class="max-w-3xl mx-auto">
            <!-- Navigation bar -->
            <div class="flex items-center gap-2 mb-4">
              <button
                :disabled="!canGoBack"
                class="p-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Retour"
                @click="goBack"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                :disabled="!canGoForward"
                class="p-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Suivant"
                @click="goForward"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <!-- Vault breadcrumb -->
              <div class="flex items-center gap-1 text-sm text-gray-500 overflow-x-auto">
                <button class="hover:text-indigo-600 transition-colors flex-shrink-0" @click="clearFile">Vault</button>
                <template v-for="seg in breadcrumbSegments" :key="seg.path">
                  <span class="text-gray-300 flex-shrink-0">/</span>
                  <span v-if="seg.isLast" class="text-gray-700 font-medium truncate">{{ seg.name }}</span>
                  <button v-else class="hover:text-indigo-600 transition-colors flex-shrink-0" @click="expandToPath(seg.path)">{{ seg.name }}</button>
                </template>
              </div>
            </div>

            <!-- Error -->
            <div v-if="error" class="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ error }}
            </div>

            <!-- Frontmatter card (above body for agents/projects/ideas) -->
            <div v-if="showFrontmatterAbove" class="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <VaultFrontmatterPanel
                :frontmatter="currentFile.frontmatter"
                :file-type="currentFile.fileType"
                @navigate="navigateWikilink"
              />
            </div>

            <!-- Markdown body -->
            <div class="bg-white rounded-xl border shadow-sm p-6">
              <VaultMarkdownRenderer
                :html="currentFile.html"
                @navigate="navigateFromPath"
              />
            </div>
          </div>
        </div>
      </main>

      <!-- Right: Metadata & Backlinks OR MetaFlow Pipeline Sidebar -->
      <aside class="border-l bg-white overflow-y-auto">
        <!-- MetaFlow Supreme pipeline sidebar -->
        <MetaflowPipelineSidebar
          v-if="showMetaflowSidebar"
          @navigate="navigateFromPath"
        />

        <!-- Default sidebar: frontmatter + backlinks -->
        <template v-else>
          <div v-if="currentFile" class="p-4">
            <!-- Frontmatter (in sidebar for metaflow/dashboard/tools) -->
            <div v-if="!showFrontmatterAbove" class="mb-6">
              <VaultFrontmatterPanel
                :frontmatter="currentFile.frontmatter"
                :file-type="currentFile.fileType"
                @navigate="navigateWikilink"
              />
            </div>

            <!-- Backlinks + Relations -->
            <VaultBacklinksPanel
              :backlinks="currentFile.backlinks"
              :related-files="currentFile.relatedFiles"
              @navigate="navigateFromPath"
            />

            <!-- Outgoing links -->
            <div v-if="currentFile.outgoingLinks.length" class="mt-6">
              <h3 class="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
                Liens sortants ({{ currentFile.outgoingLinks.length }})
              </h3>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="link in currentFile.outgoingLinks"
                  :key="link.raw"
                  class="text-xs px-2 py-1 rounded-full transition-colors"
                  :class="link.resolved
                    ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 line-through cursor-default'"
                  :disabled="!link.resolved"
                  @click="link.resolved && navigateFromPath(link.resolved)"
                >{{ link.displayName }}</button>
              </div>
            </div>
          </div>

          <!-- Empty sidebar -->
          <div v-else class="p-4 text-sm text-gray-400 text-center mt-8">
            Selectionnez un fichier pour voir ses metadonnees et connexions
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  currentFile,
  currentPath,
  loading,
  error,
  searchQuery,
  searchResults,
  canGoBack,
  canGoForward,
  breadcrumbSegments,
  totalFiles,
  tree,
  filteredTree,
  fetchTree,
  openFile,
  goBack,
  goForward,
  search,
  expandToPath,
} = useVaultBrowser()

const route = useRoute()
const searchInput = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

// ─── Lifecycle ───

onMounted(async () => {
  await fetchTree()

  // Open file from URL query if present
  const pathFromUrl = route.query.path as string
  if (pathFromUrl) {
    openFile(pathFromUrl)
  }
})

// Keyboard shortcut: Cmd+K for search focus
onMounted(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      clearFile()
      nextTick(() => {
        const input = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement
        input?.focus()
      })
    }
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})

// ─── Search ───

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    search(searchInput.value)
  }, 300)
}

function onSearchSelect(path: string) {
  searchInput.value = ''
  searchResults.value = []
  openFile(path)
}

// ─── Navigation ───

function navigateWikilink(name: string) {
  // Name could be a raw wikilink target — try to resolve via the outgoing links of current file
  if (currentFile.value) {
    const match = currentFile.value.outgoingLinks.find(l => l.raw === name || l.displayName === name)
    if (match?.resolved) {
      openFile(match.resolved)
      return
    }
  }
  // Fallback: try to find in tree by searching
  search(name)
}

function navigateFromPath(path: string) {
  openFile(path)
}

function clearFile() {
  currentFile.value = null
  currentPath.value = null
  const router = useRouter()
  router.replace({ query: {} })
}

// ─── Computed ───

const showFrontmatterAbove = computed(() => {
  if (!currentFile.value) return false
  const ft = currentFile.value.fileType
  return ['agent', 'project', 'idea'].includes(ft)
})

const showMetaflowSidebar = computed(() => {
  if (!currentPath.value) return false
  return currentPath.value.startsWith('MetaFlow/supreme/')
})

const vaultStats = computed(() => {
  const counts: Record<string, { icon: string; count: number; label: string }> = {
    Agents: { icon: '🤖', count: 0, label: 'Agents' },
    Projets: { icon: '📁', count: 0, label: 'Projets' },
    'Idées': { icon: '💡', count: 0, label: 'Idees' },
    Tools: { icon: '🔧', count: 0, label: 'Outils' },
    MetaFlow: { icon: '🔄', count: 0, label: 'MetaFlow' },
    Dashboard: { icon: '📊', count: 0, label: 'Dashboard' },
  }

  function countInTree(nodes: any[], category: string) {
    for (const n of nodes) {
      if (n.type === 'file') counts[category].count++
      else if (n.children) countInTree(n.children, category)
    }
  }

  for (const node of tree.value) {
    if (counts[node.name]) {
      if (node.children) countInTree(node.children, node.name)
    }
  }

  return Object.values(counts).filter(c => c.count > 0)
})
</script>

<style scoped>
.vault-layout {
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  height: calc(100vh - 64px);
}

@media (max-width: 1024px) {
  .vault-layout {
    grid-template-columns: 240px 1fr;
  }
  .vault-layout > aside:last-child {
    display: none;
  }
}

@media (max-width: 768px) {
  .vault-layout {
    grid-template-columns: 1fr;
  }
  .vault-layout > aside:first-child {
    display: none;
  }
}
</style>
