import { readFile, lstat } from 'fs/promises'
import { join } from 'path'
import type { SkillsSource, SkillVerification } from '~/types/skill'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')
const WORKSPACES_DIR = join(process.env.HOME || '', '.openclaw/workspaces')

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'agentId')
  const skillId = getRouterParam(event, 'skillId')

  if (!agentId || !skillId) {
    throw createError({ statusCode: 400, statusMessage: 'agentId et skillId requis' })
  }

  try {
    const raw = await readFile(join(SOURCES_DIR, 'skills.json'), 'utf-8')
    const source: SkillsSource = JSON.parse(raw)

    // Check 1: in assignments
    const agentSkills = source.assignments?.[agentId] || []
    const inAssignments = agentSkills.includes(skillId)

    // Check 2: symlink exists
    let symlinkExists = false
    try {
      const skillPath = join(WORKSPACES_DIR, agentId, 'skills', skillId)
      const stats = await lstat(skillPath)
      symlinkExists = stats.isSymbolicLink() || stats.isDirectory()
    } catch {}

    // Check 3: frontmatter injected (check SOUL.md for skill reference)
    let frontmatterInjected = false
    try {
      const soulContent = await readFile(join(WORKSPACES_DIR, agentId, 'SOUL.md'), 'utf-8')
      frontmatterInjected = soulContent.includes(skillId)
    } catch {}

    // Check 4: dependencies met
    const skill = source.installed.find(s => s.id === skillId)
    let dependenciesMet = true
    if (skill?.manifest?.dependencies?.env) {
      for (const envVar of skill.manifest.dependencies.env) {
        if (!process.env[envVar]) {
          dependenciesMet = false
          break
        }
      }
    }

    const verified = inAssignments && symlinkExists && frontmatterInjected && dependenciesMet

    const result: SkillVerification = {
      skillId,
      agentId,
      verified,
      checks: { inAssignments, symlinkExists, frontmatterInjected, dependenciesMet },
      timestamp: new Date().toISOString()
    }

    return result
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'Source skills.json introuvable' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur vérification skill', data: { error: err.message } })
  }
})
