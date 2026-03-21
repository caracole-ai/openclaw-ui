/**
 * Vault Browser composable — singleton state management for the /obsidian page.
 * Handles tree navigation, file loading, wikilink resolution, search, and URL sync.
 */

// ─── Types ───

interface VaultTreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  displayName?: string
  emoji?: string
  fileType?: string
  children?: VaultTreeNode[]
}

interface ResolvedLink {
  raw: string
  resolved: string | null
  displayName: string
}

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

interface VaultFileResponse {
  relativePath: string
  displayName: string
  emoji: string | null
  fileType: string
  category: string
  frontmatter: Record<string, any>
  html: string
  outgoingLinks: ResolvedLink[]
  backlinks: BacklinkEntry[]
  relatedFiles: RelatedFile[]
  modifiedAt: string
}

interface SearchResult {
  path: string
  displayName: string
  emoji?: string
  fileType: string
  snippet: string
  score: number
}

// ─── Module-level singleton state ───

const tree = ref<VaultTreeNode[]>([])
const totalFiles = ref(0)
const currentFile = ref<VaultFileResponse | null>(null)
const currentPath = ref<string | null>(null)
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const loading = ref(false)
const treeLoading = ref(false)
const searchLoading = ref(false)
const error = ref<string | null>(null)
const expandedFolders = ref(new Set<string>())
const history = ref<string[]>([])
const historyIndex = ref(-1)
const activeFilter = ref<string | null>(null)
const treeFilter = ref('')
const searchOpen = ref(false)

// ─── API calls ───

async function fetchTree() {
  treeLoading.value = true
  try {
    const data = await $fetch<{ tree: VaultTreeNode[]; totalFiles: number }>('/api/vault/tree')
    tree.value = data.tree
    totalFiles.value = data.totalFiles
  } catch (err: any) {
    console.error('[useVaultBrowser] Failed to fetch tree:', err)
    error.value = err.data?.message || err.message || 'Failed to load vault tree'
  } finally {
    treeLoading.value = false
  }
}

async function openFile(relativePath: string) {
  if (loading.value && currentPath.value === relativePath) return

  loading.value = true
  error.value = null

  try {
    const data = await $fetch<VaultFileResponse>('/api/vault/file', {
      query: { path: relativePath },
    })
    currentFile.value = data
    currentPath.value = relativePath

    // Push to history (trim forward history if we navigated back then somewhere new)
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(relativePath)
    historyIndex.value = history.value.length - 1

    // Auto-expand tree folders to show current file
    expandToPath(relativePath)

    // Update URL
    const router = useRouter()
    router.replace({ query: { path: relativePath } })
  } catch (err: any) {
    console.error('[useVaultBrowser] Failed to open file:', err)
    error.value = err.data?.message || err.message || 'Failed to load file'
  } finally {
    loading.value = false
  }
}

async function search(query: string) {
  searchQuery.value = query
  if (!query || query.length < 2) {
    searchResults.value = []
    return
  }

  searchLoading.value = true
  try {
    const data = await $fetch<{ results: SearchResult[] }>('/api/vault/search', {
      query: { q: query },
    })
    searchResults.value = data.results
  } catch (err: any) {
    console.error('[useVaultBrowser] Search failed:', err)
  } finally {
    searchLoading.value = false
  }
}

// ─── Navigation helpers ───

function goBack() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const path = history.value[historyIndex.value]
    // Direct load without pushing to history
    loadFileWithoutHistory(path)
  }
}

function goForward() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const path = history.value[historyIndex.value]
    loadFileWithoutHistory(path)
  }
}

async function loadFileWithoutHistory(relativePath: string) {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<VaultFileResponse>('/api/vault/file', {
      query: { path: relativePath },
    })
    currentFile.value = data
    currentPath.value = relativePath
    expandToPath(relativePath)
    const router = useRouter()
    router.replace({ query: { path: relativePath } })
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to load file'
  } finally {
    loading.value = false
  }
}

// ─── Tree helpers ───

function toggleFolder(path: string) {
  const folders = expandedFolders.value
  if (folders.has(path)) {
    folders.delete(path)
  } else {
    folders.add(path)
  }
}

function expandToPath(filePath: string) {
  const parts = filePath.split('/')
  for (let i = 1; i < parts.length; i++) {
    expandedFolders.value.add(parts.slice(0, i).join('/'))
  }
}

// ─── Filtered tree ───

const filteredTree = computed(() => {
  let nodes = tree.value

  // Filter by category
  if (activeFilter.value) {
    const filterMap: Record<string, string[]> = {
      agents: ['Agents'],
      projects: ['Projets'],
      ideas: ['Idées'],
      tools: ['Tools'],
      metaflow: ['MetaFlow'],
      dashboard: ['Dashboard'],
    }
    const allowed = filterMap[activeFilter.value]
    if (allowed) {
      nodes = nodes.filter(n => allowed.includes(n.name))
    }
  }

  // Filter by text search in tree
  if (treeFilter.value) {
    const q = treeFilter.value.toLowerCase()
    nodes = filterTreeNodes(nodes, q)
  }

  return nodes
})

function filterTreeNodes(nodes: VaultTreeNode[], query: string): VaultTreeNode[] {
  const result: VaultTreeNode[] = []

  for (const node of nodes) {
    const nameMatch = (node.displayName || node.name).toLowerCase().includes(query)

    if (node.type === 'file') {
      if (nameMatch) result.push(node)
    } else {
      // Folder: include if children match
      const filteredChildren = node.children ? filterTreeNodes(node.children, query) : []
      if (nameMatch || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        })
      }
    }
  }

  return result
}

// ─── Computed helpers ───

const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < history.value.length - 1)

const breadcrumbSegments = computed(() => {
  if (!currentPath.value) return []
  const parts = currentPath.value.split('/')
  return parts.map((part, i) => ({
    name: part,
    path: parts.slice(0, i + 1).join('/'),
    isLast: i === parts.length - 1,
  }))
})

// ─── Export ───

export function useVaultBrowser() {
  return {
    // State
    tree,
    totalFiles,
    currentFile,
    currentPath,
    searchQuery,
    searchResults,
    loading,
    treeLoading,
    searchLoading,
    error,
    expandedFolders,
    activeFilter,
    treeFilter,
    searchOpen,
    filteredTree,
    canGoBack,
    canGoForward,
    breadcrumbSegments,

    // Methods
    fetchTree,
    openFile,
    search,
    goBack,
    goForward,
    toggleFolder,
    expandToPath,
  }
}
