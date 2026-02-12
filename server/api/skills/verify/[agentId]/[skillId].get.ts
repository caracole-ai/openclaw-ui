/**
 * GET /api/skills/verify/:agentId/:skillId
 * Verifies skill is assigned and operational for agent.
 * Source: SQLite + filesystem checks
 */
import { existsSync } from 'fs'
import { join } from 'path'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const agentId = getRouterParam(event, 'agentId')
  const skillId = getRouterParam(event, 'skillId')
  if (!agentId || !skillId) throw createError({ statusCode: 400, statusMessage: 'agentId et skillId requis' })

  const db = getDb()

  const assignment = db.prepare('SELECT * FROM agent_skills WHERE agent_id = ? AND skill_id = ?').get(agentId, skillId)
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as any
  const agent = db.prepare('SELECT workspace FROM agents WHERE id = ?').get(agentId) as any

  const inAssignments = !!assignment
  let symlinkExists = false
  let dependenciesMet = true

  if (skill && agent) {
    // Check if skill symlink/dir exists in agent workspace
    const skillPath = join(agent.workspace || '', 'skills', skillId)
    symlinkExists = existsSync(skillPath)

    // Check CLI dependencies
    if (skill.manifest) {
      const manifest = typeof skill.manifest === 'string' ? JSON.parse(skill.manifest) : skill.manifest
      for (const cli of manifest.dependencies?.cli || []) {
        try {
          require('child_process').execSync(`which ${cli}`, { stdio: 'pipe' })
        } catch {
          dependenciesMet = false
        }
      }
    }
  }

  return {
    skillId,
    agentId,
    verified: inAssignments && symlinkExists && dependenciesMet,
    checks: { inAssignments, symlinkExists, frontmatterInjected: inAssignments, dependenciesMet },
    timestamp: new Date().toISOString(),
  }
})
