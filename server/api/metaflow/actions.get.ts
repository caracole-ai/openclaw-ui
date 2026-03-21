/**
 * GET /api/metaflow/actions
 * Parses MetaFlow/supreme/*.md frontmatter and returns all pipeline stages with their actions.
 */
import { join } from 'path'
import { readdirSync, existsSync } from 'fs'
import { parseVaultFile, vaultConfig } from '~/server/utils/vault'

interface MetaflowAction {
  id: string
  type: 'api-call' | 'spawn' | 'side-effect' | 'db-write' | 'notification'
  label: string
  endpoint?: string
  cible: string[]
  description: string
}

interface MetaflowStage {
  file: string
  stage: number
  stage_label: string
  stage_icon: string
  titre: string
  actions: MetaflowAction[]
}

export default defineEventHandler(() => {
  const supremeDir = join(vaultConfig.basePath, 'MetaFlow', 'supreme')

  if (!existsSync(supremeDir)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'MetaFlow/supreme directory not found in vault',
    })
  }

  const files = readdirSync(supremeDir)
    .filter(f => f.endsWith('.md') && /^\d+/.test(f))
    .sort()

  const stages: MetaflowStage[] = []

  for (const file of files) {
    const filePath = join(supremeDir, file)
    try {
      const { frontmatter: fm } = parseVaultFile(filePath)

      if (!fm.actions || !Array.isArray(fm.actions)) continue

      stages.push({
        file: `MetaFlow/supreme/${file}`,
        stage: fm.stage || 0,
        stage_label: fm.stage_label || fm.titre || file,
        stage_icon: fm.stage_icon || '',
        titre: fm.titre || file,
        actions: fm.actions.map((a: any) => ({
          id: a.id || '',
          type: a.type || 'side-effect',
          label: a.label || a.id || '',
          endpoint: a.endpoint || undefined,
          cible: Array.isArray(a.cible) ? a.cible : [],
          description: a.description || '',
        })),
      })
    } catch (err) {
      console.error(`[metaflow] Failed to parse ${file}:`, err)
    }
  }

  return { stages }
})
