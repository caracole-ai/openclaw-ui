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
 */
export function listVaultFiles(folder: keyof typeof vaultConfig.folders): string[] {
  const dir = join(vaultConfig.basePath, vaultConfig.folders[folder])
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => extname(f) === '.md' && !f.startsWith('_'))
    .map(f => join(dir, f))
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

export function toVaultSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)
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

import { getDb } from './db'

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
    'termine': 'done',
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
}

/**
 * Sync all agents from vault to DB.
 * Uses UPDATE for existing agents (to preserve mm_token and other JSON-source fields)
 * and INSERT only for new agents.
 */
export function syncAgentsToDb(): void {
  const db = getDb()
  const files = listVaultFiles('agents')

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

      // Sync skills from vault (wikilinks like "[[github]]" or "[[jcodemunch]]")
      if (fm.skills && Array.isArray(fm.skills)) {
        // Clear existing assignments for this agent, then re-insert from vault
        db.prepare('DELETE FROM agent_skills WHERE agent_id = ?').run(id)
        for (const raw of fm.skills) {
          // Extract skill ID from wikilink: "[[foo]]" → "foo", "[[foo|bar]]" → "foo"
          const skillId = String(raw).replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim()
          if (!skillId) continue
          // Ensure skill exists in skills table (auto-create if only in vault)
          insertSkillIfMissing.run(skillId, skillId, 'active')
          upsertSkill.run(id, skillId)
        }
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
  'build': 'execution',
  'review': 'execution',
  'delivery': 'execution',
  'rex': 'execution',
  'done': 'termine',
}

/**
 * Ensure every agent in DB has a corresponding vault file.
 * Creates new files for agents that only exist in JSON sources.
 * Updates frontmatter for agents that already have vault files.
 */
export function syncAgentsToVault(): void {
  const db = getDb()
  const agents = db.prepare('SELECT * FROM agents').all() as DbAgent[]

  // Build a map of frontmatter id → filePath (handles filename != id, e.g. cloclo.md with id: main)
  const idToFile = new Map<string, string>()
  for (const filePath of listVaultFiles('agents')) {
    try {
      const { frontmatter: fm } = parseVaultFile(filePath)
      const id = fm.id || idFromFilename(filePath)
      idToFile.set(id, filePath)
    } catch { /* skip */ }
  }

  for (const agent of agents) {
    if (idToFile.has(agent.id)) {
      // Already has a vault file — update frontmatter only (preserve body)
      const filePath = idToFile.get(agent.id)!
      if (!existsSync(filePath)) continue
      try {
        const file = parseVaultFile(filePath)
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
        }
        // Only write if something actually changed
        if (JSON.stringify(updated) !== JSON.stringify(file.frontmatter)) {
          writeVaultFile(filePath, updated, file.body)
        }
      } catch (err) {
        console.error(`[vault] Failed to update agent vault file: ${agent.id}`, err)
      }
    } else {
      // No vault file yet — create one
      const filename = `${agent.id}.md`
      const filePath = getVaultFilePath('agents', filename)
      const frontmatter: Record<string, any> = {
        nom: agent.name,
        id: agent.id,
        emoji: agent.emoji || '',
        team: agent.team || '',
        role: agent.role || '',
        modele: agent.model || 'claude-opus-4-6',
        status: agent.status || 'active',
        workspace: agent.workspace || '',
        mattermost: {
          username: agent.mm_username || '',
          user_id: agent.mm_user_id || '',
        },
        expertise: [],
        skills: db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?')
          .all(agent.id).map((r: any) => `[[${r.skill_id}]]`),
        projets_actifs: db.prepare('SELECT project_id FROM project_agents WHERE agent_id = ?')
          .all(agent.id).map((r: any) => `[[Projets/${r.project_id}]]`),
        created_at: agent.created_at || new Date().toISOString(),
      }
      const body = `# ${agent.name}\n\n## Personnalite\n\n## Directives\n\n## Notes\n`
      try {
        writeVaultFile(filePath, frontmatter, body)
        // Update DB with vault_path
        db.prepare('UPDATE agents SET vault_path = ? WHERE id = ?').run(filePath, agent.id)
        console.log(`[vault] Created vault file for agent: ${agent.id}`)
      } catch (err) {
        console.error(`[vault] Failed to create agent vault file: ${agent.id}`, err)
      }
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
          phase_courante: project.current_phase || file.frontmatter.phase_courante || '',
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
      // Create new vault file for project
      const filename = `${projectId}.md`
      const filePath = getVaultFilePath('projects', filename)
      const obsidianStatut = reverseStateMap[project.state] || 'cadrage'
      const frontmatter: Record<string, any> = {
        titre: project.name,
        id: projectId,
        type: project.type || 'code',
        statut: obsidianStatut,
        progression: project.progress || 0,
        phase_courante: project.current_phase || '',
        lead: project.lead || '',
        equipe: [],
        github: {
          repo: project.github_repo || '',
          url: project.github_repo ? `https://github.com/${vaultConfig.githubOwner}/${project.github_repo}` : '',
          created: !!project.github_created,
        },
        workspace: project.workspace || '',
        channel: project.channel || '',
        idee_source: '',
        tags: [],
        stack: [],
        created_at: project.created_at || new Date().toISOString(),
        updated_at: project.updated_at || new Date().toISOString(),
      }

      // Get team assignments
      const team = db.prepare('SELECT agent_id, role FROM project_agents WHERE project_id = ?').all(projectId) as { agent_id: string; role: string | null }[]
      if (team.length > 0) {
        frontmatter.equipe = team.map(t => ({
          agent: `[[Agents/${t.agent_id}]]`,
          role: t.role || 'developer',
        }))
        if (!frontmatter.lead && team.length > 0) {
          frontmatter.lead = `[[Agents/${team[0].agent_id}]]`
        }
      }

      const body = `# ${project.name}\n\n> \n\n## Objectifs\n\n## Approche\n\n## Implementation\n\n## Risques & Dependances\n`
      try {
        writeVaultFile(filePath, frontmatter, body)
        db.prepare('UPDATE projects SET vault_path = ? WHERE id = ?').run(filePath, projectId)
        console.log(`[vault] Created vault file for project: ${projectId}`)
      } catch (err) {
        console.error(`[vault] Failed to create project vault file: ${projectId}`, err)
      }
    }
  }
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
