/**
 * PATCH /api/projects/:id
 * Source: SQLite
 * Hooks: state transition to review/rex triggers ceremony channel creation
 */
import { join } from 'path'
import { existsSync } from 'fs'
import { getDb } from '~/server/utils/db'
import { launchPipeline } from '~/server/utils/pipeline'
import { launchBuild } from '~/server/utils/build-launcher'
import { launchReview } from '~/server/utils/review-launcher'
import { serializeProject } from '~/server/utils/serializers'
import { vaultConfig, updateVaultFrontmatter } from '~/server/utils/vault'
import type { DbProject, DbProjectAgent, DbProjectPhase, DbProjectUpdate } from '~/server/types/db'

const ALLOWED_FIELDS = ['name', 'description', 'type', 'status', 'state', 'progress', 'lead', 'channel', 'channel_id', 'workspace', 'github_repo', 'github_created', 'current_phase', 'last_nudge_at']
const FIELD_MAP: Record<string, string> = {
  channelId: 'channel_id', githubRepo: 'github_repo', githubCreated: 'github_created',
  currentPhase: 'current_phase', lastNudgeAt: 'last_nudge_at',
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const body = await readBody(event)
  const db = getDb()

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as DbProject | undefined
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })
  const oldState = existing.state

  // Build SET clause from allowed fields
  const sets: string[] = ['updated_at = datetime(\'now\')']
  const params: any[] = []

  for (const [key, val] of Object.entries(body)) {
    const col = FIELD_MAP[key] || key
    if (ALLOWED_FIELDS.includes(col)) {
      sets.push(`${col} = ?`)
      params.push(val)
    }
  }

  if (sets.length > 1) {
    params.push(id)
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  }

  // Log state transition in project history
  if (body.state && body.state !== oldState) {
    const stateLabels: Record<string, string> = {
      backlog: 'Backlog', planning: 'Planning', build: 'Build',
      review: 'Review', delivery: 'Delivery', rex: 'REX', done: 'Done'
    }
    db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
      id, 'system',
      `Transition ${stateLabels[oldState] || oldState} → ${stateLabels[body.state] || body.state}`,
      'state-change'
    )
  }

  // Sync state changes to Obsidian vault (prevents reconciliation from reverting)
  if (body.state && body.state !== oldState) {
    const stateToStatut: Record<string, string> = {
      backlog: 'cadrage', planning: 'planification', build: 'build',
      review: 'review', delivery: 'delivery', rex: 'rex', done: 'done'
    }

    // Resolve vault_path if missing
    let vaultPath = existing.vault_path
    if (!vaultPath) {
      const candidatePath = join(vaultConfig.basePath, 'Projets', `${id}.md`)
      if (existsSync(candidatePath)) {
        vaultPath = candidatePath
        db.prepare('UPDATE projects SET vault_path = ? WHERE id = ?').run(vaultPath, id)
      }
    }

    if (vaultPath && existsSync(vaultPath)) {
      try {
        updateVaultFrontmatter(vaultPath, {
          statut: stateToStatut[body.state] || body.state,
          phase_courante: body.state,
        })
      } catch (err) {
        console.error(`[patch] Vault state sync failed for ${id}:`, err)
      }
    }
  }

  // Handle team/agents update
  if (body.team || body.agents) {
    db.prepare('DELETE FROM project_agents WHERE project_id = ?').run(id)
    const insertPA = db.prepare('INSERT OR IGNORE INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')
    const agents = body.team || body.agents?.map((a: string) => ({ agent: a, role: null })) || []
    for (const a of agents) {
      const agentId = typeof a === 'string' ? a : a.agent
      const role = typeof a === 'string' ? null : a.role
      insertPA.run(id, agentId, role)
    }
  }

  // Handle phases update
  if (body.phases) {
    db.prepare('DELETE FROM project_phases WHERE project_id = ?').run(id)
    const insertPhase = db.prepare('INSERT INTO project_phases (project_id, name, status, started_at, completed_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    body.phases.forEach((ph: any, i: number) => {
      insertPhase.run(id, ph.name, ph.status || 'pending', ph.startedAt || null, ph.completedAt || null, i)
    })
  }

  // Handle updates append
  if (body.updates && Array.isArray(body.updates)) {
    const insertUpdate = db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    for (const u of body.updates) {
      insertUpdate.run(id, u.agentId || null, u.message, u.type || 'note', u.timestamp || new Date().toISOString())
    }
  }

  // Handle single message (from UI "add update")
  if (body.message && !body.updates) {
    db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
      id, 'dashboard', body.message, 'note'
    )
  }

  // --- Ceremony hook: review/rex state transitions ---
  const newState = body.state
  if (newState && newState !== oldState && (newState === 'review' || newState === 'rex')) {
    // Fire and forget — call ceremony endpoint asynchronously
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:8080'
    fetch(`${baseUrl}/api/projects/${id}/ceremony`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ceremony: newState }),
    }).catch(err => {
      console.error(`[ceremony] Failed to trigger ${newState} for ${id}:`, err)
    })
  }

  // --- Backlog hook: revert to backlog resets the linked idea to approuvee ---
  if (newState && newState !== oldState && newState === 'backlog') {
    const idea = db.prepare("SELECT id, vault_path FROM ideas WHERE projet_lie LIKE ?")
      .get(`%${id}%`) as { id: string; vault_path: string | null } | undefined

    if (idea) {
      db.prepare("UPDATE ideas SET statut = 'approuvee', projet_lie = '', updated_at = datetime('now') WHERE id = ?")
        .run(idea.id)

      // Reset document_status so pipeline can re-run later
      db.prepare("UPDATE projects SET document_status = 'pending' WHERE id = ?").run(id)

      if (idea.vault_path) {
        try {
          const { updateVaultFrontmatter } = await import('~/server/utils/vault')
          updateVaultFrontmatter(idea.vault_path, { statut: 'approuvee', projet_lie: '' })
        } catch (err) {
          console.error(`[patch] Vault idea reset failed for ${idea.id}:`, err)
        }
      }
    }
  }

  // --- Pipeline hook: planning state triggers idea-to-specs pipeline ---
  if (newState && newState !== oldState && newState === 'planning') {
    if (existing.document_status !== 'completed') {
      const idea = db.prepare("SELECT vault_path FROM ideas WHERE projet_lie LIKE ?")
        .get(`%${id}%`) as { vault_path: string } | undefined

      if (idea?.vault_path) {
        try {
          launchPipeline({
            projectId: id,
            projectName: existing.name,
            ideaVaultPath: idea.vault_path,
          })
        } catch (err) {
          console.error(`[patch] Pipeline launch failed for ${id}:`, err)
        }
      }
    }
  }

  // --- Build hook: build state triggers Claude Code auto-build ---
  if (newState && newState !== oldState && newState === 'build') {
    const specsSlug = `${id}-specs`
    const specsPath = join(vaultConfig.basePath, 'Projets', `${specsSlug}.md`)

    if (existsSync(specsPath)) {
      try {
        launchBuild({
          projectId: id,
          projectName: existing.name,
          specsPath,
        })
      } catch (err) {
        console.error(`[patch] Build launch failed for ${id}:`, err)
      }
    } else {
      console.warn(`[patch] No specs found for ${id} at ${specsPath} — skipping build`)
    }
  }

  // --- Review hook: review state triggers Claude Code testing ---
  if (newState && newState !== oldState && newState === 'review') {
    const specsSlug = `${id}-specs`
    const specsPath = join(vaultConfig.basePath, 'Projets', `${specsSlug}.md`)
    const projectDir = join(process.env.HOME || '', 'Desktop/coding-projects/AUTO-BUILD', id)

    if (existsSync(projectDir)) {
      try {
        launchReview({
          projectId: id,
          projectName: existing.name,
          specsPath: existsSync(specsPath) ? specsPath : '',
        })
      } catch (err) {
        console.error(`[patch] Review launch failed for ${id}:`, err)
      }
    }
  }

  // Return full project (same format as GET)
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as DbProject
  const team = db.prepare('SELECT * FROM project_agents WHERE project_id = ?').all(id) as DbProjectAgent[]
  const phases = db.prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY sort_order').all(id) as DbProjectPhase[]
  const updates = db.prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC').all(id) as DbProjectUpdate[]

  return serializeProject(p, { team, phases, updates })
})
