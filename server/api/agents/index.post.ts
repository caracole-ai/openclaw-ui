/**
 * POST /api/agents
 * Creates agent: workspace + MM bot + DB + openclaw.json config
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getDb } from '~/server/utils/db'

const execFileAsync = promisify(execFile)
const OPENCLAW_DIR = join(process.env.HOME || '', '.openclaw')
const SCRIPT = join(OPENCLAW_DIR, 'scripts', 'create-agent.sh')
const CONFIG_FILE = join(OPENCLAW_DIR, 'openclaw.json')

interface CreateAgentBody {
  id: string
  name: string
  emoji: string
  role: string
  team: string
  model?: string
  skills?: string[]
  projects?: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateAgentBody>(event)

  const required = ['id', 'name', 'emoji', 'role', 'team'] as const
  for (const field of required) {
    if (!body[field]) throw createError({ statusCode: 400, statusMessage: `Missing required field: ${field}` })
  }

  if (!/^[a-z][a-z0-9-]*$/.test(body.id)) {
    throw createError({ statusCode: 400, statusMessage: 'Agent id must be lowercase alphanumeric with hyphens, starting with a letter' })
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM agents WHERE id = ?').get(body.id)
  if (existing) throw createError({ statusCode: 409, statusMessage: `Agent "${body.id}" already exists` })

  // Step 1: Run create-agent.sh (workspace + MM bot)
  const args = ['--id', body.id, '--name', body.name, '--emoji', body.emoji, '--role', body.role, '--team', body.team]
  if (body.model) args.push('--model', body.model)
  if (body.skills?.length) args.push('--skills', body.skills.join(','))
  if (body.projects?.length) args.push('--projects', body.projects.join(','))

  let scriptResult: any
  try {
    const { stdout } = await execFileAsync(SCRIPT, args, {
      timeout: 30_000,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
    })
    const lines = stdout.trim().split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      try { scriptResult = JSON.parse(lines.slice(i).join('\n')); break } catch { continue }
    }
    if (!scriptResult?.success) throw new Error('Script completed but no success result')
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Agent creation script failed', data: { error: err.message } })
  }

  // Step 2: Insert into DB
  const model = body.model || 'anthropic/claude-opus-4-6'
  db.prepare(`
    INSERT INTO agents (id, name, emoji, team, role, model, workspace, status, mm_username, mm_user_id, mm_token, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'))
  `).run(body.id, body.name, body.emoji, body.team, body.role, model,
    scriptResult.configSnippet.agent.workspace,
    body.id, scriptResult.mattermost.userId, scriptResult.mattermost.token)

  // Insert skill assignments
  if (body.skills?.length) {
    const insertSkill = db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)')
    for (const s of body.skills) insertSkill.run(body.id, s)
  }

  // Step 3: Patch openclaw.json
  const snippet = scriptResult.configSnippet
  try {
    const configRaw = await readFile(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(configRaw)
    if (!config.agents) config.agents = {}
    if (!config.agents.list) config.agents.list = []
    config.agents.list.push({ id: body.id, name: body.name, workspace: snippet.agent.workspace, model, identity: { name: body.name, emoji: body.emoji } })
    if (!config.bindings) config.bindings = []
    config.bindings.push({ agentId: body.id, match: { channel: 'mattermost', accountId: body.id } })
    if (!config.channels) config.channels = {}
    if (!config.channels.mattermost) config.channels.mattermost = {}
    if (!config.channels.mattermost.accounts) config.channels.mattermost.accounts = {}
    config.channels.mattermost.accounts[body.id] = { name: `${body.name} ${body.emoji}`, botToken: scriptResult.mattermost.token }
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to patch openclaw.json', data: { error: err.message } })
  }

  // Step 4: Restart gateway
  let gatewayRestarted = false
  try {
    await execFileAsync('launchctl', ['kickstart', '-k', `gui/${process.getuid()}/ai.openclaw.gateway`], { timeout: 10_000 })
    gatewayRestarted = true
  } catch {
    try { await execFileAsync('npx', ['openclaw', 'gateway', 'restart'], { timeout: 15_000 }); gatewayRestarted = true } catch {}
  }

  // Log event
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
    `evt-${Date.now()}`, 'agent.created', 'dashboard', JSON.stringify({ agentId: body.id, name: body.name })
  )

  return {
    success: true,
    agent: { id: body.id, name: body.name, emoji: body.emoji, team: body.team, role: body.role, workspace: snippet.agent.workspace },
    mattermost: { userId: scriptResult.mattermost.userId, username: body.id },
    gatewayRestarted,
    message: `Agent ${body.name} ${body.emoji} created.${gatewayRestarted ? ' Gateway restarted.' : ' Restart gateway manually.'}`
  }
})
