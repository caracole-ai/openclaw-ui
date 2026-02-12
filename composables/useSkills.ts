import { ref, computed } from 'vue'
import type { Skill, SkillsSource } from '~/types/skill'

export function useSkills() {
  const installed = ref<Skill[]>([])
  const pending = ref<Skill[]>([])
  const assignments = ref<Record<string, string[]>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { on } = useWebSocket()

  async function fetchSkills(agentFilter?: string) {
    loading.value = true
    error.value = null
    try {
      const url = agentFilter ? `/api/skills?agent=${agentFilter}` : '/api/skills'
      const data = await $fetch<SkillsSource>(url)
      installed.value = data.installed || []
      pending.value = data.pending || []
      assignments.value = data.assignments || {}
    } catch (err: any) {
      error.value = err.message || 'Erreur chargement skills'
    } finally {
      loading.value = false
    }
  }

  function getSkillsForAgent(agentId: string): Skill[] {
    const skillIds = assignments.value[agentId] || []
    return installed.value.filter(s => skillIds.includes(s.id))
  }

  on('skill:installed', () => fetchSkills())
  on('skill:assigned', () => fetchSkills())
  on('skill:unassigned', () => fetchSkills())

  fetchSkills()

  return { installed, pending, assignments, getSkillsForAgent, fetchSkills, loading, error }
}
