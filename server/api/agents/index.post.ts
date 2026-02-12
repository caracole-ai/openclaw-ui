import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

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

  // Validate required fields
  const required = ['id', 'name', 'emoji', 'role', 'team'] as const
  for (const field of required) {
    if (!body[field]) {
      throw createError({ statusCode: 400, statusMessage: `Missing required field: ${field}` })
    }
  }

  // Validate id format
  if (!/^[a-z][a-z0-9-]*$/.test(body.id)) {
    throw createError({ statusCode: 400, statusMessage: 'Agent id must be lowercase alphanumeric (a-z, 0-9, hyphens), starting with a letter' })
  }

  // Check if agent already exists in sources
  const agentsJsonPath = join(OPENCLAW_DIR, 'sources', 'agents.json')
  try {
    const raw = await readFile(agentsJsonPath, 'utf-8')
    const source = JSON.parse(raw)
    if (source.agents?.some((a: any) => a.id === body.id)) {
      throw createError({ statusCode: 409, statusMessage: `Agent "${body.id}" already exists` })
    }
  } catch (err: any) {
    if (err.statusCode) throw err
  }

  // ─── Step 1: Run create-agent.sh (workspace + MM bot + agents.json) ───
  const args = [
    '--id', body.id,
    '--name', body.name,
    '--emoji', body.emoji,
    '--role', body.role,
    '--team', body.team,
  ]
  if (body.model) args.push('--model', body.model)
  if (body.skills?.length) args.push('--skills', body.skills.join(','))
  if (body.projects?.length) args.push('--projects', body.projects.join(','))

  let scriptResult: any
  try {
    const { stdout, stderr } = await execFileAsync(SCRIPT, args, {
      timeout: 30_000,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
    })

    // Extract last JSON block from stdout
    const lines = stdout.trim().split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        scriptResult = JSON.parse(lines.slice(i).join('\n'))
        break
      } catch { continue }
    }

    if (!scriptResult?.success) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Script completed but no success result',
        data: { stdout, stderr }
      })
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: 'Agent creation script failed',
      data: { error: err.message, stderr: err.stderr }
    })
  }

  // ─── Step 2: Patch openclaw.json (agents.list + bindings + MM accounts) ───
  const snippet = scriptResult.configSnippet
  try {
    const configRaw = await readFile(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(configRaw)

    // Add to agents.list
    if (!config.agents) config.agents = {}
    if (!config.agents.list) config.agents.list = []
    config.agents.list.push({
      id: body.id,
      name: body.name,
      workspace: snippet.agent.workspace,
      model: body.model || 'anthropic/claude-opus-4-6',
      identity: { name: body.name, emoji: body.emoji }
    })

    // Add to bindings
    if (!config.bindings) config.bindings = []
    config.bindings.push({
      agentId: body.id,
      match: { channel: 'mattermost', accountId: body.id }
    })

    // Add to mattermost accounts
    if (!config.channels) config.channels = {}
    if (!config.channels.mattermost) config.channels.mattermost = {}
    if (!config.channels.mattermost.accounts) config.channels.mattermost.accounts = {}
    config.channels.mattermost.accounts[body.id] = {
      name: `${body.name} ${body.emoji}`,
      botToken: scriptResult.mattermost.token
    }

    // Write config
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to patch openclaw.json',
      data: { error: err.message }
    })
  }

  // ─── Step 3: Restart gateway ───
  let gatewayRestarted = false
  try {
    await execFileAsync('launchctl', ['kickstart', '-k', 'gui/' + process.getuid() + '/ai.openclaw.gateway'], { timeout: 10_000 })
    gatewayRestarted = true
  } catch {
    // Try alternative restart
    try {
      await execFileAsync('npx', ['openclaw', 'gateway', 'restart'], { timeout: 15_000 })
      gatewayRestarted = true
    } catch { /* non-blocking */ }
  }

  return {
    success: true,
    agent: {
      id: body.id,
      name: body.name,
      emoji: body.emoji,
      team: body.team,
      role: body.role,
      workspace: snippet.agent.workspace,
    },
    mattermost: {
      userId: scriptResult.mattermost.userId,
      username: body.id,
    },
    gatewayRestarted,
    message: `Agent ${body.name} ${body.emoji} created and wired into OpenClaw.${gatewayRestarted ? ' Gateway restarted.' : ' Restart gateway manually to activate.'}`
  }
})
