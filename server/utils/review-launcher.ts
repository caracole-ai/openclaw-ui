/**
 * Review launcher — spawns Claude Code to test a built project.
 * Uses Playwright + Docker MCPs for exhaustive feature testing.
 * On success, auto-transitions project to 'delivery'.
 */
import { spawn } from 'child_process'
import { join } from 'path'
import { writeFileSync, readFileSync, openSync, existsSync, mkdirSync } from 'fs'
import { getDb } from './db'

const HOME = process.env.HOME || '/Users/caracole'
const CLAUDE_PATH = join(HOME, '.local/bin/claude')
const AUTO_BUILD_DIR = join(HOME, 'Desktop/coding-projects/AUTO-BUILD')

const runningReviews = new Map<string, { pid: number; startedAt: string }>()

interface ReviewOptions {
  projectId: string
  projectName: string
  specsPath: string
}

function generateReviewMcpJson(): string {
  return JSON.stringify({
    mcpServers: {
      context7: {
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp']
      },
      playwright: {
        command: 'npx',
        args: ['-y', '@playwright/mcp@latest']
      }
    }
  }, null, 2)
}

export function launchReview(opts: ReviewOptions): { pid: number; status: string } {
  const projectDir = join(AUTO_BUILD_DIR, opts.projectId)

  // Guard: project dir must exist (built first)
  if (!existsSync(projectDir)) {
    console.error(`[review] Project dir not found: ${projectDir}`)
    return { pid: 0, status: 'no_project_dir' }
  }

  // Guard: already running
  if (runningReviews.has(opts.projectId)) {
    const info = runningReviews.get(opts.projectId)!
    console.log(`[review] Already running for ${opts.projectId} (PID ${info.pid})`)
    return { pid: info.pid, status: 'already_running' }
  }

  // Read specs for context
  let specsContent = ''
  if (opts.specsPath && existsSync(opts.specsPath)) {
    specsContent = readFileSync(opts.specsPath, 'utf-8')
  }

  // Update .mcp.json with review MCPs (playwright for testing)
  writeFileSync(join(projectDir, '.mcp.json'), generateReviewMcpJson(), 'utf-8')

  // Log file
  const logFile = join(projectDir, 'review.log')
  const logFd = openSync(logFile, 'w')

  const prompt = `Tu es en phase de REVIEW d'un projet qui vient d'être buildé dans ce répertoire.

## Ta mission
1. Lis le CLAUDE.md pour comprendre les specs du projet
2. Installe les dépendances (npm install, pip install, etc.)
3. Lance le projet localement
4. Teste EXHAUSTIVEMENT chaque feature décrite dans les specs
5. Utilise Playwright MCP pour les tests E2E si c'est un projet web
6. Vérifie que le code compile sans erreurs
7. Vérifie que les tests unitaires passent (s'ils existent)
8. Produis un rapport de review dans review-report.md avec :
   - Liste des features testées (✅ pass / ❌ fail)
   - Bugs trouvés
   - Recommandations
   - Verdict final : PASS ou FAIL

Si tout passe → le verdict doit être PASS.
Si des features critiques échouent → le verdict doit être FAIL.

Sois rigoureux et exhaustif.`

  console.log(`[review] Spawning Claude Code review for ${opts.projectId}`)
  console.log(`[review] Project dir: ${projectDir}`)

  const child = spawn(CLAUDE_PATH, [
    '--dangerously-skip-permissions',
    '--output-format', 'stream-json',
    '-p', prompt
  ], {
    cwd: projectDir,
    env: { ...process.env },
    stdio: ['ignore', logFd, logFd],
    detached: true,
  })

  child.on('error', (err) => {
    console.error(`[review] Spawn error for ${opts.projectId}:`, err)
    runningReviews.delete(opts.projectId)
  })

  child.unref()

  const now = new Date().toISOString()
  const pid = child.pid || 0
  runningReviews.set(opts.projectId, { pid, startedAt: now })

  // Log to DB
  try {
    const db = getDb()
    db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `evt-review-${Date.now()}`, 'review.started', 'system',
      JSON.stringify({ projectId: opts.projectId, pid, projectDir }), now
    )

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(opts.projectId)
    if (project) {
      db.prepare("UPDATE projects SET document_status = 'reviewing' WHERE id = ?").run(opts.projectId)
      db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(opts.projectId, 'review', `Review lancée — tests exhaustifs (PID ${pid})`, 'review', now)
    }
  } catch (err) {
    console.error(`[review] DB logging failed:`, err)
  }

  // Exit handler: check review result and auto-transition to delivery if PASS
  child.on('exit', (code) => {
    runningReviews.delete(opts.projectId)
    const endTime = new Date().toISOString()
    const success = code === 0

    console.log(`[review] ${success ? 'Completed' : 'Failed'} for ${opts.projectId} (code ${code})`)

    // Check review-report.md for PASS/FAIL verdict
    let verdict = 'UNKNOWN'
    const reportPath = join(projectDir, 'review-report.md')
    if (existsSync(reportPath)) {
      const report = readFileSync(reportPath, 'utf-8')
      if (report.includes('PASS')) verdict = 'PASS'
      else if (report.includes('FAIL')) verdict = 'FAIL'
    }

    try {
      const db = getDb()

      db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
        `evt-review-${Date.now()}`,
        verdict === 'PASS' ? 'review.passed' : 'review.failed',
        'system',
        JSON.stringify({ projectId: opts.projectId, exitCode: code, verdict }), endTime
      )

      const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(opts.projectId)
      if (project) {
        db.prepare("UPDATE projects SET document_status = ? WHERE id = ?")
          .run(verdict === 'PASS' ? 'reviewed' : 'review_failed', opts.projectId)

        db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(opts.projectId, 'review',
            verdict === 'PASS'
              ? 'Review passée ✅ — toutes les features testées positivement. Passage en delivery.'
              : `Review échouée ❌ — verdict: ${verdict}. Corrections nécessaires.`,
            verdict === 'PASS' ? 'review' : 'error', endTime)

        // Auto-transition to delivery if PASS (via PATCH = DB + vault + hooks)
        if (verdict === 'PASS') {
          const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3333'
          fetch(`${baseUrl}/api/projects/${opts.projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: 'delivery' }),
          }).catch(err => {
            console.error(`[review] Auto-delivery trigger failed:`, err)
          })
        }
      }
    } catch (err) {
      console.error(`[review] Exit handler error:`, err)
    }
  })

  console.log(`[review] Launched for ${opts.projectId} (PID ${pid})`)
  return { pid, status: 'launched' }
}

export function getReviewStatus(projectId: string): { running: boolean; pid?: number; startedAt?: string } {
  const info = runningReviews.get(projectId)
  return info ? { running: true, ...info } : { running: false }
}
