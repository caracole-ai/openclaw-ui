<template>
  <div class="metaflow-sidebar">
    <div class="px-4 py-3 border-b bg-gray-50">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline Supreme</h3>
    </div>

    <div v-if="loading" class="p-4 space-y-3">
      <div v-for="i in 6" :key="i" class="animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else class="overflow-y-auto pipeline-scroll">
      <!-- Stages -->
      <div v-for="(stage, idx) in stages" :key="stage.stage" class="relative">
        <!-- Connector line between stages -->
        <div
          v-if="idx > 0"
          class="absolute left-6 -top-px w-px h-3 bg-gray-300"
        ></div>

        <!-- Stage header -->
        <button
          class="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-indigo-50 transition-colors group"
          :class="{ 'bg-indigo-50': expandedStage === stage.stage }"
          @click="toggleStage(stage)"
        >
          <span class="text-base flex-shrink-0">{{ stage.stage_icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-700">
              {{ stage.stage_label }}
            </div>
            <div class="text-xs text-gray-400">{{ stage.actions.length }} actions</div>
          </div>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0"
            :class="{ 'rotate-90': expandedStage === stage.stage }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Actions list (expandable) -->
        <div
          v-if="expandedStage === stage.stage"
          class="bg-white border-l-2 border-indigo-300 ml-6 mr-2 mb-2 rounded-r-lg shadow-sm"
        >
          <button
            v-for="action in stage.actions"
            :key="action.id"
            class="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group/action"
            @click="selectAction(stage, action)"
          >
            <div class="flex items-center gap-2">
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :class="actionDotColor(action.type)"
              ></span>
              <span class="text-xs font-medium text-gray-700 group-hover/action:text-indigo-600 truncate">
                {{ action.label }}
              </span>
            </div>
            <div class="ml-3.5 mt-0.5 text-[10px] text-gray-400 truncate">
              {{ action.description }}
            </div>
            <!-- Cible badges -->
            <div class="ml-3.5 mt-1 flex flex-wrap gap-1">
              <span
                v-for="c in action.cible"
                :key="c"
                class="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                :class="cibleBadgeColor(c)"
              >{{ c }}</span>
            </div>
          </button>
        </div>

        <!-- Arrow connector to next stage -->
        <div
          v-if="idx < stages.length - 1 && expandedStage !== stage.stage"
          class="flex justify-center py-0.5"
        >
          <div class="w-px h-3 bg-gray-300"></div>
        </div>
      </div>
    </div>

    <!-- Action detail popover -->
    <Teleport to="body">
      <div
        v-if="selectedAction"
        class="fixed inset-0 z-50"
        @click="selectedAction = null"
      >
        <div
          class="absolute bg-white rounded-xl shadow-2xl border p-4 w-80"
          :style="popoverStyle"
          @click.stop
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span
                class="w-2 h-2 rounded-full"
                :class="actionDotColor(selectedAction.action.type)"
              ></span>
              <h4 class="text-sm font-semibold text-gray-900">{{ selectedAction.action.label }}</h4>
            </div>
            <button class="text-gray-400 hover:text-gray-600" @click="selectedAction = null">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p class="text-xs text-gray-600 mb-3">{{ selectedAction.action.description }}</p>

          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-gray-400 w-14">Type</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium" :class="actionTypeBadge(selectedAction.action.type)">
                {{ selectedAction.action.type }}
              </span>
            </div>
            <div v-if="selectedAction.action.endpoint" class="flex items-center gap-2">
              <span class="text-gray-400 w-14">Endpoint</span>
              <code class="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-indigo-600">
                {{ selectedAction.action.endpoint }}
              </code>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-gray-400 w-14">Cibles</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="c in selectedAction.action.cible"
                  :key="c"
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  :class="cibleBadgeColor(c)"
                >{{ c }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-gray-400 w-14">Stage</span>
              <span class="text-gray-700">{{ selectedAction.stage.stage_icon }} {{ selectedAction.stage.stage_label }}</span>
            </div>
          </div>

          <!-- Link to open the metaflow note -->
          <button
            class="mt-3 w-full text-center text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 py-1.5 rounded-lg transition-colors"
            @click="openNote(selectedAction.stage.file)"
          >
            Ouvrir la note MetaFlow
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
interface MetaflowAction {
  id: string
  type: string
  label: string
  endpoint?: string
  cible: string[]
  description: string
}

interface MetaflowStage {
  file: string
  stage: number
  stage_label: string
  stage_icon: string
  titre: string
  actions: MetaflowAction[]
}

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const stages = ref<MetaflowStage[]>([])
const loading = ref(true)
const expandedStage = ref<number | null>(null)
const selectedAction = ref<{ stage: MetaflowStage; action: MetaflowAction } | null>(null)
const popoverStyle = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    const data = await $fetch<{ stages: MetaflowStage[] }>('/api/metaflow/actions')
    stages.value = data.stages
  } catch (err) {
    console.error('[MetaflowPipelineSidebar] Failed to load actions:', err)
  } finally {
    loading.value = false
  }
})

function toggleStage(stage: MetaflowStage) {
  expandedStage.value = expandedStage.value === stage.stage ? null : stage.stage
}

function selectAction(stage: MetaflowStage, action: MetaflowAction) {
  selectedAction.value = { stage, action }
  // Position popover to the left of the sidebar
  popoverStyle.value = {
    top: '50%',
    right: '340px',
    transform: 'translateY(-50%)',
  }
}

function openNote(path: string) {
  selectedAction.value = null
  emit('navigate', path)
}

function actionDotColor(type: string): string {
  const map: Record<string, string> = {
    'api-call': 'bg-blue-500',
    'spawn': 'bg-purple-500',
    'side-effect': 'bg-amber-500',
    'db-write': 'bg-green-500',
    'notification': 'bg-pink-500',
  }
  return map[type] || 'bg-gray-400'
}

function actionTypeBadge(type: string): string {
  const map: Record<string, string> = {
    'api-call': 'bg-blue-100 text-blue-700',
    'spawn': 'bg-purple-100 text-purple-700',
    'side-effect': 'bg-amber-100 text-amber-700',
    'db-write': 'bg-green-100 text-green-700',
    'notification': 'bg-pink-100 text-pink-700',
  }
  return map[type] || 'bg-gray-100 text-gray-700'
}

function cibleBadgeColor(cible: string): string {
  const map: Record<string, string> = {
    'db': 'bg-green-50 text-green-600',
    'obsidian': 'bg-purple-50 text-purple-600',
    'mattermost': 'bg-blue-50 text-blue-600',
    'github': 'bg-gray-100 text-gray-700',
    'claude-code': 'bg-orange-50 text-orange-600',
    'claude-api': 'bg-orange-50 text-orange-600',
    'openclaw-ui': 'bg-indigo-50 text-indigo-600',
    'ideas-bot': 'bg-yellow-50 text-yellow-700',
    'filesystem': 'bg-gray-50 text-gray-500',
    'playwright': 'bg-red-50 text-red-600',
    'mattermost-orchestrator': 'bg-blue-50 text-blue-600',
  }
  return map[cible] || 'bg-gray-50 text-gray-500'
}
</script>

<style scoped>
.metaflow-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pipeline-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}
</style>
