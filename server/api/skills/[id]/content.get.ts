/**
 * GET /api/skills/:id/content
 * Returns the SKILL.md content for a given skill
 */
import { readFileSync } from 'node:fs'
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

  // Resolve path to SKILL.md
  // skill.path is relative to ~/.openclaw/ (e.g., "skills/github", "workspace-skills/gr-attitude")
  const openclawHome = resolve(process.env.HOME || '~', '.openclaw')
  const skillPath = join(openclawHome, skill.path)
  const skillMdPath = join(skillPath, 'SKILL.md')

  try {
    const content = readFileSync(skillMdPath, 'utf-8')

    return {
      id: skill.id,
      name: skill.name,
      path: skill.path,
      content,
      timestamp: new Date().toISOString(),
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to read SKILL.md: ${err.message}`,
    })
  }
})
