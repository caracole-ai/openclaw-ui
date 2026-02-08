/**
 * POST /api/projects/:id/nudge - Relancer un projet stale
 * 
 * Spawne l'orchestrator pour faire le point avec les agents assignés.
 * Cooldown: 30 minutes entre chaque nudge.
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'
const COOLDOWN_MS = 15 * 1000 // 15 seconds

interface NudgeResponse {
  success: boolean
  message: string
  projectId: string
  nudgedAgents: string[]
  nextNudgeAvailableAt?: string
}

export default defineEventHandler(async (event): Promise<NudgeResponse> => {
  const projectId = getRouterParam(event, 'id')
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID required'
    })
  }

  try {
    // Load projects
    if (!existsSync(PROJECTS_FILE)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Projects file not found'
      })
    }

    const data = await readFile(PROJECTS_FILE, 'utf-8')
    const projectsData = JSON.parse(data)
    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId)
    
    if (projectIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: `Project ${projectId} not found`
      })
    }

    const project = projectsData.projects[projectIndex]

    // Check cooldown
    if (project.lastNudgeAt) {
      const lastNudge = new Date(project.lastNudgeAt).getTime()
      const now = Date.now()
      const elapsed = now - lastNudge
      
      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed
        const remainingMin = Math.ceil(remainingMs / 60000)
        const nextAvailable = new Date(lastNudge + COOLDOWN_MS).toISOString()
        
        throw createError({
          statusCode: 429,
          statusMessage: `Cooldown actif. Prochain nudge possible dans ${remainingMin} minutes.`,
          data: { nextNudgeAvailableAt: nextAvailable }
        })
      }
    }

    // Get assignees (include owner)
    const assignees = [...new Set([
      project.owner,
      ...(project.assignees || [])
    ])].filter(Boolean)

    if (assignees.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Aucun agent assigné à ce projet'
      })
    }

    // Build the nudge message
    const nudgeTask = `🔄 **Nudge projet: "${project.name}"**

**Status actuel:** ${project.status} (${project.progress || 0}%)
**Agents assignés:** ${assignees.join(', ')}

**Action requise:**
Faites le point sur ce projet. Si vous êtes bloqués, concertez-vous. 
Si une décision est nécessaire, demandez à @lio.
Mettez à jour le status via: \`~/.openclaw/scripts/project-update.sh ${projectId} note "votre update"\`

Dernière activité: ${project.updatedAt || 'inconnue'}`

    // Option 2: Canal groupé - envoyer dans le channel d'origine du projet
    const channelId = project.channelId || project.sourceChannelId
    
    if (channelId) {
      // Envoyer dans le canal groupé existant via sessions_send
      try {
        const sendCmd = `openclaw sessions send --session "agent:orchestrator:mattermost:channel:${channelId}" --message ${JSON.stringify(nudgeTask)}`
        await execAsync(sendCmd, { timeout: 10000 })
        console.log(`[nudge] Message envoyé dans le canal ${channelId}`)
      } catch (sendError: any) {
        console.warn('[nudge] sessions_send failed:', sendError.message)
        // Fallback: spawn orchestrator
        try {
          const spawnCmd = `openclaw sessions spawn --agent orchestrator --task ${JSON.stringify(nudgeTask)} --timeout 300`
          await execAsync(spawnCmd, { timeout: 10000 })
        } catch (spawnError) {
          console.warn('[nudge] spawn fallback also failed:', spawnError)
        }
      }
    } else {
      // Pas de canal connu → spawn orchestrator pour créer une mini-délibération
      console.log('[nudge] No channelId, spawning orchestrator')
      try {
        const spawnCmd = `openclaw sessions spawn --agent orchestrator --task ${JSON.stringify(nudgeTask)} --timeout 300`
        await execAsync(spawnCmd, { timeout: 10000 })
      } catch (spawnError: any) {
        console.warn('[nudge] spawn failed:', spawnError.message)
      }
    }

    // Update lastNudgeAt
    projectsData.projects[projectIndex].lastNudgeAt = new Date().toISOString()
    
    // Add to updates history
    if (!projectsData.projects[projectIndex].updates) {
      projectsData.projects[projectIndex].updates = []
    }
    projectsData.projects[projectIndex].updates.push({
      timestamp: new Date().toISOString(),
      agentId: 'dashboard',
      type: 'nudge',
      message: `🔄 Projet relancé via dashboard. Agents notifiés: ${assignees.join(', ')}`
    })
    
    // Update version for polling
    projectsData.version = (projectsData.version || 0) + 1

    // Save
    await writeFile(PROJECTS_FILE, JSON.stringify(projectsData, null, 2))

    // Update .version file for optimized polling
    const versionFile = `${process.env.HOME}/.openclaw/projects/.version`
    await writeFile(versionFile, Date.now().toString())

    return {
      success: true,
      message: `Projet "${project.name}" relancé. Orchestrator notifié.`,
      projectId,
      nudgedAgents: assignees,
      nextNudgeAvailableAt: new Date(Date.now() + COOLDOWN_MS).toISOString()
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('[/api/projects/:id/nudge] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to nudge project',
      data: { error: error.message }
    })
  }
})
