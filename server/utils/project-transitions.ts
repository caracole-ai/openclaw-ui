/**
 * Project state transitions — shared helper to update DB + vault atomically.
 * Eliminates self-PATCH calls that break when the server port changes.
 * All launchers (build, validation, review) use this instead of fetch(PATCH).
 */
import { join } from 'path'
import { existsSync, unlinkSync } from 'fs'
import { getDb } from './db'
import { updateVaultFrontmatter, vaultConfig } from './vault'

const STATE_TO_STATUT: Record<string, string> = {
  backlog: 'cadrage', planning: 'planification', build: 'build',
  review: 'review', delivery: 'delivery', rex: 'rex', done: 'done',
}

const HOME = process.env.HOME || '/Users/caracole'
const AUTO_BUILD_DIR = join(HOME, 'Desktop/coding-projects/AUTO-BUILD')

/**
 * Transition a project's state, updating DB + vault atomically.
 * Does NOT trigger hooks (build/review launchers) — the caller is responsible.
 * This prevents circular dependencies and self-PATCH issues.
 */
export function transitionProjectState(
  projectId: string,
  newState: string,
  extra?: { document_status?: string }
): void {
  const db = getDb()
  const now = new Date().toISOString()

  // Update DB
  const sets = ['state = ?', "updated_at = datetime('now')"]
  const params: any[] = [newState]

  if (extra?.document_status) {
    sets.push('document_status = ?')
    params.push(extra.document_status)
  }

  params.push(projectId)
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params)

  // Log transition
  const stateLabels: Record<string, string> = {
    backlog: 'Backlog', planning: 'Planning', build: 'Build',
    review: 'Review', delivery: 'Delivery', rex: 'REX', done: 'Done',
  }
  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, 'system', `Auto-transition → ${stateLabels[newState] || newState}`, 'state-change', now)

  // Sync to vault (prevents reconciliation from reverting)
  const statut = STATE_TO_STATUT[newState] || newState
  const vaultPath = resolveVaultPath(projectId)
  if (vaultPath) {
    try {
      updateVaultFrontmatter(vaultPath, { statut })
    } catch (err) {
      console.error(`[transition] Vault sync failed for ${projectId}:`, err)
    }
  }
}

/**
 * Resolve the vault path for a project (tries subfolder convention then flat).
 */
function resolveVaultPath(projectId: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT vault_path FROM projects WHERE id = ?').get(projectId) as { vault_path: string | null } | undefined

  if (row?.vault_path && existsSync(row.vault_path)) return row.vault_path

  // Try subfolder convention: Projets/<id>/<id>.md
  const subfolderPath = join(vaultConfig.basePath, 'Projets', projectId, `${projectId}.md`)
  if (existsSync(subfolderPath)) {
    db.prepare('UPDATE projects SET vault_path = ? WHERE id = ?').run(subfolderPath, projectId)
    return subfolderPath
  }

  // Try flat: Projets/<id>.md
  const flatPath = join(vaultConfig.basePath, 'Projets', `${projectId}.md`)
  if (existsSync(flatPath)) {
    db.prepare('UPDATE projects SET vault_path = ? WHERE id = ?').run(flatPath, projectId)
    return flatPath
  }

  return null
}

/**
 * Clear stale state from a previous pipeline run.
 * Called when a fresh build/review cycle starts.
 */
export function clearStaleState(projectId: string): void {
  const projectDir = join(AUTO_BUILD_DIR, projectId)

  // Clear error-context.json from previous runs
  const errorCtxPath = join(projectDir, 'error-context.json')
  if (existsSync(errorCtxPath)) {
    try { unlinkSync(errorCtxPath) } catch {}
    console.log(`[cleanup] Cleared stale error-context.json for ${projectId}`)
  }

  // Reset counters
  const db = getDb()
  db.prepare("UPDATE projects SET review_round = 0, build_attempt = 0 WHERE id = ?").run(projectId)
}
