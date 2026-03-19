/**
 * GET /api/skills/:id/content
 * Returns the SKILL.md content for a given skill.
 * For vault-only skills (no SKILL.md), generates a summary from DB data.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { getDb } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const skillId = getRouterParam(event, 'id')

  if (!skillId) {
    throw createError({
      statusCode: 400,
      message: 'Skill ID required',
    })
  }

  const db = getDb()
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as any

  if (!skill) {
    throw createError({
      statusCode: 404,
      message: `Skill not found: ${skillId}`,
    })
  }

  // Try to read SKILL.md from local path
  if (skill.path) {
    const openclawHome = resolve(process.env.HOME || '~', '.openclaw')
    const skillPath = join(openclawHome, skill.path)
    const skillMdPath = join(skillPath, 'SKILL.md')

    if (existsSync(skillMdPath)) {
      try {
        const content = readFileSync(skillMdPath, 'utf-8')
        return {
          id: skill.id,
          name: skill.name,
          path: skill.path,
          content,
          timestamp: new Date().toISOString(),
        }
      } catch { /* fall through to generated content */ }
    }
  }

  // Generate content from DB data for vault-only skills
  const agents = db.prepare(`
    SELECT a.id, a.name, a.emoji FROM agent_skills AS ask
    JOIN agents a ON a.id = ask.agent_id
    WHERE ask.skill_id = ?
    ORDER BY a.name
  `).all(skillId) as { id: string; name: string; emoji: string | null }[]

  const manifest = skill.manifest ? JSON.parse(skill.manifest) : null

  let content = `# ${skill.name}\n\n`

  if (skill.description) {
    content += `${skill.description}\n\n`
  }

  if (manifest?.description) {
    content += `${manifest.description}\n\n`
  }

  // Metadata
  content += `## Informations\n\n`
  content += `| Champ | Valeur |\n|-------|--------|\n`
  content += `| **ID** | \`${skill.id}\` |\n`
  if (skill.version) content += `| **Version** | ${skill.version} |\n`
  if (skill.source) content += `| **Source** | ${skill.source} |\n`
  content += `| **Statut** | ${skill.status} |\n`
  if (skill.path) content += `| **Path** | \`${skill.path}\` |\n`
  if (!skill.path) content += `| **Origine** | Vault Obsidian (pas de SKILL.md local) |\n`
  if (skill.installed_at) content += `| **Installe le** | ${skill.installed_at} |\n`
  if (skill.installed_by) content += `| **Installe par** | ${skill.installed_by} |\n`
  content += `\n`

  // Agents
  if (agents.length > 0) {
    content += `## Agents assigne(s)\n\n`
    for (const a of agents) {
      content += `- ${a.emoji || ''} **${a.name}** (\`${a.id}\`)\n`
    }
    content += `\n`
  }

  // Manifest tools
  if (manifest?.tools && Array.isArray(manifest.tools)) {
    content += `## Tools\n\n`
    for (const tool of manifest.tools) {
      content += `- **${tool.name || tool}**`
      if (tool.description) content += ` — ${tool.description}`
      content += `\n`
    }
    content += `\n`
  }

  return {
    id: skill.id,
    name: skill.name,
    path: skill.path || null,
    content,
    timestamp: new Date().toISOString(),
  }
})
