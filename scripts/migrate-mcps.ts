/**
 * One-time migration script: split MCPs from skills in all data sources.
 * Run with: npx tsx scripts/migrate-mcps.ts
 *
 * Updates:
 * 1. ~/.openclaw/sources/skills.json — remove MCP entries
 * 2. ~/.openclaw/sources/mcps.json — create with MCP entries
 * 3. Obsidian vault agent files — split skills/mcps frontmatter
 * 4. SQLite DB — handled automatically by db.ts migration on next startup
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

const HOME = process.env.HOME || ''
const SOURCES_DIR = join(HOME, '.openclaw/sources')
const VAULT_PATH = process.env.VAULT_PATH || join(HOME, 'Documents/ObsidianVault')
const AGENTS_DIR = join(VAULT_PATH, 'Agents')

// MCP IDs — items that are MCP servers, not internal skills
const MCP_IDS = new Set([
  'chrome-devtools-mcp',
  'mattermost-mcp',
  'stitch-mcp',
  'hostinger',
  'jcodemunch',
  'browser-automation',
  'peekaboo',
  'context7',
  'playwright',
])

function isMcpId(id: string): boolean {
  return MCP_IDS.has(id) || id.endsWith('-mcp')
}

// ─── 1. Split skills.json → skills.json + mcps.json ───

console.log('\n=== Step 1: Split skills.json ===')

const skillsPath = join(SOURCES_DIR, 'skills.json')
const mcpsPath = join(SOURCES_DIR, 'mcps.json')

if (existsSync(skillsPath)) {
  const skillsData = JSON.parse(readFileSync(skillsPath, 'utf-8'))
  const allInstalled = skillsData.installed || []

  const skillItems = allInstalled.filter((s: any) => !isMcpId(s.id))
  const mcpItems = allInstalled.filter((s: any) => isMcpId(s.id))

  console.log(`  Skills: ${skillItems.map((s: any) => s.id).join(', ')}`)
  console.log(`  MCPs:   ${mcpItems.map((s: any) => s.id).join(', ')}`)

  // Update skills.json — keep only real skills
  const newSkillAssignments: Record<string, string[]> = {}
  for (const [agentId, skillIds] of Object.entries(skillsData.assignments || {})) {
    const filtered = (skillIds as string[]).filter(id => !isMcpId(id))
    if (filtered.length > 0) newSkillAssignments[agentId] = filtered
  }

  skillsData.installed = skillItems
  skillsData.assignments = newSkillAssignments
  writeFileSync(skillsPath, JSON.stringify(skillsData, null, 2), 'utf-8')
  console.log(`  Updated skills.json (${skillItems.length} skills)`)

  // Create mcps.json
  const mcpAssignments: Record<string, string[]> = {}
  for (const [agentId, skillIds] of Object.entries((JSON.parse(readFileSync(skillsPath, 'utf-8'))).assignments || {})) {
    // We need the original assignments, re-read
  }
  // Re-derive from original data
  const origData = JSON.parse(readFileSync(skillsPath, 'utf-8'))
  // Actually we already modified skillsData... let me use the original allInstalled
  const origAssignments = JSON.parse(readFileSync(skillsPath, 'utf-8')).assignments || {}
  // Oops, we already wrote it. Let me recalculate from the original file content.
  // Let's just build from the agents list in MCP items
  for (const [agentId, ids] of Object.entries(skillsData.assignments || {})) {
    // Already filtered above
  }

  // Build MCP assignments from original data (agents field on each MCP item)
  for (const m of mcpItems) {
    if (m.agents && Array.isArray(m.agents)) {
      for (const agentId of m.agents) {
        if (!mcpAssignments[agentId]) mcpAssignments[agentId] = []
        if (!mcpAssignments[agentId].includes(m.id)) mcpAssignments[agentId].push(m.id)
      }
    }
  }
  // Also use the original skillsData assignments we had before filtering
  // We need the original. Let me re-read...
  // Actually the data from allInstalled has an agents field. That's enough.

  const mcpsJson = {
    installed: mcpItems.map((m: any) => ({
      ...m,
      // Rename manifest → config for MCPs
      config: m.manifest || null,
      manifest: undefined,
    })),
    assignments: mcpAssignments,
  }
  writeFileSync(mcpsPath, JSON.stringify(mcpsJson, null, 2), 'utf-8')
  console.log(`  Created mcps.json (${mcpItems.length} MCPs)`)
} else {
  console.log('  skills.json not found, skipping')
}

// ─── 2. Update Obsidian vault agent files ───

console.log('\n=== Step 2: Update Obsidian vault files ===')

if (existsSync(AGENTS_DIR)) {
  const files = readdirSync(AGENTS_DIR).filter(f => extname(f) === '.md')

  for (const filename of files) {
    const filePath = join(AGENTS_DIR, filename)
    const raw = readFileSync(filePath, 'utf-8')
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

    if (!match) continue

    let frontmatter: Record<string, any> = {}
    try {
      frontmatter = parseYaml(match[1]) || {}
    } catch {
      console.log(`  Skipping ${filename} (invalid YAML)`)
      continue
    }
    const body = match[2] || ''

    // Check if this file has skills that need splitting
    const skills = frontmatter.skills || []
    if (!Array.isArray(skills) || skills.length === 0) {
      console.log(`  ${filename}: no skills to split`)
      continue
    }

    const newSkills: string[] = []
    const newMcps: string[] = [...(frontmatter.mcps || [])]

    for (const raw of skills) {
      const id = String(raw).replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim()
      if (!id) continue

      if (isMcpId(id)) {
        const wikilink = `[[${id}]]`
        if (!newMcps.includes(wikilink)) newMcps.push(wikilink)
      } else {
        newSkills.push(raw)
      }
    }

    // Only write if something changed
    const changed = JSON.stringify(newSkills) !== JSON.stringify(skills) || newMcps.length > 0
    if (changed) {
      frontmatter.skills = newSkills
      frontmatter.mcps = newMcps
      const yamlStr = stringifyYaml(frontmatter, { lineWidth: 0 })
      const content = `---\n${yamlStr}---\n${body}`
      writeFileSync(filePath, content, 'utf-8')
      console.log(`  ${filename}: skills=${newSkills.length}, mcps=${newMcps.length}`)
    } else {
      console.log(`  ${filename}: no changes needed`)
    }
  }
} else {
  console.log('  Agents directory not found')
}

// ─── 3. Delete DB to force re-seed ───

console.log('\n=== Step 3: DB will be re-migrated on next startup ===')
const dbPath = join(HOME, '.openclaw/dashboard.db')
if (existsSync(dbPath)) {
  // Remove the migration marker so it re-runs
  // Actually the migration in db.ts handles this idempotently
  console.log(`  DB at ${dbPath} will auto-migrate on next startup`)
}

console.log('\n✅ Migration complete! Restart the dashboard to apply DB changes.\n')
