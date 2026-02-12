import { readFile } from 'fs/promises'
import { join } from 'path'
import type { SkillsSource } from '~/types/skill'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const agentFilter = query.agent as string | undefined

  try {
    const raw = await readFile(join(SOURCES_DIR, 'skills.json'), 'utf-8')
    const source: SkillsSource = JSON.parse(raw)

    if (agentFilter) {
      const agentSkillIds = source.assignments?.[agentFilter] || []
      return {
        installed: source.installed.filter(s => agentSkillIds.includes(s.id)),
        pending: source.pending.filter(s => agentSkillIds.includes(s.id)),
        assignments: { [agentFilter]: agentSkillIds },
        registry: source.registry
      }
    }

    return source
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { registry: { official: '', trusted: [] }, installed: [], pending: [], assignments: {} }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lecture skills', data: { error: err.message } })
  }
})
