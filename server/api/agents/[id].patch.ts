/**
 * PATCH /api/agents/:id
 * Update agent fields (model, name, role, team, status, etc.)
 * Syncs: SQLite DB + Obsidian vault + OpenClaw agents.json
 */
import { getDb } from '~/server/utils/db'
import { updateVaultFrontmatter, getVaultFilePath } from '~/server/utils/vault'
import { readFileSync, writeFileSync } from 'fs'
import { execFile } from 'child_process'
import { join } from 'path'

const OPENCLAW_DIR = join(process.env.HOME || '', '.openclaw')
const AGENTS_JSON = join(OPENCLAW_DIR, 'sources', 'agents.json')
const OPENCLAW_CONFIG = join(OPENCLAW_DIR, 'openclaw.json')

const ALLOWED_FIELDS = ['name', 'emoji', 'team', 'role', 'model', 'status']
const VAULT_FIELD_MAP: Record<string, string> = {
  model: 'modele',
  name: 'nom',
  team: 'team',
  role: 'role',
  status: 'status',
  emoji: 'emoji',
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Agent ID requis' })

  const body = await readBody(event)
  const db = getDb()

  // 1. Verify agent exists
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Agent '${id}' non trouvé` })

  // 2. Build SET clause from allowed fields
  const sets: string[] = []
  const params: any[] = []
  const changes: Record<string, any> = {}

  for (const [key, val] of Object.entries(body)) {
    if (ALLOWED_FIELDS.includes(key) && val !== undefined) {
      sets.push(`${key} = ?`)
      params.push(val)
      changes[key] = val
    }
  }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucun champ valide à mettre à jour' })
  }

  // 3. Update SQLite DB
  params.push(id)
  db.prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ?`).run(...params)

  // 4. Sync to Obsidian vault
  try {
    const vaultPath = existing.vault_path || getVaultFilePath('agents', `${id}.md`)
    const vaultChanges: Record<string, any> = {}
    for (const [dbField, val] of Object.entries(changes)) {
      const vaultField = VAULT_FIELD_MAP[dbField]
      if (vaultField) vaultChanges[vaultField] = val
    }
    if (Object.keys(vaultChanges).length > 0) {
      updateVaultFrontmatter(vaultPath, vaultChanges)
    }
  } catch (err) {
    console.error(`[agents/patch] Vault sync failed for ${id}:`, err)
  }

  // 5. Sync to OpenClaw agents.json
  try {
    const raw = readFileSync(AGENTS_JSON, 'utf-8')
    const data = JSON.parse(raw)
    const agentEntry = data.agents?.find((a: any) => a.id === id)
    if (agentEntry) {
      for (const [key, val] of Object.entries(changes)) {
        agentEntry[key] = val
      }
      writeFileSync(AGENTS_JSON, JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error(`[agents/patch] agents.json sync failed for ${id}:`, err)
  }

  // 6. Sync to OpenClaw openclaw.json (runtime config)
  try {
    const raw = readFileSync(OPENCLAW_CONFIG, 'utf-8')
    const config = JSON.parse(raw)
    const agentConfig = config.agents?.list?.find((a: any) => a.id === id)
    if (agentConfig) {
      if (changes.model) agentConfig.model = changes.model
      if (changes.name) agentConfig.name = changes.name
      writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error(`[agents/patch] openclaw.json sync failed for ${id}:`, err)
  }

  // 7. Reload OpenClaw gateway (SIGHUP triggers config hot-reload)
  try {
    execFile('pkill', ['-HUP', 'openclaw-gateway'], (err) => {
      if (err) console.error(`[agents/patch] Gateway reload failed:`, err.message)
      else console.log(`[agents/patch] Gateway reloaded (SIGHUP)`)
    })
  } catch (err) {
    console.error(`[agents/patch] Gateway reload failed:`, err)
  }

  // 8. Log event
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
    `evt-${Date.now()}`,
    'agent.updated',
    'dashboard',
    JSON.stringify({ agentId: id, changes })
  )

  // 7. Return updated agent
  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any
  return {
    status: 'success',
    agent: {
      id: updated.id,
      name: updated.name,
      emoji: updated.emoji,
      team: updated.team,
      role: updated.role,
      model: updated.model,
      status: updated.status,
      workspace: updated.workspace,
    }
  }
})
