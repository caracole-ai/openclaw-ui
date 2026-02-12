<template>
  <div>
    <Breadcrumb />
    <main class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/agents" class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux agents
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900">Créer un agent</h1>
        <p class="text-gray-500 mt-1">Workspace, bot Mattermost et config OpenClaw — tout est automatisé.</p>
      </div>

      <!-- Success state -->
      <div v-if="created" class="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
        <div class="flex items-center gap-3">
          <span class="text-3xl">{{ created.emoji }}</span>
          <div>
            <h2 class="text-lg font-semibold text-green-900">{{ created.name }} créé !</h2>
            <p class="text-sm text-green-700">{{ createResult?.message }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="bg-white rounded-lg p-3 border border-green-100">
            <div class="text-gray-500 text-xs mb-1">ID</div>
            <div class="font-mono font-medium">{{ created.id }}</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-green-100">
            <div class="text-gray-500 text-xs mb-1">Team</div>
            <div class="font-medium">{{ created.team }}</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-green-100">
            <div class="text-gray-500 text-xs mb-1">Role</div>
            <div class="font-medium">{{ created.role }}</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-green-100">
            <div class="text-gray-500 text-xs mb-1">Mattermost</div>
            <div class="font-mono font-medium">@{{ createResult?.mattermost?.username }}</div>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <span
            class="text-xs px-2 py-1 rounded-full"
            :class="createResult?.gatewayRestarted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
          >
            {{ createResult?.gatewayRestarted ? '✅ Gateway redémarré' : '⚠️ Redémarrer le gateway manuellement' }}
          </span>
        </div>

        <div class="flex gap-3 pt-2">
          <NuxtLink
            :to="`/agent/${created.id}`"
            class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Voir l'agent
          </NuxtLink>
          <button @click="resetAll" class="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Créer un autre
          </button>
        </div>
      </div>

      <!-- Tabs + Form -->
      <div v-else>
        <!-- Tab switcher -->
        <div class="flex border-b mb-6">
          <button
            @click="tab = 'quick'"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
            :class="tab === 'quick' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            ⚡ Création rapide
          </button>
          <button
            @click="tab = 'custom'"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
            :class="tab === 'custom' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            🔧 Création custom
          </button>
        </div>

        <!-- ═══════════ QUICK TAB ═══════════ -->
        <div v-if="tab === 'quick'" class="space-y-6">
          <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-700">
            Décris l'agent en langage naturel. L'IA remplira tous les champs automatiquement.
          </div>

          <!-- Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Décris ton agent</label>
            <textarea
              v-model="quickPrompt"
              rows="3"
              placeholder="Exemples :&#10;• Luna, équipe creative, illustratrice spécialisée en pixel art&#10;• Rex, développeur backend Python, équipe code&#10;• Émile, romancier français style Balzac"
              class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          <!-- Infer button -->
          <button
            @click="infer"
            :disabled="!quickPrompt.trim() || inferring"
            class="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="inferring" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ inferring ? 'Analyse en cours...' : '✨ Générer le profil' }}
          </button>

          <!-- Infer error -->
          <div v-if="inferError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {{ inferError }}
          </div>

          <!-- Inferred preview + confirm -->
          <div v-if="inferred" class="space-y-4">
            <div class="bg-white border-2 border-indigo-200 rounded-xl p-5 space-y-4">
              <!-- Agent preview -->
              <div class="flex items-center gap-4">
                <span class="text-5xl">{{ form.emoji }}</span>
                <div>
                  <div class="text-xl font-bold text-gray-900">{{ form.name }}</div>
                  <div class="text-sm text-gray-500">{{ form.role }} · {{ form.team }}</div>
                  <div class="text-xs text-gray-400 font-mono mt-0.5">{{ form.id }}</div>
                </div>
              </div>

              <!-- Soul description -->
              <div v-if="soulDescription" class="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-3">
                « {{ soulDescription }} »
              </div>

              <!-- Tags -->
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="skill in form.skills"
                  :key="skill"
                  class="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full"
                >
                  {{ skill }}
                </span>
                <span
                  v-for="project in form.projects"
                  :key="project"
                  class="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full"
                >
                  📁 {{ project }}
                </span>
              </div>

              <!-- Editable fields (collapsed by default) -->
              <details class="text-sm">
                <summary class="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium">
                  Modifier les détails
                </summary>
                <div class="mt-3 space-y-3">
                  <div class="grid grid-cols-3 gap-3">
                    <div class="col-span-1">
                      <label class="block text-xs text-gray-500 mb-1">ID</label>
                      <input v-model="form.id" class="w-full px-2 py-1.5 border rounded text-sm font-mono" />
                    </div>
                    <div class="col-span-1">
                      <label class="block text-xs text-gray-500 mb-1">Nom</label>
                      <input v-model="form.name" class="w-full px-2 py-1.5 border rounded text-sm" />
                    </div>
                    <div class="col-span-1">
                      <label class="block text-xs text-gray-500 mb-1">Emoji</label>
                      <input v-model="form.emoji" class="w-full px-2 py-1.5 border rounded text-sm text-center text-xl" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Équipe</label>
                      <select v-model="form.team" class="w-full px-2 py-1.5 border rounded text-sm">
                        <option value="system">System</option>
                        <option value="code">Code</option>
                        <option value="writing">Writing</option>
                        <option value="creative">Creative</option>
                        <option value="ops">Ops</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Rôle</label>
                      <input v-model="form.role" class="w-full px-2 py-1.5 border rounded text-sm" />
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <!-- Confirm creation -->
            <div class="flex gap-3">
              <button
                @click="submitForm"
                :disabled="submitting"
                class="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ submitting ? 'Création...' : '🚀 Créer cet agent' }}
              </button>
              <button
                @click="inferred = false"
                class="px-4 py-2.5 border text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Modifier
              </button>
            </div>
          </div>

          <!-- Creation progress -->
          <div v-if="submitting" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div class="text-sm text-blue-700">
                <div class="font-medium">Création en cours...</div>
                <div class="text-blue-600 mt-1">
                  📁 Workspace · 🤖 Bot Mattermost · ⚙️ Config OpenClaw · 🔄 Gateway restart
                </div>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-if="createError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span class="font-medium">Erreur :</span> {{ createError }}
          </div>
        </div>

        <!-- ═══════════ CUSTOM TAB ═══════════ -->
        <form v-if="tab === 'custom'" @submit.prevent="submitForm" class="space-y-6">

          <!-- Preview card -->
          <div v-if="form.name && form.emoji" class="bg-gray-50 rounded-xl p-4 flex items-center gap-4 border">
            <span class="text-4xl">{{ form.emoji }}</span>
            <div>
              <div class="font-semibold text-gray-900">{{ form.name }}</div>
              <div class="text-sm text-gray-500">{{ form.role || 'Role' }} · {{ form.team || 'Team' }}</div>
              <div class="text-xs text-gray-400 font-mono mt-0.5">{{ form.id || 'agent-id' }}</div>
            </div>
          </div>

          <!-- ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              ID <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.id"
              type="text"
              placeholder="luna"
              pattern="[a-z][a-z0-9-]*"
              required
              class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
            <p class="text-xs text-gray-400 mt-1">Minuscules, chiffres, tirets. Utilisé partout (workspace, MM, config).</p>
          </div>

          <!-- Name + Emoji -->
          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nom <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Luna"
                required
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Emoji <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.emoji"
                type="text"
                placeholder="🎨"
                required
                maxlength="4"
                class="w-full px-3 py-2 border rounded-lg text-sm text-center text-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <!-- Team + Role -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Équipe <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.team"
                required
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choisir...</option>
                <option value="system">🔧 System</option>
                <option value="code">💻 Code</option>
                <option value="writing">✍️ Writing</option>
                <option value="creative">🎨 Creative</option>
                <option value="ops">⚡ Ops</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Rôle <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.role"
                type="text"
                placeholder="designer, developer, reviewer..."
                required
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <!-- Model -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
            <select
              v-model="form.model"
              class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Par défaut (Opus)</option>
              <option value="anthropic/claude-opus-4-6">Claude Opus 4</option>
              <option value="anthropic/claude-sonnet-4-20250514">Claude Sonnet 4</option>
            </select>
          </div>

          <!-- Skills -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="skill in availableSkills"
                :key="skill"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition-colors"
                :class="form.skills.includes(skill) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white hover:bg-gray-50'"
              >
                <input type="checkbox" :value="skill" v-model="form.skills" class="sr-only" />
                <span class="text-xs">{{ form.skills.includes(skill) ? '✓' : '+' }}</span>
                {{ skill }}
              </label>
            </div>
          </div>

          <!-- Projects -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Projets</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="project in availableProjects"
                :key="project"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition-colors"
                :class="form.projects.includes(project) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white hover:bg-gray-50'"
              >
                <input type="checkbox" :value="project" v-model="form.projects" class="sr-only" />
                <span class="text-xs">{{ form.projects.includes(project) ? '✓' : '+' }}</span>
                {{ project }}
              </label>
            </div>
          </div>

          <!-- Error -->
          <div v-if="createError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span class="font-medium">Erreur :</span> {{ createError }}
          </div>

          <!-- Creation progress -->
          <div v-if="submitting" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div class="text-sm text-blue-700">
                <div class="font-medium">Création en cours...</div>
                <div class="text-blue-600 mt-1">
                  📁 Workspace · 🤖 Bot Mattermost · ⚙️ Config OpenClaw · 🔄 Gateway restart
                </div>
              </div>
            </div>
          </div>

          <!-- Submit -->
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ submitting ? 'Création...' : 'Créer l\'agent' }}
            </button>
            <NuxtLink
              to="/agents"
              class="px-4 py-2.5 border text-sm rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Annuler
            </NuxtLink>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

useHead({ title: 'Créer un agent - OpenClaw Dashboard' })

const tab = ref<'quick' | 'custom'>('quick')

const form = reactive({
  id: '',
  name: '',
  emoji: '',
  role: '',
  team: '',
  model: '',
  skills: [] as string[],
  projects: [] as string[],
})

const availableSkills = [
  'github', 'coding-agent', 'chrome-devtools-mcp',
  'mattermost-mcp', 'nano-banana-pro', 'peekaboo'
]

const availableProjects = ref<string[]>([])

// Quick mode state
const quickPrompt = ref('')
const inferring = ref(false)
const inferError = ref('')
const inferred = ref(false)
const soulDescription = ref('')

// Create state
const submitting = ref(false)
const createError = ref('')
const created = ref<typeof form | null>(null)
const createResult = ref<any>(null)

// Load projects
onMounted(async () => {
  try {
    const res = await $fetch<{ projects: { id: string }[] }>('/api/projects')
    availableProjects.value = res.projects.map(p => p.id)
  } catch {}
})

async function infer() {
  inferError.value = ''
  inferring.value = true
  inferred.value = false

  try {
    const res = await $fetch<any>('/api/agents/infer', {
      method: 'POST',
      body: { prompt: quickPrompt.value },
    })

    form.id = res.agent.id
    form.name = res.agent.name
    form.emoji = res.agent.emoji
    form.role = res.agent.role
    form.team = res.agent.team
    form.model = res.agent.model || ''
    form.skills = res.agent.skills || []
    form.projects = res.agent.projects || []
    soulDescription.value = res.soulDescription || ''
    inferred.value = true
  } catch (err: any) {
    inferError.value = err?.data?.statusMessage || err?.data?.message || err?.message || 'Erreur d\'inférence'
  } finally {
    inferring.value = false
  }
}

async function submitForm() {
  createError.value = ''
  submitting.value = true

  try {
    const payload: any = {
      id: form.id,
      name: form.name,
      emoji: form.emoji,
      role: form.role,
      team: form.team,
    }
    if (form.model) payload.model = form.model
    if (form.skills.length) payload.skills = form.skills
    if (form.projects.length) payload.projects = form.projects

    const res = await $fetch('/api/agents', { method: 'POST', body: payload })
    createResult.value = res
    created.value = { ...form }
  } catch (err: any) {
    createError.value = err?.data?.statusMessage || err?.data?.message || err?.message || 'Erreur inconnue'
  } finally {
    submitting.value = false
  }
}

function resetAll() {
  form.id = ''
  form.name = ''
  form.emoji = ''
  form.role = ''
  form.team = ''
  form.model = ''
  form.skills = []
  form.projects = []
  quickPrompt.value = ''
  inferred.value = false
  soulDescription.value = ''
  created.value = null
  createResult.value = null
  createError.value = ''
  inferError.value = ''
}
</script>
