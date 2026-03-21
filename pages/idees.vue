<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Idees</h1>
        <p class="text-sm text-gray-500 mt-1">{{ ideas.length }} idee{{ ideas.length > 1 ? 's' : '' }} dans le vault</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="syncVault"
          :disabled="syncing"
          class="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          {{ syncing ? 'Sync...' : 'Sync vault' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="bg-gray-50 rounded-lg p-3">
        <div v-for="j in 4" :key="j" class="bg-white rounded-lg p-3 mb-2 animate-pulse">
          <div class="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <!-- 3-column layout -->
    <div v-else class="grid grid-cols-3 gap-4">
      <div
        v-for="col in columns"
        :key="col.key"
        class="bg-gray-50 rounded-lg min-w-0 transition-colors"
        :class="{ 'bg-blue-50 ring-2 ring-blue-300': dragOverColumn === col.key }"
        @dragover.prevent="dragOverColumn = col.key"
        @dragleave="dragOverColumn = null"
        @drop="handleDrop($event, col.key)"
      >
        <!-- Column header -->
        <div
          class="p-3 border-b-2 flex items-center justify-between"
          :style="{ borderColor: col.color }"
        >
          <div class="flex items-center gap-2">
            <span>{{ col.icon }}</span>
            <span class="font-semibold text-gray-700 text-sm">{{ col.label }}</span>
          </div>
          <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {{ getIdeasForColumn(col.key).length }}
          </span>
        </div>

        <!-- Cards -->
        <div class="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto">
          <div
            v-for="idea in getIdeasForColumn(col.key)"
            :key="idea.id"
            draggable="true"
            class="bg-white rounded-lg px-3 py-2 shadow-sm border hover:shadow-md transition-all cursor-grab relative group"
            :class="[
              idea.statut === 'en-revue' ? 'border-l-2 border-l-blue-400' : '',
              draggingId === idea.id ? 'opacity-50 scale-95' : '',
            ]"
            @click="openReview(idea)"
            @dragstart="handleDragStart($event, idea)"
            @dragend="handleDragEnd"
          >
            <!-- Delete button -->
            <button
              class="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
              title="Supprimer"
              @click.stop="confirmDelete(idea)"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- Title row -->
            <div class="flex items-center gap-1.5 pr-4">
              <span class="text-xs">{{ energieIcon(idea.energie) }}</span>
              <span class="font-medium text-sm text-gray-900 line-clamp-1">{{ idea.titre }}</span>
            </div>

            <!-- Themes -->
            <div v-if="idea.themes.length" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="theme in idea.themes.slice(0, 2)"
                :key="theme"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
              >
                #{{ theme }}
              </span>
              <span v-if="idea.themes.length > 2" class="text-[10px] text-gray-400">
                +{{ idea.themes.length - 2 }}
              </span>
            </div>

            <!-- Score (compact) -->
            <div v-if="hasScore(idea)" class="mt-1.5 flex items-center gap-2">
              <div class="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :class="scoreColor(idea)"
                  :style="{ width: `${(aggregateScore(idea) / 10) * 100}%` }"
                ></div>
              </div>
              <span class="text-[10px] text-gray-400">{{ aggregateScore(idea) }}/10</span>
            </div>

            <!-- En-revue badge -->
            <div v-if="idea.statut === 'en-revue'" class="mt-1">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                En revue
              </span>
            </div>
          </div>

          <!-- Empty column -->
          <div
            v-if="getIdeasForColumn(col.key).length === 0"
            class="text-center py-8 text-gray-400 text-sm"
          >
            Aucune idee
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div
        v-if="ideaToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="ideaToDelete = null"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Supprimer cette idee ?</h3>
          <p class="text-sm text-gray-600 mb-1">
            <span class="font-medium">{{ ideaToDelete.titre }}</span>
          </p>
          <p class="text-sm text-gray-500 mb-5">
            L'idee sera supprimee de la base et du vault Obsidian. Cette action est irreversible.
          </p>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              @click="ideaToDelete = null"
            >
              Annuler
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              :disabled="isDeleting"
              @click="deleteIdea"
            >
              {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Review modal -->
    <IdeaReviewModal
      v-if="selectedIdea"
      :idea="selectedIdea"
      :visible="!!selectedIdea"
      @close="selectedIdea = null"
      @updated="onIdeaUpdated"
    />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Idea, IdeaEnergie } from '~/types/idea'
import { useIdeas } from '~/composables/useIdeas'
import { useToast } from '~/composables/useToast'

useHead({ title: 'OpenClaw - Idees' })

const { ideas, fetchIdeas, loading } = useIdeas()
const { success, error: toastError } = useToast()
const selectedIdea = ref<Idea | null>(null)
const syncing = ref(false)

// Drag state
const draggingId = ref<string | null>(null)
const dragOverColumn = ref<string | null>(null)

// Delete state
const ideaToDelete = ref<Idea | null>(null)
const isDeleting = ref(false)

// Column definitions
const columns = [
  { key: 'a-explorer', label: 'A explorer', icon: '\uD83D\uDD0D', color: '#6B7280' },
  { key: 'approuvee', label: 'Validee', icon: '\u2705', color: '#10B981' },
  { key: 'promue', label: 'Promue', icon: '\uD83D\uDE80', color: '#8B5CF6' },
] as const

function getIdeasForColumn(key: string): Idea[] {
  if (key === 'a-explorer') {
    return ideas.value.filter(i => i.statut === 'a-explorer' || i.statut === 'en-revue')
  }
  return ideas.value.filter(i => i.statut === key)
}

function energieIcon(energie: IdeaEnergie): string {
  switch (energie) {
    case 'haute': return '\u26A1'
    case 'moyenne': return '\uD83D\uDCA1'
    case 'basse': return '\uD83D\uDCAD'
    default: return '\uD83D\uDCA1'
  }
}

function aggregateScore(idea: Idea): number {
  return idea.scoreRealisme + idea.scoreImpact - idea.scoreEffort + 5
}

function hasScore(idea: Idea): boolean {
  return idea.scoreRealisme > 0 || idea.scoreEffort > 0 || idea.scoreImpact > 0
}

function scoreColor(idea: Idea): string {
  const s = aggregateScore(idea)
  if (s >= 8) return 'bg-green-500'
  if (s >= 5) return 'bg-yellow-500'
  return 'bg-red-500'
}

function handleDragStart(event: DragEvent, idea: Idea) {
  draggingId.value = idea.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', idea.id)
  }
}

function handleDragEnd() {
  draggingId.value = null
  dragOverColumn.value = null
}

async function handleDrop(event: DragEvent, columnKey: string) {
  event.preventDefault()
  const ideaId = event.dataTransfer?.getData('text/plain')

  if (ideaId) {
    const idea = ideas.value.find(i => i.id === ideaId)
    if (idea) {
      // Map column key to the actual statut value
      const newStatut = columnKey as 'a-explorer' | 'approuvee' | 'promue'

      // Skip if already in this column
      const currentColumn = idea.statut === 'en-revue' ? 'a-explorer' : idea.statut
      if (currentColumn === newStatut) {
        draggingId.value = null
        dragOverColumn.value = null
        return
      }

      try {
        await $fetch(`/api/ideas/${ideaId}`, {
          method: 'PATCH',
          body: { statut: newStatut },
        })
        const colLabel = columns.find(c => c.key === newStatut)?.label || newStatut
        success(`${idea.titre} → ${colLabel}`)
        await fetchIdeas()
      } catch (err: any) {
        toastError(`Erreur: ${err.message || 'Erreur inconnue'}`)
      }
    }
  }

  draggingId.value = null
  dragOverColumn.value = null
}

function confirmDelete(idea: Idea) {
  ideaToDelete.value = idea
}

async function deleteIdea() {
  if (!ideaToDelete.value || isDeleting.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/ideas/${ideaToDelete.value.id}`, { method: 'DELETE' })
    success(`${ideaToDelete.value.titre} supprimee`)
    ideaToDelete.value = null
    await fetchIdeas()
  } catch (err: any) {
    toastError(`Erreur: ${err.message || 'Erreur inconnue'}`)
  } finally {
    isDeleting.value = false
  }
}

function openReview(idea: Idea) {
  selectedIdea.value = idea
}

async function onIdeaUpdated() {
  await fetchIdeas()
  if (selectedIdea.value) {
    selectedIdea.value = ideas.value.find(i => i.id === selectedIdea.value!.id) || null
  }
}

async function syncVault() {
  syncing.value = true
  try {
    await $fetch('/api/vault/sync', { method: 'POST' })
    await fetchIdeas()
  } catch (err) {
    console.error('Vault sync failed:', err)
  } finally {
    syncing.value = false
  }
}
</script>
