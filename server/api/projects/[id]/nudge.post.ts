/**
 * POST /api/projects/:id/nudge
 * Relance un projet stale. Cooldown 15s.
 * Source: SQLite
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import { getDb } from '~/server/utils/db'

const execAsync = promisify(exec)
const COOLDOWN_MS = 15_000

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'Project ID required' })

  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Project ${projectId} not found` })

  // Check cooldown
  if (project.last_nudge_at) {
    const elapsed = Date.now() - new Date(project.last_nudge_at).getTime()
    if (elapsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      throw createError({ statusCode: 429, statusMessage: `Cooldown actif. Réessayez dans ${remaining}s.` })
    }
  }

  // Get assignees
  const agents = db.prepare('SELECT agent_id FROM project_agents WHERE project_id = ?').all(projectId) as any[]
  const assignees = agents.map(a => a.agent_id)
  if (!assignees.length) throw createError({ statusCode: 400, statusMessage: 'Aucun agent assigné à ce projet' })

  const nudgeTask = `🔄 **Nudge projet: "${project.name}"**\n\n**Status:** ${project.status} (${project.progress || 0}%)\n**Agents:** ${assignees.join(', ')}\n\nFaites le point. Si bloqués, concertez-vous. Si décision nécessaire, demandez à @lio.`

  // Try to nudge via openclaw
  try {
    const spawnCmd = `openclaw sessions spawn --agent orchestrator --task ${JSON.stringify(nudgeTask)} --timeout 300`
    await execAsync(spawnCmd, { timeout: 10_000 })
  } catch (e: any) {
    console.warn('[nudge] spawn failed:', e.message)
  }

  // Update DB
  const now = new Date().toISOString()
  db.prepare('UPDATE projects SET last_nudge_at = ?, updated_at = ? WHERE id = ?').run(now, now, projectId)
  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)').run(
    projectId, 'dashboard', `🔄 Projet relancé via dashboard. Agents notifiés: ${assignees.join(', ')}`, 'nudge', now
  )

  return {
    success: true,
    message: `Projet "${project.name}" relancé.`,
    projectId,
    nudgedAgents: assignees,
    nextNudgeAvailableAt: new Date(Date.now() + COOLDOWN_MS).toISOString(),
  }
})
