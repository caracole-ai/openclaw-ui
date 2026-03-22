/**
 * Obsidian Vault utilities — parse/write markdown files with YAML frontmatter.
 * The vault is the source of truth for ideas, projects, and agents.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join, basename, extname } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

// ─── Config ───

const VAULT_PATH = process.env.VAULT_PATH || join(process.env.HOME || '', 'Documents/ObsidianVault')
const PROJECTS_DIR = process.env.PROJECTS_DIR || join(process.env.HOME || '', 'Desktop/coding-projects')
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'caracole-ai'
const GITHUB_COLLABORATOR = process.env.GITHUB_COLLABORATOR || 'joechipjoechip'

export const vaultConfig = {
  basePath: VAULT_PATH,
  projectsDir: PROJECTS_DIR,
  githubOwner: GITHUB_OWNER,
  githubCollaborator: GITHUB_COLLABORATOR,
  folders: {
    ideas: 'Id\u00e9es',
    projects: 'Projets',
    agents: 'Agents',
    templates: 'Templates',
  } as const,
}

// ─── Parser / Writer ───

export interface VaultFile {
  frontmatter: Record<string, any>
  body: string
  filePath: string
}

/**
 * Parse a markdown file with YAML frontmatter.
 * Format: --- YAML --- body
 */
export function parseVaultFile(filePath: string): VaultFile {
  const raw = readFileSync(filePath, 'utf-8')
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    return { frontmatter: {}, body: raw, filePath }
  }

  let frontmatter: Record<string, any> = {}
  try {
    frontmatter = parseYaml(match[1]) || {}
  } catch {
    console.warn(`[vault] Failed to parse YAML frontmatter: ${filePath}`)
  }

  return { frontmatter, body: match[2] || '', filePath }
}

/**
 * Write a markdown file with YAML frontmatter.
 * Preserves body content while updating frontmatter.
 */
export function writeVaultFile(filePath: string, frontmatter: Record<string, any>, body: string): void {
  const yamlStr = stringifyYaml(frontmatter, { lineWidth: 0 })
  const content = `---\n${yamlStr}---\n${body}`
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Update only the frontmatter of a vault file, preserving the body.
 */
export function updateVaultFrontmatter(filePath: string, changes: Record<string, any>): void {
  const file = parseVaultFile(filePath)
  const updated = { ...file.frontmatter, ...changes }
  writeVaultFile(filePath, updated, file.body)
}

/**
 * List all .md files in a vault folder.
 * Supports both flat files (Folder/file.md) and subfolder structures.
 * In subfolders, only the canonical file is returned:
 *   - Projets/foo/foo.md  (file name matches folder name)
 *   - Agents/bar/SOUL.md  (convention for agents)
 * Other files in subfolders (specs.md, idee-originelle.md, etc.) are ignored.
 */
export function listVaultFiles(folder: keyof typeof vaultConfig.folders): string[] {
  const dir = join(vaultConfig.basePath, vaultConfig.folders[folder])
  if (!existsSync(dir)) return []

  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue
    if (entry.isFile() && extname(entry.name) === '.md') {
      // Flat file: Folder/file.md
      files.push(join(dir, entry.name))
    } else if (entry.isDirectory()) {
      // Subfolder: only pick the canonical file (name matching folder, or SOUL.md)
      const canonicalPath = join(dir, entry.name, `${entry.name}.md`)
      const soulPath = join(dir, entry.name, 'SOUL.md')
      if (existsSync(canonicalPath)) {
        files.push(canonicalPath)
      } else if (existsSync(soulPath)) {
        files.push(soulPath)
      }
    }
  }
  return files
}

/**
 * Load a vault template by name (e.g. 'idee', 'projet', 'agent', 'skill').
 * Reads Templates/_template-{name}.md and returns parsed frontmatter + body.
 */
export function loadTemplate(name: string): VaultFile {
  const templatePath = join(vaultConfig.basePath, vaultConfig.folders.templates, `_template-${name}.md`)
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`)
  }
  return parseVaultFile(templatePath)
}

/**
 * Get the file path for an entity in the vault.
 */
export function getVaultFilePath(folder: keyof typeof vaultConfig.folders, filename: string): string {
  return join(vaultConfig.basePath, vaultConfig.folders[folder], filename)
}

/**
 * Ensure vault directories exist.
 */
export function ensureVaultDirs(): void {
  for (const folder of Object.values(vaultConfig.folders)) {
    const dir = join(vaultConfig.basePath, folder)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

// ─── Slug ───

const MAX_SHORTNAME_LENGTH = 16

export function toVaultSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, MAX_SHORTNAME_LENGTH)
    .replace(/-+$/, '')
}

/**
 * Extract the ID from a vault filename (without date prefix and extension).
 */
export function idFromFilename(filename: string): string {
  const base = basename(filename, '.md')
  // Strip date prefix like "2026-03-18_"
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}_/, '')
  return withoutDate
}

// ─── Sync: Vault → DB ───

import { getDb, isMcpId } from './db'

/**
 * Sync all ideas from vault to DB.
 */
export function syncIdeasToDb(): void {
  const db = getDb()
  const files = listVaultFiles('ideas')

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO ideas (id, titre, date, themes, energie, statut, source, projet_lie, score_realisme, score_effort, score_impact, reviewed_at, vault_path, body_preview, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const filePath of files) {
    try {
      const { frontmatter: fm, body } = parseVaultFile(filePath)
      const id = idFromFilename(filePath)
      const preview = body.replace(/^#.*\n/gm, '').trim().substring(0, 300)

      upsert.run(
        id,
        fm.titre || basename(filePath, '.md'),
        fm.date || null,
        fm.themes ? JSON.stringify(fm.themes) : '[]',
        fm.energie || 'moyenne',
        fm.statut || 'a-explorer',
        fm.source || 'ideas-bot',
        fm.projet_lie || null,
        fm.score_realisme || 0,
        fm.score_effort || 0,
        fm.score_impact || 0,
        fm.reviewed_at || null,
        filePath,
        preview,
        fm.date || new Date().toISOString(),
        new Date().toISOString()
      )
    } catch (err) {
      console.error(`[vault] Failed to sync idea: ${filePath}`, err)
    }
  }
}

/**
 * Sync all projects from vault to DB.
 */
export function syncProjectsToDb(): void {
  const db = getDb()
  const files = listVaultFiles('projects')

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO projects (id, name, description, type, status, state, progress, lead, workspace, github_repo, github_created, current_phase, vault_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const upsertPA = db.prepare('INSERT OR REPLACE INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')

  // Obsidian statut → DB state mapping
  const stateMap: Record<string, string> = {
    'cadrage': 'backlog',
    'en-attente': 'backlog',
    'planification': 'planning',
    'execution': 'build',
    'build': 'build',
    'review': 'review',
    'delivery': 'delivery',
    'rex': 'rex',
    'termine': 'done',
    'done': 'done',
    'archive': 'done',
  }

  for (const filePath of files) {
    try {
      const { frontmatter: fm, body } = parseVaultFile(filePath)
      const id = fm.id || idFromFilename(filePath)
      const statut = fm.statut || 'idee'
      const dbState = stateMap[statut] || 'backlog'

      upsert.run(
        id,
        fm.titre || basename(filePath, '.md'),
        body.trim().substring(0, 500) || null,
        fm.type || 'code',
        dbState,
        dbState,
        fm.progression || 0,
        fm.lead ? fm.lead.replace(/\[\[.*?\//, '').replace(/\]\]/, '') : null,
        fm.workspace || null,
        fm.github?.repo || null,
        fm.github?.created ? 1 : 0,
        fm.phase_courante || null,
        filePath,
        fm.created_at || new Date().toISOString(),
        new Date().toISOString()
      )

      // Sync team assignments
      if (fm.equipe && Array.isArray(fm.equipe)) {
        db.prepare('DELETE FROM project_agents WHERE project_id = ?').run(id)
        for (const member of fm.equipe) {
          const agentId = (member.agent || '').replace(/\[\[.*?\//, '').replace(/\]\]/, '')
          if (agentId) {
            upsertPA.run(id, agentId, member.role || null)
          }
        }
      }
    } catch (err) {
      console.error(`[vault] Failed to sync project: ${filePath}`, err)
    }
  }

  // Clean up orphaned DB entries whose vault_path no longer matches a canonical file
  const validPaths = new Set(files)
  const allDbProjects = db.prepare('SELECT id, vault_path FROM projects').all() as { id: string; vault_path: string | null }[]
  for (const row of allDbProjects) {
    if (!row.vault_path || !validPaths.has(row.vault_path)) {
      db.prepare('DELETE FROM project_agents WHERE project_id = ?').run(row.id)
      db.prepare('DELETE FROM projects WHERE id = ?').run(row.id)
      console.log(`[vault] Removed orphaned project from DB: ${row.id}`)
    }
  }
}

/**
 * Sync all agents from vault to DB.
 * Uses UPDATE for existing agents (to preserve mm_token and other JSON-source fields)
 * and INSERT only for new agents.
 */
export function syncAgentsToDb(): void {
  const db = getDb()
  const agentsDir = join(vaultConfig.basePath, vaultConfig.folders.agents)
  // Collect both flat files (Agents/*.md) and subfolder SOUL.md files (Agents/*/SOUL.md)
  const files = [...listVaultFiles('agents')]
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const soulPath = join(agentsDir, entry.name, 'SOUL.md')
      if (existsSync(soulPath)) files.push(soulPath)
    }
  }

  const updateExisting = db.prepare(`
    UPDATE agents SET name = ?, emoji = ?, team = ?, role = ?, model = ?, workspace = ?, status = ?, vault_path = ?
    WHERE id = ?
  `)

  const insertNew = db.prepare(`
    INSERT INTO agents (id, name, emoji, team, role, model, workspace, status, vault_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const exists = db.prepare('SELECT id FROM agents WHERE id = ?')
  const upsertSkill = db.prepare('INSERT OR REPLACE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)')
  const insertSkillIfMissing = db.prepare('INSERT OR IGNORE INTO skills (id, name, status) VALUES (?, ?, ?)')
  const upsertMcp = db.prepare('INSERT OR REPLACE INTO agent_mcps (agent_id, mcp_id) VALUES (?, ?)')
  const insertMcpIfMissing = db.prepare('INSERT OR IGNORE INTO mcps (id, name, status) VALUES (?, ?, ?)')

  for (const filePath of files) {
    try {
      const { frontmatter: fm } = parseVaultFile(filePath)
      const id = fm.id || idFromFilename(filePath)

      if (!fm.nom && !fm.id) continue

      const existing = exists.get(id)
      if (existing) {
        updateExisting.run(
          fm.nom || id,
          fm.emoji || null,
          fm.team || null,
          fm.role || null,
          fm.modele || 'claude-opus-4-6',
          fm.workspace || null,
          fm.status || 'active',
          filePath,
          id
        )
      } else {
        insertNew.run(
          id,
          fm.nom || id,
          fm.emoji || null,
          fm.team || null,
          fm.role || null,
          fm.modele || 'claude-opus-4-6',
          fm.workspace || null,
          fm.status || 'active',
          filePath,
          fm.created_at || new Date().toISOString()
        )
      }

      // Parse all wikilinks from skills field
      const rawSkillIds: string[] = []
      if (fm.skills && Array.isArray(fm.skills)) {
        for (const raw of fm.skills) {
          const parsed = String(raw).replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim()
          if (parsed) rawSkillIds.push(parsed)
        }
      }

      // Parse explicit MCPs field
      const rawMcpIds: string[] = []
      if (fm.mcps && Array.isArray(fm.mcps)) {
        for (const raw of fm.mcps) {
          const parsed = String(raw).replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim()
          if (parsed) rawMcpIds.push(parsed)
        }
      }

      // Auto-split: if vault has MCPs mixed into skills, separate them
      const actualSkills: string[] = []
      const actualMcps: string[] = [...rawMcpIds]
      for (const sid of rawSkillIds) {
        if (isMcpId(sid)) {
          if (!actualMcps.includes(sid)) actualMcps.push(sid)
        } else {
          actualSkills.push(sid)
        }
      }

      // Sync skills → DB
      db.prepare('DELETE FROM agent_skills WHERE agent_id = ?').run(id)
      for (const skillId of actualSkills) {
        insertSkillIfMissing.run(skillId, skillId, 'active')
        upsertSkill.run(id, skillId)
      }

      // Sync MCPs → DB
      db.prepare('DELETE FROM agent_mcps WHERE agent_id = ?').run(id)
      for (const mcpId of actualMcps) {
        insertMcpIfMissing.run(mcpId, mcpId, 'active')
        upsertMcp.run(id, mcpId)
      }
    } catch (err) {
      console.error(`[vault] Failed to sync agent: ${filePath}`, err)
    }
  }
}

/**
 * Full sync: all vault folders → DB.
 */
export function syncVaultToDb(): void {
  const db = getDb()
  const tx = db.transaction(() => {
    syncIdeasToDb()
    syncProjectsToDb()
    syncAgentsToDb()
  })
  tx()
  console.log('[vault] Synced vault → DB')
}

// ─── Reverse Sync: DB → Vault ───

import type { DbAgent, DbProject } from '../types/db'

/**
 * DB state → Obsidian statut mapping (reverse of stateMap above).
 */
const reverseStateMap: Record<string, string> = {
  'backlog': 'cadrage',
  'planning': 'planification',
  'build': 'build',
  'review': 'review',
  'delivery': 'delivery',
  'rex': 'rex',
  'done': 'done',
}

/**
 * Ensure every agent in DB has a corresponding vault file.
 * Creates new files for agents that only exist in JSON sources.
 * Updates frontmatter for agents that already have vault files.
 */
export function syncAgentsToVault(): void {
  const db = getDb()
  const agents = db.prepare('SELECT * FROM agents').all() as DbAgent[]
  const agentsDir = join(vaultConfig.basePath, vaultConfig.folders.agents)

  // Build a map of frontmatter id → filePath
  // Checks both flat files (Agents/amelia.md) and subfolder structure (Agents/amelia/SOUL.md)
  const idToFile = new Map<string, string>()
  for (const filePath of listVaultFiles('agents')) {
    try {
      const { frontmatter: fm } = parseVaultFile(filePath)
      const id = fm.id || idFromFilename(filePath)
      idToFile.set(id, filePath)
    } catch { /* skip */ }
  }
  // Also scan subdirectories for SOUL.md files (new folder-based structure)
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const soulPath = join(agentsDir, entry.name, 'SOUL.md')
      if (existsSync(soulPath)) {
        try {
          const { frontmatter: fm } = parseVaultFile(soulPath)
          const id = fm.id || entry.name
          idToFile.set(id, soulPath)
        } catch { /* skip */ }
      }
    }
  }

  for (const agent of agents) {
    if (idToFile.has(agent.id)) {
      // Already has a vault file — update frontmatter only (preserve body)
      const filePath = idToFile.get(agent.id)!
      if (!existsSync(filePath)) continue
      try {
        const file = parseVaultFile(filePath)
        const skillIds = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?')
          .all(agent.id).map((r: any) => `[[${r.skill_id}]]`)
        const mcpIds = db.prepare('SELECT mcp_id FROM agent_mcps WHERE agent_id = ?')
          .all(agent.id).map((r: any) => `[[${r.mcp_id}]]`)
        const updated = {
          ...file.frontmatter,
          nom: agent.name,
          id: agent.id,
          emoji: agent.emoji || file.frontmatter.emoji || '',
          team: agent.team || file.frontmatter.team || '',
          role: agent.role || file.frontmatter.role || '',
          modele: agent.model || 'claude-opus-4-6',
          status: agent.status || 'active',
          workspace: agent.workspace || file.frontmatter.workspace || '',
          skills: skillIds,
          mcps: mcpIds,
        }
        // Only write if something actually changed
        if (JSON.stringify(updated) !== JSON.stringify(file.frontmatter)) {
          writeVaultFile(filePath, updated, file.body)
        }
      } catch (err) {
        console.error(`[vault] Failed to update agent vault file: ${agent.id}`, err)
      }
    } else {
      // Skip creation — if file was deleted in Obsidian (source of truth), don't recreate.
      // Agents now use folder structure (Agents/<name>/SOUL.md), created manually or by agent-crafter.
      continue
    }
  }
}

/**
 * Ensure every project in DB has a corresponding vault file.
 */
export function syncProjectsToVault(): void {
  const db = getDb()
  const projects = db.prepare('SELECT * FROM projects').all() as DbProject[]

  // Build map of frontmatter id → filePath
  // listVaultFiles now scans both flat files and subfolder structures
  const idToFile = new Map<string, string>()
  for (const filePath of listVaultFiles('projects')) {
    try {
      const { frontmatter: fm } = parseVaultFile(filePath)
      const id = fm.id || idFromFilename(filePath)
      idToFile.set(id, filePath)
    } catch { /* skip */ }
  }

  for (const project of projects) {
    const projectId = project.id
    if (idToFile.has(projectId)) {
      // Update frontmatter of existing vault file
      const filePath = idToFile.get(projectId)!
      if (!existsSync(filePath)) continue
      try {
        const file = parseVaultFile(filePath)
        const obsidianStatut = reverseStateMap[project.state] || 'cadrage'
        const updated = {
          ...file.frontmatter,
          titre: project.name,
          id: projectId,
          type: project.type || file.frontmatter.type || 'code',
          statut: obsidianStatut,
          progression: project.progress || 0,
          workspace: project.workspace || file.frontmatter.workspace || '',
        }
        // Update github if changed
        if (project.github_repo) {
          updated.github = {
            repo: project.github_repo,
            url: `https://github.com/${vaultConfig.githubOwner}/${project.github_repo}`,
            created: !!project.github_created,
          }
        }
        if (JSON.stringify(updated) !== JSON.stringify(file.frontmatter)) {
          writeVaultFile(filePath, updated, file.body)
        }
      } catch (err) {
        console.error(`[vault] Failed to update project vault file: ${projectId}`, err)
      }
    } else {
      // Skip creation — if file was deleted in Obsidian (source of truth), don't recreate.
      // Project vault files are created by the promote endpoint or incubation pipeline.
      continue
    }
  }
}

// ─── Targeted sync: single agent's skills/mcps → vault ───

/**
 * Helper: find the vault file path for an agent.
 * Checks DB vault_path, flat files, then subfolder SOUL.md files.
 */
function findAgentVaultPath(agentId: string): string | null {
  const db = getDb()
  const agent = db.prepare('SELECT vault_path FROM agents WHERE id = ?').get(agentId) as { vault_path: string | null } | undefined
  if (agent?.vault_path && existsSync(agent.vault_path)) return agent.vault_path
  // Fallback: search flat vault files
  for (const filePath of listVaultFiles('agents')) {
    try {
      const { frontmatter: fm } = parseVaultFile(filePath)
      if ((fm.id || idFromFilename(filePath)) === agentId) return filePath
    } catch { /* skip */ }
  }
  // Fallback: search subfolder SOUL.md files
  const agentsDir = join(vaultConfig.basePath, vaultConfig.folders.agents)
  if (existsSync(agentsDir)) {
    const entries = readdirSync(agentsDir)
    for (const name of entries) {
      const soulPath = join(agentsDir, name, 'SOUL.md')
      if (existsSync(soulPath)) {
        try {
          const { frontmatter: fm } = parseVaultFile(soulPath)
          if ((fm.id || name) === agentId) return soulPath
        } catch { /* skip */ }
      }
    }
  }
  return null
}

/**
 * Sync a single agent's skills list to its Obsidian vault file.
 * Called after skill assign/unassign for immediate vault update.
 */
export function syncAgentSkillsToVault(agentId: string): void {
  const filePath = findAgentVaultPath(agentId)
  if (!filePath) return

  const db = getDb()
  const skillIds = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?')
    .all(agentId).map((r: any) => `[[${r.skill_id}]]`)

  updateVaultFrontmatter(filePath, { skills: skillIds })
  console.log(`[vault] Synced skills for agent ${agentId} → vault`)
}

/**
 * Sync a single agent's MCPs list to its Obsidian vault file.
 * Called after MCP assign/unassign for immediate vault update.
 */
export function syncAgentMcpsToVault(agentId: string): void {
  const filePath = findAgentVaultPath(agentId)
  if (!filePath) return

  const db = getDb()
  const mcpIds = db.prepare('SELECT mcp_id FROM agent_mcps WHERE agent_id = ?')
    .all(agentId).map((r: any) => `[[${r.mcp_id}]]`)

  updateVaultFrontmatter(filePath, { mcps: mcpIds })
  console.log(`[vault] Synced mcps for agent ${agentId} → vault`)
}

/**
 * Full bidirectional reconciliation.
 * 1. Vault → DB (parse markdown, upsert rows)
 * 2. DB → Vault (create missing files, update frontmatter)
 */
export function fullReconciliation(): void {
  ensureVaultDirs()
  syncVaultToDb()
  syncAgentsToVault()
  syncProjectsToVault()
  console.log('[vault] Full reconciliation complete')
}

/**
 * Update Kanban.md in the vault — add a project link under the specified column.
 * Skips if the project is already listed anywhere in the Kanban.
 */
export function updateKanbanBoard(projectSlug: string, displayName: string, column: string): void {
  const kanbanPath = join(vaultConfig.basePath, 'Kanban.md')
  if (!existsSync(kanbanPath)) {
    console.warn('[vault] Kanban.md not found')
    return
  }

  const content = readFileSync(kanbanPath, 'utf-8')
  const entry = `- [ ] [[${projectSlug}]]`

  // Skip if already present
  if (content.includes(`[[${projectSlug}]]`) || content.includes(`[[${projectSlug}|`)) return

  // Map DB states to Kanban headers
  const headerMap: Record<string, string> = {
    backlog: '## Idées',
    planning: '## Projets',
    build: '## Build',
    review: '## Review',
    delivery: '## Delivery',
    rex: '## REX',
    done: '## Done',
  }

  const header = headerMap[column]
  if (!header) return

  const headerIndex = content.indexOf(header)
  if (headerIndex === -1) return

  // Insert after the header line
  const lineEnd = content.indexOf('\n', headerIndex)
  if (lineEnd === -1) return

  const updated = content.slice(0, lineEnd + 1) + entry + '\n' + content.slice(lineEnd + 1)
  writeFileSync(kanbanPath, updated, 'utf-8')
}
