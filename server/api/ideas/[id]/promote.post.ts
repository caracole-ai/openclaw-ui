/**
 * POST /api/ideas/:id/promote
 * Promote an approved idea into a project.
 * Creates a Projets/*.md file in the vault and inserts into DB.
 */
import { getDb } from '~/server/utils/db'
import { launchPipeline } from '~/server/utils/pipeline'
import { serializeIdea } from '~/server/utils/serializers'
import {
  parseVaultFile,
  writeVaultFile,
  updateVaultFrontmatter,
  getVaultFilePath,
  toVaultSlug,
  updateKanbanBoard,
  loadTemplate,
  vaultConfig,
} from '~/server/utils/vault'
import { basename } from 'path'
import type { DbIdea } from '~/server/types/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event) || {}
  const db = getDb()

  // 1. Load and validate idea
  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea | undefined
  if (!idea) {
    throw createError({ statusCode: 404, statusMessage: 'Idea not found' })
  }

  if (idea.statut !== 'approuvee') {
    throw createError({ statusCode: 400, statusMessage: `Cannot promote idea with statut '${idea.statut}'. Must be 'approuvee'.` })
  }

  // 2. Resolve idea vault path (may be null in DB — reconstruct from disk)
  let ideaVaultPath = idea.vault_path || ''
  if (!ideaVaultPath) {
    const ideasDir = getVaultFilePath('ideas', '')
    try {
      const { readdirSync } = await import('fs')
      const files = readdirSync(ideasDir)
      const match = files.find((f: string) => f.includes(id) || f.includes(toVaultSlug(idea.titre)))
      if (match) {
        ideaVaultPath = `${ideasDir}${match}`
        // Persist for next time
        db.prepare('UPDATE ideas SET vault_path = ? WHERE id = ?').run(ideaVaultPath, id)
      }
    } catch {}
  }

  // 3. Generate project slug and paths
  const projectName = body.name || idea.titre
  const projectType = body.type || 'code'
  const slug = toVaultSlug(projectName)
  const ideaFilename = ideaVaultPath ? basename(ideaVaultPath) : ''

  // Create project subfolder: Projets/<slug>/<slug>.md
  const { mkdirSync } = await import('fs')
  const projectDir = getVaultFilePath('projects', slug)
  mkdirSync(projectDir, { recursive: true })
  const projectPath = `${projectDir}/${slug}.md`

  // 3. Create project vault file — frontmatter from template, body minimal
  const now = new Date().toISOString()
  const template = loadTemplate('projet')

  const projectFrontmatter: Record<string, any> = {
    ...template.frontmatter,
    titre: projectName,
    id: slug,
    type: projectType,
    statut: 'planification',
    progression: 0,
    phase_courante: 'planification',
    idee_source: ideaFilename ? `[[Idées/${ideaFilename.replace('.md', '')}]]` : '',
    tags: idea.themes ? JSON.parse(idea.themes) : [],
    chemin: `~/Desktop/coding-projects/AUTO-BUILD/${slug}`,
    created_at: now,
    updated_at: now,
  }

  // Add agents if provided
  if (body.agents && Array.isArray(body.agents)) {
    projectFrontmatter.equipe = body.agents.map((a: any) => ({
      agent: `[[Agents/${a.id || a}]]`,
      role: a.role || 'developer',
    }))
  }

  // Use template body with placeholder substitution
  let projectBody = template.body
    .replace(/\{\{titre\}\}/g, projectName)
    .replace(/\{\{id\}\}/g, slug)
    .replace(/\{\{date\}\}/g, now.split('T')[0])
    .replace(/\{\{idee_source\}\}/g, ideaFilename ? ideaFilename.replace('.md', '') : '')

  writeVaultFile(projectPath, projectFrontmatter, projectBody)

  // 4. Insert project into DB for immediate reactivity
  db.prepare(`
    INSERT OR REPLACE INTO projects (id, name, description, type, status, state, progress, vault_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(slug, projectName, '', projectType, 'planning', 'planning', 0, projectPath, now, now)

  // Assign agents
  if (body.agents && Array.isArray(body.agents)) {
    const insertPA = db.prepare('INSERT OR REPLACE INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')
    for (const a of body.agents) {
      const agentId = typeof a === 'string' ? a : a.id
      const role = typeof a === 'string' ? null : a.role
      insertPA.run(slug, agentId, role)
    }
  }

  // 5. Update idea: statut → promue, projet_lie
  const projetLie = `[[Projets/${slug}]]`
  db.prepare("UPDATE ideas SET statut = 'promue', projet_lie = ?, updated_at = datetime('now') WHERE id = ?")
    .run(projetLie, id)

  if (ideaVaultPath) {
    try {
      updateVaultFrontmatter(ideaVaultPath, {
        statut: 'promue',
        projet_lie: projetLie,
      })
    } catch (err) {
      console.error(`[promote] Failed to update idea vault file:`, err)
    }
  }

  // 6. Log event
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `evt-${Date.now()}`,
    'idea.promoted',
    'lio',
    JSON.stringify({ ideaId: id, projectId: slug }),
    now
  )

  // 7. Update Kanban board in Obsidian
  try {
    updateKanbanBoard(slug, projectName, 'planning')
  } catch (err) {
    console.error(`[promote] Failed to update Kanban:`, err)
  }

  // 8. Launch pipeline (fire-and-forget)
  console.log(`[promote] About to launch pipeline for ${slug}, ideaVaultPath=${ideaVaultPath}`)
  try {
    const pipelineResult = launchPipeline({
      type: 'incubation',
      projectId: slug,
      projectName,
      ideaVaultPath,
    })
    console.log(`[promote] Pipeline result:`, JSON.stringify(pipelineResult))
  } catch (err) {
    console.error(`[promote] Pipeline launch failed:`, err)
  }

  return {
    status: 'success',
    projectId: slug,
    projectPath,
    idea: serializeIdea(db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea),
  }
})
