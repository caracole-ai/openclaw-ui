import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import { join } from 'path'

const execFileAsync = promisify(execFile)

const OPENCLAW_DIR = join(process.env.HOME || '', '.openclaw')
const SCRIPT = join(OPENCLAW_DIR, 'scripts', 'create-agent.sh')

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

  // Validate id format (lowercase, alphanumeric + hyphens)
  if (!/^[a-z][a-z0-9-]*$/.test(body.id)) {
    throw createError({ statusCode: 400, statusMessage: 'Agent id must be lowercase alphanumeric (a-z, 0-9, hyphens), starting with a letter' })
  }

  // Check if agent already exists
  try {
    const raw = await readFile(join(OPENCLAW_DIR, 'sources', 'agents.json'), 'utf-8')
    const source = JSON.parse(raw)
    if (source.agents?.some((a: any) => a.id === body.id)) {
      throw createError({ statusCode: 409, statusMessage: `Agent "${body.id}" already exists` })
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    // agents.json doesn't exist yet — fine
  }

  // Build script args
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

  try {
    const { stdout, stderr } = await execFileAsync(SCRIPT, args, {
      timeout: 30_000,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
    })

    // The script outputs JSON as its last output block
    // Extract the last JSON object from stdout
    const lines = stdout.trim().split('\n')
    let resultJson: any = null

    // Find the last valid JSON block
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const candidate = lines.slice(i).join('\n')
        resultJson = JSON.parse(candidate)
        break
      } catch {
        continue
      }
    }

    if (!resultJson?.success) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Script completed but no success result',
        data: { stdout, stderr }
      })
    }

    // Return the created agent info + config snippet for reference
    return {
      success: true,
      agent: resultJson.agent,
      mattermost: { userId: resultJson.mattermost.userId, username: resultJson.mattermost.username },
      configSnippet: resultJson.configSnippet,
      message: `Agent ${body.name} ${body.emoji} created. Apply config.patch to wire into OpenClaw gateway.`
    }

  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: 'Agent creation failed',
      data: { error: err.message, stderr: err.stderr }
    })
  }
})
