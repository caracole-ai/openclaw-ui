<template>
  <div class="space-y-4">
    <!-- Header with emoji + name -->
    <div class="flex items-center gap-3">
      <span v-if="frontmatter.emoji" class="text-3xl">{{ frontmatter.emoji }}</span>
      <div>
        <h2 class="text-lg font-bold text-gray-900">{{ frontmatter.titre || frontmatter.nom || 'Sans titre' }}</h2>
        <p v-if="frontmatter.id" class="text-xs text-gray-400 font-mono">{{ frontmatter.id }}</p>
      </div>
    </div>

    <!-- Badges row -->
    <div class="flex flex-wrap gap-1.5">
      <span v-if="frontmatter.team" class="badge badge-blue">{{ frontmatter.team }}</span>
      <span v-if="frontmatter.role" class="badge badge-purple">{{ frontmatter.role }}</span>
      <span v-if="frontmatter.type" class="badge badge-gray">{{ frontmatter.type }}</span>
      <span v-if="frontmatter.statut" :class="statusClass">{{ frontmatter.statut }}</span>
      <span v-if="frontmatter.status" :class="statusClassEn">{{ frontmatter.status }}</span>
      <span v-if="frontmatter.energie" :class="energieClass">{{ frontmatter.energie }}</span>
      <span v-if="frontmatter.source" class="badge badge-gray">{{ frontmatter.source }}</span>
    </div>

    <!-- Progress bar (projects) -->
    <div v-if="frontmatter.progression !== undefined" class="space-y-1">
      <div class="flex justify-between text-xs text-gray-500">
        <span>Progression</span>
        <span class="font-medium">{{ frontmatter.progression }}%</span>
      </div>
      <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all"
          :class="progressColor"
          :style="{ width: `${frontmatter.progression}%` }"
        ></div>
      </div>
    </div>

    <!-- Phase -->
    <div v-if="frontmatter.phase_courante" class="text-sm">
      <span class="text-gray-500">Phase:</span>
      <span class="ml-1 font-medium">{{ frontmatter.phase_courante }}</span>
    </div>

    <!-- Scores (ideas) -->
    <div v-if="hasScores" class="grid grid-cols-3 gap-2">
      <div v-for="score in scores" :key="score.label" class="text-center">
        <div class="text-xs text-gray-500 mb-1">{{ score.label }}</div>
        <div class="flex justify-center gap-0.5">
          <span v-for="i in 5" :key="i" class="text-xs" :class="i <= score.value ? 'text-yellow-400' : 'text-gray-200'">★</span>
        </div>
      </div>
    </div>

    <!-- Lead -->
    <div v-if="frontmatter.lead" class="text-sm">
      <span class="text-gray-500">Lead:</span>
      <button
        v-if="isWikilink(String(frontmatter.lead))"
        class="ml-1 vault-link"
        @click="$emit('navigate', stripWikilink(String(frontmatter.lead)))"
      >{{ stripWikilink(String(frontmatter.lead)) }}</button>
      <span v-else class="ml-1 font-medium">{{ frontmatter.lead }}</span>
    </div>

    <!-- Team / Equipe -->
    <div v-if="teamMembers.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">Equipe</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="member in teamMembers" :key="member.name"
          class="vault-link text-sm"
          @click="$emit('navigate', member.name)"
        >{{ member.name }}<span v-if="member.role" class="text-gray-400 ml-1">({{ member.role }})</span></button>
      </div>
    </div>

    <!-- Skills -->
    <div v-if="skillLinks.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">Skills</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="skill in skillLinks" :key="skill"
          class="vault-link text-sm"
          @click="$emit('navigate', skill)"
        >⚡ {{ skill }}</button>
      </div>
    </div>

    <!-- MCPs -->
    <div v-if="mcpLinks.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">MCPs</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="mcp in mcpLinks" :key="mcp"
          class="vault-link text-sm"
          @click="$emit('navigate', mcp)"
        >🔌 {{ mcp }}</button>
      </div>
    </div>

    <!-- Expertise -->
    <div v-if="frontmatter.expertise?.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">Expertise</span>
      <div class="flex flex-wrap gap-1">
        <span v-for="tag in frontmatter.expertise" :key="tag" class="badge badge-gray text-xs">{{ tag }}</span>
      </div>
    </div>

    <!-- Tags -->
    <div v-if="frontmatter.tags?.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">Tags</span>
      <div class="flex flex-wrap gap-1">
        <span v-for="tag in frontmatter.tags" :key="tag" class="badge badge-gray text-xs">{{ tag }}</span>
      </div>
    </div>

    <!-- Stack -->
    <div v-if="frontmatter.stack?.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">Stack</span>
      <div class="flex flex-wrap gap-1">
        <span v-for="tech in frontmatter.stack" :key="tech" class="badge badge-blue text-xs">{{ tech }}</span>
      </div>
    </div>

    <!-- Themes (ideas) -->
    <div v-if="frontmatter.themes?.length" class="space-y-1.5">
      <span class="text-xs text-gray-500 uppercase tracking-wider font-medium">Themes</span>
      <div class="flex flex-wrap gap-1">
        <span v-for="theme in frontmatter.themes" :key="theme" class="badge badge-purple text-xs">{{ theme }}</span>
      </div>
    </div>

    <!-- GitHub -->
    <div v-if="frontmatter.github?.url" class="text-sm">
      <a :href="frontmatter.github.url" target="_blank" rel="noopener" class="text-blue-600 hover:underline flex items-center gap-1">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </a>
    </div>

    <!-- Dates -->
    <div v-if="frontmatter.created_at || frontmatter.date" class="text-xs text-gray-400 pt-2 border-t">
      <div v-if="frontmatter.date">Date: {{ frontmatter.date }}</div>
      <div v-if="frontmatter.created_at">Cree: {{ frontmatter.created_at }}</div>
      <div v-if="frontmatter.updated_at">MAJ: {{ frontmatter.updated_at }}</div>
    </div>

    <!-- Description (MCPs / tools) -->
    <div v-if="frontmatter.description" class="text-sm text-gray-600">
      {{ frontmatter.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  frontmatter: Record<string, any>
  fileType: string
}>()

defineEmits<{
  (e: 'navigate', name: string): void
}>()

// ─── Helpers ───

function isWikilink(val: string): boolean {
  return val.startsWith('[[') && val.endsWith(']]')
}

function stripWikilink(val: string): string {
  return val.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim()
}

function extractWikilinkArray(arr: any[]): string[] {
  if (!arr) return []
  return arr.map(v => stripWikilink(String(v))).filter(Boolean)
}

// ─── Computed ───

const skillLinks = computed(() => extractWikilinkArray(props.frontmatter.skills))
const mcpLinks = computed(() => extractWikilinkArray(props.frontmatter.mcps))

const teamMembers = computed(() => {
  const equipe = props.frontmatter.equipe
  if (!Array.isArray(equipe)) return []
  return equipe.map((m: any) => ({
    name: typeof m === 'string' ? stripWikilink(m) : stripWikilink(String(m.agent || '')),
    role: typeof m === 'object' ? m.role : null,
  })).filter((m: any) => m.name)
})

const hasScores = computed(() => {
  return props.frontmatter.score_realisme !== undefined
    || props.frontmatter.score_effort !== undefined
    || props.frontmatter.score_impact !== undefined
})

const scores = computed(() => [
  { label: 'Realisme', value: props.frontmatter.score_realisme || 0 },
  { label: 'Effort', value: props.frontmatter.score_effort || 0 },
  { label: 'Impact', value: props.frontmatter.score_impact || 0 },
])

const statusClass = computed(() => {
  const map: Record<string, string> = {
    'cadrage': 'badge badge-gray',
    'planification': 'badge badge-blue',
    'planning': 'badge badge-blue',
    'build': 'badge badge-yellow',
    'execution': 'badge badge-yellow',
    'review': 'badge badge-purple',
    'delivery': 'badge badge-green',
    'termine': 'badge badge-green',
    'done': 'badge badge-green',
    'a-explorer': 'badge badge-gray',
    'approuvee': 'badge badge-blue',
    'promue': 'badge badge-green',
    'rejetee': 'badge badge-red',
  }
  return map[props.frontmatter.statut] || 'badge badge-gray'
})

const statusClassEn = computed(() => {
  const map: Record<string, string> = {
    active: 'badge badge-green',
    inactive: 'badge badge-gray',
    idle: 'badge badge-yellow',
    offline: 'badge badge-red',
  }
  return map[props.frontmatter.status] || 'badge badge-gray'
})

const energieClass = computed(() => {
  const map: Record<string, string> = {
    haute: 'badge badge-green',
    moyenne: 'badge badge-yellow',
    basse: 'badge badge-red',
  }
  return map[props.frontmatter.energie] || 'badge badge-gray'
})

const progressColor = computed(() => {
  const p = props.frontmatter.progression || 0
  if (p >= 80) return 'bg-green-500'
  if (p >= 50) return 'bg-blue-500'
  if (p >= 20) return 'bg-yellow-500'
  return 'bg-gray-400'
})
</script>

<style scoped>
.badge {
  @apply px-2 py-0.5 rounded-full text-xs font-medium;
}
.badge-blue { @apply bg-blue-100 text-blue-700; }
.badge-green { @apply bg-green-100 text-green-700; }
.badge-yellow { @apply bg-yellow-100 text-yellow-700; }
.badge-red { @apply bg-red-100 text-red-700; }
.badge-purple { @apply bg-purple-100 text-purple-700; }
.badge-gray { @apply bg-gray-100 text-gray-600; }

.vault-link {
  @apply text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors cursor-pointer;
}
</style>
