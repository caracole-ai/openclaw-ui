<template>
  <div>
    <Breadcrumb />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-20 bg-gray-200 rounded-2xl"></div>
      <div class="flex gap-6">
        <div class="flex-1 h-96 bg-gray-200 rounded-2xl"></div>
        <div class="w-80 space-y-4">
          <div class="h-32 bg-gray-200 rounded-2xl"></div>
          <div class="h-32 bg-gray-200 rounded-2xl"></div>
          <div class="h-48 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <div class="text-6xl mb-4">😕</div>
      <p class="text-gray-500 text-lg">{{ error }}</p>
    </div>

    <!-- Project content -->
    <div v-else-if="project" class="space-y-6">
      
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- HEADER -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div 
              class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              :class="typeIconClass"
            >
              {{ typeIcon }}
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">{{ project.name }}</h1>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span 
                  class="px-2.5 py-0.5 text-sm font-medium rounded-full"
                  :class="statusClass"
                >
                  {{ statusLabel }}
                </span>
                <span class="text-sm text-gray-400">{{ project.type }}</span>
                <span 
                  v-if="project.priority === 'urgent'"
                  class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 animate-pulse"
                >
                  🔥 Urgent
                </span>
                <span 
                  v-if="project.isStale"
                  class="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700"
                >
                  ⚠️ Stale
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="text-right text-xs text-gray-400 hidden sm:block">
              <div>Créé {{ formatDate(project.createdAt) }}</div>
              <div>Màj {{ formatDate(project.updatedAt) }}</div>
            </div>
            <select 
              v-model="project.status"
              @change="updateStatus"
              class="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-blue-300 transition-colors focus:outline-none focus:border-blue-500"
            >
              <option value="planning">📋 Planification</option>
              <option value="in-progress">🔄 En cours</option>
              <option value="review">👀 En revue</option>
              <option value="paused">⏸️ En pause</option>
              <option value="completed">✅ Terminé</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- MAIN LAYOUT: Documents + Sidebar -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="flex flex-col lg:flex-row gap-6">
        
        <!-- ─────────────────────────────────────────────────────────────── -->
        <!-- MAIN: RETEX + DOCUMENTS -->
        <!-- ─────────────────────────────────────────────────────────────── -->
        <div class="flex-1 min-w-0 space-y-6">
          
          <!-- ─────────────────────────────────────────────────────────────── -->
          <!-- RETOUR D'EXPÉRIENCE (RETEX) - En haut -->
          <!-- ─────────────────────────────────────────────────────────────── -->
          <div v-if="retexDocs.length > 0" class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200">
            <!-- Header -->
            <div class="p-5 border-b border-amber-200">
              <h2 class="font-bold text-lg flex items-center gap-2 text-amber-800">
                <span class="text-2xl">📚</span>
                Retour d'expérience
                <span class="text-sm font-normal text-amber-600 ml-1">
                  {{ retexDocs.length }} RETEX
                </span>
              </h2>
              <p class="text-sm text-amber-700 mt-1">
                Apprentissages et leçons tirées par l'équipe projet
              </p>
            </div>

            <!-- RETEX cards -->
            <div class="p-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <button
                  v-for="doc in retexDocs"
                  :key="doc.path"
                  @click="openDoc(doc)"
                  class="flex items-start gap-3 p-4 rounded-xl bg-white/80 hover:bg-white hover:shadow-md border-2 border-amber-100 hover:border-amber-300 transition-all text-left group"
                >
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-110 transition-transform">
                    {{ getRetexEmoji(doc.name) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-gray-900 truncate">{{ formatRetexName(doc.name) }}</div>
                    <div class="text-xs text-amber-600 mt-1">
                      {{ formatFileSize(doc.size) }} · {{ formatDateShort(doc.modifiedAt) }}
                    </div>
                  </div>
                  <span class="text-amber-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all text-lg">→</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ─────────────────────────────────────────────────────────────── -->
          <!-- DOCUMENTATION -->
          <!-- ─────────────────────────────────────────────────────────────── -->
          <div class="bg-white rounded-2xl shadow-sm border">
            <!-- Header -->
            <div class="p-5 border-b">
              <h2 class="font-bold text-lg flex items-center gap-2">
                <span class="text-2xl">📄</span>
                Documentation
                <span v-if="regularDocsCount > 0" class="text-sm font-normal text-gray-400 ml-1">
                  {{ regularDocsCount }} fichier{{ regularDocsCount > 1 ? 's' : '' }}
                </span>
              </h2>
            </div>

            <!-- Documents content -->
            <div class="p-5">
              <div v-if="docs.length > 0" class="space-y-6">
                <div v-for="group in groupedDocs" :key="group.folder" class="space-y-3">
                  <!-- Folder header -->
                  <div class="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <span>{{ group.folder === '/' ? '📁' : '📂' }}</span>
                    <span>{{ group.folder === '/' ? 'Racine' : group.folder }}</span>
                    <span class="w-full h-px bg-gray-200 flex-1"></span>
                    <span class="text-gray-300">{{ group.docs.length }}</span>
                  </div>
                  
                  <!-- Docs grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <button
                      v-for="doc in group.docs"
                      :key="doc.path"
                      @click="openDoc(doc)"
                      class="flex items-start gap-3 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all text-left group"
                    >
                      <span class="text-2xl group-hover:scale-110 transition-transform mt-0.5">📝</span>
                      <div class="min-w-0 flex-1">
                        <div class="font-medium text-gray-900 truncate">{{ doc.name }}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          {{ formatFileSize(doc.size) }} · {{ formatDateShort(doc.modifiedAt) }}
                        </div>
                      </div>
                      <span class="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-lg">→</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="flex flex-col items-center justify-center py-16 text-gray-400">
                <span class="text-6xl mb-4">📭</span>
                <span class="text-lg font-medium mb-2">Aucun document</span>
                <span class="text-sm text-center max-w-md">
                  Les agents peuvent sauvegarder leurs livrables avec la commande<br>
                  <code class="bg-gray-100 px-2 py-1 rounded mt-2 inline-block font-mono text-xs">
                    project-update.sh {{ project.id }} doc "fichier.md"
                  </code>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────── -->
        <!-- SIDEBAR -->
        <!-- ─────────────────────────────────────────────────────────────── -->
        <div class="w-full lg:w-80 flex-shrink-0 space-y-4">

          <!-- Team card -->
          <div v-if="project.team?.length || project.assignees?.length" class="bg-white rounded-2xl shadow-sm border p-5">
            <h3 class="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <span>👥</span> Équipe
              <span class="text-xs font-normal text-gray-400">
                {{ project.team?.length || project.assignees?.length }}
              </span>
            </h3>

            <div class="space-y-2">
              <!-- Team with roles -->
              <template v-if="project.team?.length">
                <div 
                  v-for="member in project.team" 
                  :key="member.agent"
                  class="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                >
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {{ member.agent.charAt(0).toUpperCase() }}
                  </div>
                  <NuxtLink :to="`/agent/${member.agent}`" class="flex-1 min-w-0 hover:opacity-75 transition-opacity">
                    <div class="font-medium text-sm text-blue-700 truncate">{{ member.agent }}</div>
                    <div class="text-xs text-gray-500 truncate">{{ member.role }}</div>
                  </NuxtLink>
                </div>
              </template>
              <!-- Fallback to assignees -->
              <template v-else-if="project.assignees?.length">
                <NuxtLink 
                  v-for="agent in project.assignees" 
                  :key="agent"
                  :to="`/agent/${agent}`"
                  class="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold">
                    {{ agent.charAt(0).toUpperCase() }}
                  </div>
                  <div class="font-medium text-sm text-blue-700 truncate">{{ agent }}</div>
                </NuxtLink>
              </template>
            </div>
          </div>
          
          <!-- Progress card -->
          <div class="bg-white rounded-2xl shadow-sm border p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <span>📊</span> Progress
              </h3>
              <span 
                class="text-2xl font-bold"
                :class="{
                  'text-gray-300': project.progress === 0,
                  'text-blue-500': project.progress > 0 && project.progress < 50,
                  'text-amber-500': project.progress >= 50 && project.progress < 100,
                  'text-green-500': project.progress === 100
                }"
              >
                {{ project.progress }}%
              </span>
            </div>

            <!-- Progress bar -->
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div 
                class="h-full rounded-full transition-all duration-500"
                :class="{
                  'bg-gray-300': project.progress === 0,
                  'bg-blue-500': project.progress > 0 && project.progress < 50,
                  'bg-amber-500': project.progress >= 50 && project.progress < 100,
                  'bg-green-500': project.progress === 100
                }"
                :style="{ width: `${project.progress}%` }"
              ></div>
            </div>

            <input 
              type="range" 
              v-model.number="project.progress"
              @change="updateProgress"
              min="0" 
              max="100"
              class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            >
          </div>

          <!-- Phases card -->
          <div class="bg-white rounded-2xl shadow-sm border p-5">
            <h3 class="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <span>📋</span> Phases
              <span class="text-xs font-normal text-gray-400">
                {{ completedPhases }}/{{ project.phases?.length ?? 0 }}
              </span>
            </h3>

            <div v-if="project.phases?.length > 0" class="space-y-2 max-h-40 overflow-y-auto pr-1">
              <div 
                v-for="(phase, index) in project.phases" 
                :key="index"
                class="flex items-center gap-2 p-2 rounded-lg text-sm"
                :class="{
                  'bg-green-50': phase.status === 'completed',
                  'bg-blue-50': phase.status === 'in-progress',
                  'bg-gray-50': phase.status === 'pending'
                }"
              >
                <span class="text-base">
                  {{ phase.status === 'completed' ? '✅' : phase.status === 'in-progress' ? '🔄' : '⏳' }}
                </span>
                <span class="flex-1 truncate">{{ phase.name }}</span>
                <button 
                  v-if="phase.status !== 'completed'"
                  @click="completePhase(phase.name)"
                  class="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  ✓
                </button>
              </div>
            </div>

            <div v-else class="text-center py-4 text-gray-400 text-sm">
              Aucune phase
            </div>
          </div>

          <!-- History card -->
          <div class="bg-white rounded-2xl shadow-sm border p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <span>📝</span> Historique
              </h3>
              <button 
                @click="showAddUpdate = !showAddUpdate"
                class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                +
              </button>
            </div>

            <!-- Add update form -->
            <div v-if="showAddUpdate" class="mb-3 p-3 bg-blue-50 rounded-xl">
              <textarea 
                v-model="newUpdate"
                rows="2"
                class="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-blue-400"
                placeholder="Note..."
              ></textarea>
              <div class="flex justify-end gap-2">
                <button 
                  @click="showAddUpdate = false" 
                  class="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                >
                  ✕
                </button>
                <button 
                  @click="addUpdate"
                  class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  OK
                </button>
              </div>
            </div>

            <!-- Updates list -->
            <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
              <div 
                v-for="(update, index) in (project.updates ?? []).slice().reverse().slice(0, 10)" 
                :key="index"
                class="p-2 rounded-lg bg-gray-50 text-sm"
              >
                <div class="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <span>{{ getUpdateIcon(update.type) }}</span>
                  <span class="font-medium text-gray-600">{{ update.agentId }}</span>
                  <span>·</span>
                  <span>{{ formatDateShort(update.timestamp) }}</span>
                </div>
                <p class="text-gray-700 text-xs line-clamp-2">{{ update.message }}</p>
              </div>

              <div v-if="!project.updates?.length" class="text-center py-4 text-gray-400 text-sm">
                Aucune mise à jour
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- DOC VIEWER MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showDocModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div 
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeDoc"
          ></div>
          
          <!-- Modal -->
          <Transition
            enter-active-class="transition-all duration-200 delay-75"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div 
              v-if="showDocModal"
              class="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <!-- Header -->
              <div class="flex items-center justify-between p-5 border-b bg-gradient-to-r from-gray-50 to-white">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">📝</span>
                  <div>
                    <h3 class="font-bold text-lg">{{ currentDoc?.name }}</h3>
                    <p class="text-xs text-gray-500">{{ currentDoc?.folder !== '/' ? currentDoc?.folder + '/' : '' }}{{ currentDoc?.name }}</p>
                  </div>
                </div>
                <button 
                  @click="closeDoc"
                  class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              
              <!-- Content -->
              <div class="flex-1 overflow-y-auto p-6">
                <div v-if="docLoading" class="animate-pulse space-y-4">
                  <div class="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
                <div 
                  v-else
                  class="prose prose-sm max-w-none prose-headings:text-gray-900 prose-a:text-blue-600"
                  v-html="renderedMarkdown"
                ></div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ProjectDetail as Project } from '~/types/project'

interface DocFile {
  name: string
  path: string
  size: number
  modifiedAt: string
  folder?: string
}

interface GroupedDocs {
  folder: string
  docs: DocFile[]
}

const route = useRoute()
const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref('')
const showAddUpdate = ref(false)
const newUpdate = ref('')

// Documentation state
const docs = ref<DocFile[]>([])
const showDocModal = ref(false)
const currentDoc = ref<DocFile | null>(null)
const docContent = ref('')
const docLoading = ref(false)

const typeIcon = computed(() => {
  switch (project.value?.type) {
    case 'code': return '💻'
    case 'writing': return '✍️'
    case 'hybrid': return '🔀'
    default: return '📁'
  }
})

const typeIconClass = computed(() => {
  switch (project.value?.type) {
    case 'code': return 'bg-gradient-to-br from-blue-100 to-blue-200'
    case 'writing': return 'bg-gradient-to-br from-amber-100 to-amber-200'
    case 'hybrid': return 'bg-gradient-to-br from-purple-100 to-purple-200'
    default: return 'bg-gradient-to-br from-gray-100 to-gray-200'
  }
})

const statusClass = computed(() => {
  switch (project.value?.status) {
    case 'planning': return 'bg-gray-100 text-gray-700'
    case 'in-progress': return 'bg-blue-100 text-blue-700'
    case 'review': return 'bg-purple-100 text-purple-700'
    case 'paused': return 'bg-yellow-100 text-yellow-700'
    case 'completed': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    'planning': 'Planification',
    'in-progress': 'En cours',
    'review': 'En revue',
    'paused': 'En pause',
    'completed': 'Terminé',
    'archived': 'Archivé'
  }
  return labels[project.value?.status || ''] || project.value?.status
})

const completedPhases = computed(() => {
  return project.value?.phases?.filter(p => p.status === 'completed').length ?? 0
})

// Separate RETEX docs from regular docs
// Includes: retex/ folder OR any REX*.md / RETEX*.md / RETOUR*.md at root
const retexDocs = computed<DocFile[]>(() => {
  return docs.value.filter(doc => {
    // Files in retex/ folder
    if (doc.folder === 'retex') return true
    // REX/RETEX/RETOUR files at root
    if (doc.folder === '/' || !doc.folder) {
      const name = doc.name.toUpperCase()
      if (name.startsWith('REX') || name.startsWith('RETEX') || name.startsWith('RETOUR')) return true
    }
    return false
  })
})

// Group docs by folder (excluding retex docs)
const groupedDocs = computed<GroupedDocs[]>(() => {
  const groups: Record<string, DocFile[]> = {}
  const retexSet = new Set(retexDocs.value.map(d => d.path))
  
  for (const doc of docs.value) {
    const folder = doc.folder || '/'
    // Exclude retex docs - they have their own section
    if (retexSet.has(doc.path)) continue
    if (!groups[folder]) groups[folder] = []
    groups[folder].push(doc)
  }
  
  return Object.entries(groups)
    .map(([folder, docs]) => ({ folder, docs }))
    .sort((a, b) => {
      if (a.folder === '/') return -1
      if (b.folder === '/') return 1
      return a.folder.localeCompare(b.folder)
    })
})

// Count non-retex docs
const regularDocsCount = computed(() => {
  return docs.value.filter(doc => doc.folder !== 'retex').length
})

// Get icon for update type
function getUpdateIcon(type?: string): string {
  switch (type) {
    case 'status': return '🔄'
    case 'progress': return '📈'
    case 'phase': return '📋'
    case 'note': return '💬'
    case 'document': return '📄'
    case 'assignment': return '👤'
    case 'created': return '🎉'
    case 'nudge': return '📢'
    default: return '📝'
  }
}

// Get emoji for RETEX based on agent name
function getRetexEmoji(filename: string): string {
  const name = filename.toLowerCase()
  if (name.includes('axis')) return '📐'
  if (name.includes('maya')) return '🧠'
  if (name.includes('silas')) return '✍️'
  if (name.includes('cosmos')) return '🌍'
  if (name.includes('mnemosyne')) return '📚'
  return '💡'
}

// Format RETEX filename to readable name
function formatRetexName(filename: string): string {
  // RETEX_AXIS_THORNE.md → Axis Thorne
  return filename
    .replace(/^RETEX_/, '')
    .replace(/\.md$/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Simple markdown to HTML
const renderedMarkdown = computed(() => {
  if (!docContent.value) return ''
  
  let html = docContent.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-xl overflow-x-auto my-4 text-sm"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.*)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*)$/gm, '<li class="ml-4">$2</li>')
    .replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-blue-300 pl-4 my-3 text-gray-600 italic">$1</blockquote>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200">')
    .replace(/\n\n/g, '</p><p class="my-3">')
    .replace(/\n/g, '<br>')
  
  return `<p class="my-3">${html}</p>`
})

async function fetchProject() {
  loading.value = true
  try {
    const response = await fetch(`/api/projects/${route.params.id}`)
    if (!response.ok) throw new Error('Projet non trouvé')
    project.value = await response.json()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchDocs() {
  try {
    const response = await fetch(`/api/projects/${route.params.id}/docs`)
    if (response.ok) {
      const data = await response.json()
      docs.value = data.docs || []
    }
  } catch (e) {
    console.error('Failed to fetch docs:', e)
  }
}

async function openDoc(doc: DocFile) {
  currentDoc.value = doc
  showDocModal.value = true
  docLoading.value = true
  docContent.value = ''
  
  try {
    const encodedPath = encodeURIComponent(doc.path)
    const response = await fetch(`/api/projects/${route.params.id}/docs/${encodedPath}`)
    if (response.ok) {
      const data = await response.json()
      docContent.value = data.content
    }
  } catch (e) {
    docContent.value = '❌ Erreur lors du chargement du document'
  } finally {
    docLoading.value = false
  }
}

function closeDoc() {
  showDocModal.value = false
  currentDoc.value = null
  docContent.value = ''
}

async function updateProject(updates: any) {
  if (!project.value) return
  try {
    const response = await fetch(`/api/projects/${project.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (response.ok) {
      project.value = await response.json()
    }
  } catch (e) {
    console.error('Failed to update project:', e)
  }
}

function updateStatus() {
  updateProject({ 
    status: project.value?.status,
    message: `Status changé en ${project.value?.status}`
  })
}

function updateProgress() {
  updateProject({ 
    progress: project.value?.progress,
    message: `Progression mise à jour: ${project.value?.progress}%`
  })
}

function completePhase(phaseName: string) {
  const phases = project.value?.phases || []
  const currentIndex = phases.findIndex(p => p.name === phaseName)
  const nextPhase = phases[currentIndex + 1]?.name

  updateProject({
    currentPhase: nextPhase,
    message: `Phase "${phaseName}" terminée`
  })
}

function addUpdate() {
  if (!newUpdate.value.trim()) return
  updateProject({ message: newUpdate.value })
  newUpdate.value = ''
  showAddUpdate.value = false
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateShort(timestamp: string): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(() => {
  fetchProject()
  fetchDocs()
})

useHead({
  title: computed(() => project.value?.name ? `${project.value.name} - OpenClaw` : 'Projet - OpenClaw')
})

// Set project name in route meta for breadcrumb
watch(() => project.value, (newProject) => {
  if (newProject?.name) {
    route.meta.projectName = newProject.name
  }
}, { immediate: true })
</script>

<style scoped>
/* Line clamp for history */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
