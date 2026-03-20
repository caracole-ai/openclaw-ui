/**
 * Pipeline launcher — spawns pipeline.py as a detached subprocess.
 * Fire-and-forget: the pipeline runs independently (5-10 min).
 *
 * Broadcasting on completion is handled automatically by the
 * source-watcher plugin (it detects new/changed spec files in the vault).
 */
import { spawn } from 'child_process'
import { join } from 'path'
import { getDb } from './db'
import { broadcastDataUpdate } from '../plugins/source-watcher'

const HOME = process.env.HOME || '/Users/caracole'
const ORCHESTRATOR_DIR = join(HOME, 'Desktop/coding-projects/mattermost-orchestrator')
const PIPELINE_SCRIPT = join(ORCHESTRATOR_DIR, 'pipeline.py')
const PYTHON_PATH = join(ORCHESTRATOR_DIR, 'venv/bin/python')

// Track running pipelines to prevent duplicates
const runningPipelines = new Map<string, { pid: number; startedAt: string }>()

interface LaunchOptions {
  projectId: string
  projectName: string
  ideaVaultPath: string
  agentIds?: string[]
  budget?: number
}

export function launchPipeline(opts: LaunchOptions): { pid: number; status: string } {
  // Guard: already running
  if (runningPipelines.has(opts.projectId)) {
    const info = runningPipelines.get(opts.projectId)!
    console.log(`[pipeline] Already running for ${opts.projectId} (PID ${info.pid})`)
    return { pid: info.pid, status: 'already_running' }
  }

  const agents = opts.agentIds?.length ? opts.agentIds : ['winston', 'amelia', 'manolo']
  const args = [PIPELINE_SCRIPT, opts.ideaVaultPath, '--agents', ...agents]
  if (opts.budget) args.push('--budget', String(opts.budget))

  const child = spawn(PYTHON_PATH, args, {
    cwd: ORCHESTRATOR_DIR,
    env: { ...process.env },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.unref()

  const now = new Date().toISOString()
  const pid = child.pid || 0
  runningPipelines.set(opts.projectId, { pid, startedAt: now })

  // Log start event in DB
  const db = getDb()
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `evt-pipeline-${Date.now()}`,
    'pipeline.started',
    'system',
    JSON.stringify({ projectId: opts.projectId, projectName: opts.projectName, agents, pid }),
    now
  )

  db.prepare("UPDATE projects SET document_status = 'in_progress', updated_at = ? WHERE id = ?")
    .run(now, opts.projectId)

  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(opts.projectId, 'pipeline', `Pipeline lancé — agents: ${agents.join(', ')}`, 'pipeline', now)

  console.log(`[pipeline] Launched for ${opts.projectId} (PID ${pid}, agents: ${agents.join(', ')})`)

  // Broadcast start to connected UI clients
  broadcastDataUpdate()

  // Capture trailing output for diagnostics
  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', (d: Buffer) => { stdout = (stdout + d.toString()).slice(-2000) })
  child.stderr?.on('data', (d: Buffer) => { stderr = (stderr + d.toString()).slice(-2000) })

  // Cleanup on exit — DB writes only, no broadcast needed
  // (the source-watcher detects new spec files and broadcasts automatically)
  child.on('exit', (code) => {
    runningPipelines.delete(opts.projectId)
    const endTime = new Date().toISOString()
    const success = code === 0

    try {
      const db = getDb()

      db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
        `evt-pipeline-${Date.now()}`,
        success ? 'pipeline.completed' : 'pipeline.failed',
        'system',
        JSON.stringify({ projectId: opts.projectId, exitCode: code, output: stdout.slice(-500) }),
        endTime
      )

      db.prepare('UPDATE projects SET document_status = ?, updated_at = ? WHERE id = ?')
        .run(success ? 'completed' : 'pending', endTime, opts.projectId)

      db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(
          opts.projectId,
          'pipeline',
          success
            ? `Pipeline terminé — specs générées par ${agents.join(', ')}.`
            : `Pipeline échoué (code ${code}). ${stderr.slice(-200)}`,
          success ? 'pipeline' : 'error',
          endTime
        )
    } catch (err) {
      console.error(`[pipeline] Cleanup error for ${opts.projectId}:`, err)
    }

    console.log(`[pipeline] ${success ? 'Completed' : 'Failed'} for ${opts.projectId} (code ${code})`)
  })

  return { pid, status: 'launched' }
}

export function getPipelineStatus(projectId: string): { running: boolean; pid?: number; startedAt?: string } {
  const info = runningPipelines.get(projectId)
  return info ? { running: true, ...info } : { running: false }
}
