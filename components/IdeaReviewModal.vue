<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900">{{ idea.titre }}</h2>
            <div class="flex items-center gap-2 mt-1">
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="statutClass"
              >{{ statutLabel }}</span>
              <span class="text-xs text-gray-500">{{ idea.source }} &middot; {{ formatDate(idea.date) }}</span>
            </div>
          </div>
          <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <!-- Scoring -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Scoring</h3>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-xs text-gray-500 block mb-1">Realisme</label>
                <ScoreStars v-model="scores.realisme" :readonly="idea.statut === 'promue'" show-value />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Effort</label>
                <ScoreStars v-model="scores.effort" :readonly="idea.statut === 'promue'" show-value />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Impact</label>
                <ScoreStars v-model="scores.impact" :readonly="idea.statut === 'promue'" show-value />
              </div>
            </div>
            <div class="text-sm text-gray-600">
              Score pondere : <strong>{{ weightedScore }}</strong>/10
            </div>
          </div>

          <!-- Themes -->
          <div v-if="idea.themes.length" class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Themes</h3>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="theme in idea.themes"
                :key="theme"
                class="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full"
              >#{{ theme }}</span>
            </div>
          </div>

          <!-- Body preview -->
          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contenu</h3>
            <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {{ body || idea.bodyPreview || 'Aucun contenu' }}
            </div>
          </div>

          <!-- Promotion form (only if approved) -->
          <div v-if="idea.statut === 'approuvee'" class="space-y-4 pt-4 border-t">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Promouvoir en projet</h3>

            <div>
              <label class="text-xs text-gray-500 block mb-1">Nom du projet</label>
              <input
                v-model="promote.name"
                type="text"
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="text-xs text-gray-500 block mb-1">Type</label>
              <select
                v-model="promote.type"
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="code">Code</option>
                <option value="writing">Writing</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div v-if="agents.length">
              <label class="text-xs text-gray-500 block mb-1">Agents suggeres</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="agent in agents"
                  :key="agent.id"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors"
                  :class="promote.agents.includes(agent.id) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white hover:bg-gray-50'"
                >
                  <input
                    type="checkbox"
                    :value="agent.id"
                    v-model="promote.agents"
                    class="sr-only"
                  />
                  {{ agent.emoji || '' }} {{ agent.name }}
                </label>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="promote.createGithub" id="create-github" class="rounded" />
              <label for="create-github" class="text-sm text-gray-700">Creer un repo GitHub</label>
            </div>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              v-if="canReject"
              @click="updateStatut('rejetee')"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >Rejeter</button>
            <button
              v-if="canExplore"
              @click="updateStatut('a-explorer')"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >Garder en exploration</button>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="canSaveScores"
              @click="saveScores"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >Sauvegarder scores</button>
            <button
              v-if="canApprove"
              @click="updateStatut('approuvee')"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >Approuver</button>
            <button
              v-if="canPromote"
              @click="promoteIdea"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >Promouvoir en projet</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Idea } from '~/types/idea'

const props = defineProps<{
  idea: Idea
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

// Load agents for selection
const { agents } = useAgents()

const saving = ref(false)
const body = ref('')

const scores = reactive({
  realisme: 0,
  effort: 0,
  impact: 0,
})

const promote = reactive({
  name: '',
  type: 'code' as string,
  agents: [] as string[],
  createGithub: false,
})

// Sync from prop
watch(() => props.idea, (idea) => {
  if (idea) {
    scores.realisme = idea.scoreRealisme
    scores.effort = idea.scoreEffort
    scores.impact = idea.scoreImpact
    promote.name = idea.titre
    promote.agents = []
    loadBody(idea.id)
  }
}, { immediate: true })

const weightedScore = computed(() => {
  return Math.max(0, Math.min(10, scores.realisme + scores.impact - scores.effort + 5))
})

const statutLabel = computed(() => {
  const labels: Record<string, string> = {
    'a-explorer': 'A explorer', 'en-revue': 'En revue', 'approuvee': 'Approuvee',
    'rejetee': 'Rejetee', 'promue': 'Promue',
  }
  return labels[props.idea.statut] || props.idea.statut
})

const statutClass = computed(() => {
  const classes: Record<string, string> = {
    'a-explorer': 'bg-gray-100 text-gray-700',
    'en-revue': 'bg-blue-100 text-blue-700',
    'approuvee': 'bg-green-100 text-green-700',
    'rejetee': 'bg-red-100 text-red-700',
    'promue': 'bg-purple-100 text-purple-700',
  }
  return classes[props.idea.statut] || 'bg-gray-100 text-gray-700'
})

const canReject = computed(() => ['a-explorer', 'en-revue'].includes(props.idea.statut))
const canExplore = computed(() => props.idea.statut === 'en-revue')
const canApprove = computed(() => ['a-explorer', 'en-revue'].includes(props.idea.statut))
const canPromote = computed(() => props.idea.statut === 'approuvee')
const canSaveScores = computed(() => !['promue', 'rejetee'].includes(props.idea.statut))

async function loadBody(id: string) {
  try {
    const data = await $fetch<{ body: string }>(`/api/ideas/${id}`)
    body.value = data.body || ''
  } catch {
    body.value = ''
  }
}

async function saveScores() {
  saving.value = true
  try {
    await $fetch(`/api/ideas/${props.idea.id}`, {
      method: 'PATCH',
      body: {
        score_realisme: scores.realisme,
        score_effort: scores.effort,
        score_impact: scores.impact,
        statut: props.idea.statut === 'a-explorer' ? 'en-revue' : undefined,
        reviewed_at: new Date().toISOString(),
      },
    })
    emit('updated')
  } catch (err: any) {
    console.error('Failed to save scores:', err)
  } finally {
    saving.value = false
  }
}

async function updateStatut(statut: string) {
  saving.value = true
  try {
    await $fetch(`/api/ideas/${props.idea.id}`, {
      method: 'PATCH',
      body: {
        statut,
        score_realisme: scores.realisme,
        score_effort: scores.effort,
        score_impact: scores.impact,
        reviewed_at: new Date().toISOString(),
      },
    })
    emit('updated')
    emit('close')
  } catch (err: any) {
    console.error('Failed to update statut:', err)
  } finally {
    saving.value = false
  }
}

async function promoteIdea() {
  saving.value = true
  try {
    const result = await $fetch<{ projectId: string }>(`/api/ideas/${props.idea.id}/promote`, {
      method: 'POST',
      body: {
        name: promote.name,
        type: promote.type,
        agents: promote.agents.map(id => ({ id })),
      },
    })

    // Optionally create GitHub repo
    if (promote.createGithub && result.projectId) {
      try {
        await $fetch(`/api/projects/${result.projectId}/github`, { method: 'POST' })
      } catch (err) {
        console.error('Failed to create GitHub repo:', err)
      }
    }

    emit('updated')
    emit('close')

    // Navigate to new project
    navigateTo(`/project/${result.projectId}`)
  } catch (err: any) {
    console.error('Failed to promote idea:', err)
  } finally {
    saving.value = false
  }
}

function formatDate(date: string): string {
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
  } catch {
    return date
  }
}
</script>
