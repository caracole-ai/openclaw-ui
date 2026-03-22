/**
 * Pipeline launcher — spawns the correct Python pipeline as a detached subprocess.
 * Fire-and-forget: the pipeline runs independently (5-10 min).
 *
 * Two pipeline types:
 *   - 'incubation' → incubation_pipeline.py (6 agents, 3 phases, idea → project)
 *   - 'specs'      → pipeline.py            (3 agents, 5 rounds, project → specs)
 *
 * The `type` field is REQUIRED to prevent routing errors.
 *
 * Broadcasting on completion is handled automatically by the
 * source-watcher plugin (it detects new/changed spec files in the vault).
 */
import { spawn } from 'child_process'
import { join } from 'path'
import { openSync } from 'fs'
import { getDb } from './db'

const HOME = process.env.HOME || '/Users/caracole'
const ORCHESTRATOR_DIR = join(HOME, 'Desktop/coding-projects/mattermost-orchestrator')
const PYTHON_PATH = join(ORCHESTRATOR_DIR, 'venv/bin/python')

/**
 * Pipeline type determines which Python script runs and which agents are used.
 * - 'incubation': idea → project  (incubation_pipeline.py, team incubation)
 * - 'specs':      project → specs (pipeline.py, team code)
 */
type PipelineType = 'incubation' | 'specs'

const PIPELINE_CONFIG: Record<PipelineType, { script: string; defaultAgents: string[]; label: string }> = {
  incubation: {
    script: join(ORCHESTRATOR_DIR, 'incubation_pipeline.py'),
    defaultAgents: ['iris', 'hugo', 'stella', 'felix', 'remi', 'gaelle'],
    label: 'Incubation (idea → project)',
  },
  specs: {
    script: join(ORCHESTRATOR_DIR, 'pipeline.py'),
    defaultAgents: ['winston', 'amelia', 'walid'],
    label: 'Specs (project → specs)',
  },
}

// Track running pipelines to prevent duplicates
const runningPipelines = new Map<string, { pid: number; startedAt: string; type: PipelineType }>()

interface LaunchOptions {
  /** REQUIRED — determines which pipeline script + default agents to use */
  type: PipelineType
  projectId: string
  projectName: string
  ideaVaultPath: string
  agentIds?: string[]
  budget?: number
}

export function launchPipeline(opts: LaunchOptions): { pid: number; status: string } {
  // Guard: no idea path
  if (!opts.ideaVaultPath) {
    console.error(`[pipeline] No idea vault path for ${opts.projectId} — skipping`)
    return { pid: 0, status: 'no_idea_path' }
  }

  // Guard: already running
  if (runningPipelines.has(opts.projectId)) {
    const info = runningPipelines.get(opts.projectId)!
    console.log(`[pipeline] Already running for ${opts.projectId} (PID ${info.pid}, type ${info.type})`)
    return { pid: info.pid, status: 'already_running' }
  }

  const pipelineConf = PIPELINE_CONFIG[opts.type]
  const agents = opts.agentIds?.length ? opts.agentIds : pipelineConf.defaultAgents
  const args = [pipelineConf.script, opts.ideaVaultPath]

  // incubation_pipeline.py doesn't take --agents (fixed team), specs pipeline does
  if (opts.type === 'specs') {
    args.push('--agents', ...agents)
  }
  if (opts.budget) args.push('--budget', String(opts.budget))

  // Redirect stdout/stderr to a log file so the detached process can write logs
  const logFile = join(ORCHESTRATOR_DIR, `pipeline-${opts.projectId}.log`)
  const logFd = openSync(logFile, 'w')

  console.log(`[pipeline] Type: ${opts.type} (${pipelineConf.label})`)
  console.log(`[pipeline] Spawning: ${PYTHON_PATH} ${args.join(' ')}`)
  console.log(`[pipeline] Log file: ${logFile}`)

  // Load the orchestrator's .env and merge with process.env
  const dotenvPath = join(ORCHESTRATOR_DIR, '.env')
  const envOverrides: Record<string, string> = {}
  try {
    const { readFileSync: readF } = require('fs')
    const lines = readF(dotenvPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        envOverrides[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
      }
    }
  } catch {}

  const child = spawn(PYTHON_PATH, args, {
    cwd: ORCHESTRATOR_DIR,
    env: { ...process.env, ...envOverrides },
    stdio: ['ignore', logFd, logFd],
    detached: true,
  })

  child.on('error', (err) => {
    console.error(`[pipeline] Spawn error for ${opts.projectId}:`, err)
    runningPipelines.delete(opts.projectId)
  })

  child.unref()

  const now = new Date().toISOString()
  const pid = child.pid || 0
  runningPipelines.set(opts.projectId, { pid, startedAt: now, type: opts.type })

  // Log start event in DB
  try {
    const db = getDb()
    db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `evt-pipeline-${Date.now()}`,
      'pipeline.started',
      'system',
      JSON.stringify({ projectId: opts.projectId, projectName: opts.projectName, type: opts.type, agents, pid }),
      now
    )

    // Only update project if it exists in DB
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(opts.projectId)
    if (project) {
      db.prepare("UPDATE projects SET document_status = 'in_progress' WHERE id = ?").run(opts.projectId)
      db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(opts.projectId, 'pipeline', `Pipeline ${opts.type} lancé — agents: ${agents.join(', ')}`, 'pipeline', now)
    }
  } catch (err) {
    console.error(`[pipeline] DB logging failed:`, err)
  }

  console.log(`[pipeline] Launched ${opts.type} for ${opts.projectId} (PID ${pid}, agents: ${agents.join(', ')})`)

  // With stdio: 'ignore' + detached + unref, the child runs fully independently.
  // The exit handler won't fire reliably, so we DON'T track completion here.
  // The vault-watcher will detect the new specs file and update the UI automatically.

  return { pid, status: 'launched' }
}

export function getPipelineStatus(projectId: string): { running: boolean; pid?: number; startedAt?: string } {
  const info = runningPipelines.get(projectId)
  return info ? { running: true, ...info } : { running: false }
}
