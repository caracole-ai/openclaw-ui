/**
 * POST /api/projects/:id/dialog
 * Send a message in the project dialog channel. Cloclo (orchestrator) responds via OpenClaw.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getDb } from '~/server/utils/db'
import { mmApi, mmPostAsAdmin, getAgentMM, mmCreateChannel, mmAddToChannel } from '~/server/utils/mattermost'

const AUTO_BUILD_DIR = join(process.env.HOME || '', 'Desktop/coding-projects/AUTO-BUILD')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const body = await readBody(event)
  if (!body?.message?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Message requis' })
  }

  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projet non trouvé' })

  const teamId = process.env.MATTERMOST_TEAM_ID || ''
  const channelName = `dialog-${id}`.slice(0, 64)
  const displayName = `💬 Dialog : ${project.name}`.slice(0, 64)

  // Get or create the dialog channel
  let channelId: string
  try {
    const existing = await mmApi('GET', `/teams/${teamId}/channels/name/${channelName}`)
    channelId = existing.id
  } catch {
    // Create channel + add Cloclo
    const channel = await mmCreateChannel(channelName, displayName, `Discussion projet: ${project.name}`, 'P')
    channelId = channel.id

    // Add orchestrator (Cloclo) so OpenClaw routes messages to it
    const orchestrator = getAgentMM('main')
    if (orchestrator) {
      await mmAddToChannel(channelId, orchestrator.mattermost.userId)
    }

    // Build rich project context
    const buildDir = join(AUTO_BUILD_DIR, id)
    const hasBuild = existsSync(buildDir)
    const reviewPath = join(buildDir, 'review-report.md')
    const hasReview = existsSync(reviewPath)

    let context = `📋 **Contexte projet : ${project.name}**\n`
    context += `- **État** : ${project.state}\n`
    context += `- **Type** : ${project.type || 'code'}\n`
    context += `- **Progression** : ${project.progress || 0}%\n`

    if (hasBuild) {
      context += `- **Build** : ✅ Code généré dans \`AUTO-BUILD/${id}/\`\n`
      // List top-level structure
      try {
        const { readdirSync } = require('fs')
        const files = readdirSync(buildDir).filter((f: string) => !f.startsWith('.') && f !== 'node_modules')
        context += `- **Fichiers** : ${files.join(', ')}\n`
      } catch {}
    }

    if (hasReview) {
      context += `- **Review** : ✅ Rapport disponible\n`
      // Include review verdict
      try {
        const report = readFileSync(reviewPath, 'utf-8')
        const verdictMatch = report.match(/###?\s*(PASS|FAIL)/i)
        if (verdictMatch) context += `- **Verdict** : ${verdictMatch[1]}\n`
        // Include summary (first ~500 chars after verdict)
        const verdictIdx = report.indexOf('## 10. Verdict')
        if (verdictIdx > 0) {
          context += `\n**Extrait review :**\n${report.slice(verdictIdx, verdictIdx + 500).trim()}\n`
        }
      } catch {}
    }

    // Get recent updates from DB
    const updates = db.prepare('SELECT message, type, created_at FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 5').all(id) as any[]
    if (updates.length) {
      context += `\n**Dernières mises à jour :**\n`
      for (const u of updates) {
        context += `- [${u.type}] ${u.message.slice(0, 100)}\n`
      }
    }

    context += `\nCe channel est dédié aux discussions sur ce projet. Tu as accès à tout le contexte ci-dessus pour répondre de manière informée.`

    await mmPostAsAdmin(channelId, context)
  }

  // Post user message with @orchestrator mention so OpenClaw routes to Cloclo
  const orchestrator = getAgentMM('main')
  const mention = orchestrator ? `@${orchestrator.mattermost.username}` : '@orchestrator'
  const fullMessage = `${mention} ${body.message}`

  const post = await mmPostAsAdmin(channelId, fullMessage)

  return {
    success: true,
    channelId,
    postId: post?.id,
  }
})
