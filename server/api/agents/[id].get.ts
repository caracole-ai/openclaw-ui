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

    // Token usage from sources/tokens.json
    let totalTokens = 0
    let lastActivity: string | null = null
    try {
      const tokensRaw = await readFile(join(SOURCES_DIR, 'tokens.json'), 'utf-8')
      const { events = [] } = JSON.parse(tokensRaw)
      const agentEvents = events.filter((e: any) => e.agentId === agentId)
      totalTokens = agentEvents.reduce((sum: number, e: any) => sum + (e.totalTokens || 0), 0)
      if (agentEvents.length) {
        lastActivity = agentEvents.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0].timestamp
      }
    } catch {}

    // Projects from sources/projects.json
    let projects: any[] = []
    try {
      const projRaw = await readFile(join(SOURCES_DIR, 'projects.json'), 'utf-8')
      const { projects: allProjects = [] } = JSON.parse(projRaw)
      projects = allProjects.filter((p: any) =>
        p.team?.some((t: any) => t.agent === agentId) ||
        p.owner === agentId
      ).map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        type: p.type,
        team: p.team,
        owner: p.owner
      }))
    } catch {}

    return {
      ...agent,
      projects,
      activeSessions: 0,
      totalTokens,
      maxPercentUsed: 0,
      lastActivity,
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
