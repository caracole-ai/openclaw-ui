import { ref, computed } from 'vue'
import type { Skill, SkillsSource } from '~/types/skill'

// Singleton state
const installed = ref<Skill[]>([])
const pending = ref<Skill[]>([])
const assignments = ref<Record<string, string[]>>({})
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false

async function fetchSkills(agentFilter?: string) {
  loading.value = true
  error.value = null
  try {
    const url = agentFilter ? `/api/skills?agent=${agentFilter}` : '/api/skills'
    const data = await $fetch<SkillsSource>(url)
    installed.value = data.installed || []
    pending.value = data.pending || []
    assignments.value = data.assignments || {}
    fetched = true
  } catch (err: any) {
    error.value = err.message || 'Erreur chargement skills'
  } finally {
    loading.value = false
  }
}

export function useSkills() {
  function getSkillsForAgent(agentId: string): Skill[] {
    const skillIds = assignments.value[agentId] || []
    return installed.value.filter(s => skillIds.includes(s.id))
  }

  if (!import.meta.server && !fetched) {
    const { on } = useWebSocket()
    on('skill:installed', () => fetchSkills())
    on('skill:assigned', () => fetchSkills())
    on('skill:unassigned', () => fetchSkills())

    fetchSkills()
  }

  return { installed, pending, assignments, getSkillsForAgent, fetchSkills, loading, error }
}
