/**
 * GET /api/agents/:id
 * Source de vérité unique : sources/agents.json + fichiers workspace
 */
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

const WORKSPACE_FILES = [
  'SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md',
  'MEMORY.md', 'HEARTBEAT.md', 'TOOLS.md', 'BOOTSTRAP.md'
]

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')

  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID requis' })
  }

  try {
    const raw = await readFile(join(SOURCES_DIR, 'agents.json'), 'utf-8')
    const { agents } = JSON.parse(raw)

    const agent = agents.find((a: any) => a.id === agentId)
    if (!agent) {
      throw createError({ statusCode: 404, statusMessage: `Agent '${agentId}' non trouvé` })
    }

    // Workspace path comes from the source of truth
    const workspacePath = agent.workspace

    // Read workspace files
    const files: Record<string, string> = {}
    if (workspacePath && existsSync(workspacePath)) {
      for (const filename of WORKSPACE_FILES) {
        const filePath = join(workspacePath, filename)
        if (existsSync(filePath)) {
          try { files[filename] = await readFile(filePath, 'utf-8') } catch {}
        }
      }

      const memoryDir = join(workspacePath, 'memory')
      if (existsSync(memoryDir)) {
        try {
          const memoryFiles = readdirSync(memoryDir)
            .filter(f => f.endsWith('.md'))
            .sort()
            .slice(-5)
          for (const mf of memoryFiles) {
            files[`memory/${mf}`] = await readFile(join(memoryDir, mf), 'utf-8')
          }
        } catch {}
      }
    }

    return {
      ...agent,
      activeSessions: 0,
      totalTokens: 0,
      maxPercentUsed: 0,
      lastActivity: null,
      lastHeartbeat: null,
      sessions: [],
      files,
      channels: []
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error(`[/api/agents/${agentId}] Error:`, error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur récupération agent' })
  }
})
