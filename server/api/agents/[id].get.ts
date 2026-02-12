/**
 * GET /api/agents/:id
 * Source: SQLite + workspace files + live session stores
 */
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { getDb, getLiveStats, getLiveSessions } from '~/server/utils/db'

const WORKSPACE_FILES = [
  'SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md',
  'MEMORY.md', 'HEARTBEAT.md', 'TOOLS.md', 'BOOTSTRAP.md'
]

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId) throw createError({ statusCode: 400, statusMessage: 'Agent ID requis' })

  const db = getDb()
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any
  if (!agent) throw createError({ statusCode: 404, statusMessage: `Agent '${agentId}' non trouvé` })

  // Skills
  const skills = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?')
    .all(agentId).map((r: any) => r.skill_id)

  // Projects
  const projects = db.prepare(`
    SELECT p.id, p.name, p.status, p.progress, p.type, pa.role as agent_role
    FROM projects p
    JOIN project_agents pa ON pa.project_id = p.id
    WHERE pa.agent_id = ?
  `).all(agentId)

  // Workspace files
  const files: Record<string, string> = {}
  const workspacePath = agent.workspace
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
        const memoryFiles = readdirSync(memoryDir).filter(f => f.endsWith('.md')).sort().slice(-5)
        for (const mf of memoryFiles) {
          files[`memory/${mf}`] = await readFile(join(memoryDir, mf), 'utf-8')
        }
      } catch {}
    }
  }

  // Live data
  const live = getLiveStats(agentId)
  const sessions = getLiveSessions(agentId)

  return {
    id: agent.id,
    name: agent.name,
    emoji: agent.emoji,
    team: agent.team,
    role: agent.role,
    model: agent.model,
    workspace: agent.workspace,
    status: agent.status,
    skills,
    mattermost: { username: agent.mm_username, userId: agent.mm_user_id, token: agent.mm_token },
    permissions: agent.permissions ? JSON.parse(agent.permissions) : null,
    createdAt: agent.created_at,
    projects,
    files,
    sessions,
    ...live,
  }
})
