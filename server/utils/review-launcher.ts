/**
 * Review launcher — spawns Claude Code to test a built project.
 * Implements review rounds (max 5): on FAIL, spawns fix agent then re-reviews.
 * On PASS or 5 rounds exhausted, auto-transitions to delivery.
 *
 * Uses direct function calls instead of self-PATCH to avoid port mismatch issues.
 */
import { spawn } from 'child_process'
import { join } from 'path'
import { writeFileSync, readFileSync, openSync, existsSync, unlinkSync } from 'fs'
import { getDb } from './db'
import { transitionProjectState } from './project-transitions'

const HOME = process.env.HOME || '/Users/caracole'
const CLAUDE_PATH = join(HOME, '.local/bin/claude')
const AUTO_BUILD_DIR = join(HOME, 'Desktop/coding-projects/AUTO-BUILD')
const MAX_REVIEW_ROUNDS = 5

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

function getReviewRound(projectId: string): number {
  const db = getDb()
  const row = db.prepare('SELECT review_round FROM projects WHERE id = ?').get(projectId) as { review_round: number } | undefined
  return row?.review_round || 0
}

function incrementReviewRound(projectId: string): number {
  const db = getDb()
  const current = getReviewRound(projectId)
  const next = current + 1
  db.prepare('UPDATE projects SET review_round = ? WHERE id = ?').run(next, projectId)
  return next
}

function readErrorContext(projectDir: string): any | null {
  const path = join(projectDir, 'error-context.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function updateErrorContext(projectDir: string, round: number, reviewErrors: string): void {
  const existing = readErrorContext(projectDir) || {
    stage: 'review',
    attempt: 0,
    timestamp: new Date().toISOString(),
    package_manager: 'unknown',
    errors: [],
    previous_fixes: [],
  }

  existing.stage = 'review'
  existing.attempt = round
  existing.timestamp = new Date().toISOString()
  existing.previous_fixes.push(`Review round ${round}: ${reviewErrors.slice(0, 200)}`)

  writeFileSync(join(projectDir, 'error-context.json'), JSON.stringify(existing, null, 2), 'utf-8')
}

/**
 * Clear stale error-context.json when starting a fresh review cycle.
 */
function clearStaleErrorContext(projectDir: string): void {
  const errorCtxPath = join(projectDir, 'error-context.json')
  if (existsSync(errorCtxPath)) {
    try { unlinkSync(errorCtxPath) } catch {}
    console.log(`[review] Cleared stale error-context.json`)
  }
}

function generateRemainingAudit(projectDir: string, projectId: string): void {
  const reportPath = join(projectDir, 'review-report.md')
  const errorCtx = readErrorContext(projectDir)

  let content = `# Remaining Audit — ${projectId}\n\n`
  content += `> Livré après ${MAX_REVIEW_ROUNDS} rounds de review sans PASS complet.\n\n`

  if (existsSync(reportPath)) {
    const report = readFileSync(reportPath, 'utf-8')
    const failLines = report.split('\n').filter(l => l.includes('❌') || l.includes('FAIL'))
    if (failLines.length > 0) {
      content += `## Issues non résolues\n\n${failLines.join('\n')}\n\n`
    }
  }

  if (errorCtx?.previous_fixes?.length) {
    content += `## Historique des corrections tentées\n\n`
    content += errorCtx.previous_fixes.map((f: string) => `- ${f}`).join('\n')
    content += '\n\n'
  }

  content += `## Recommandation\n\nIntervention manuelle requise pour résoudre les issues restantes avant mise en production.\n`
  writeFileSync(join(projectDir, 'remaining-audit.md'), content, 'utf-8')
}

/**
 * Extract useful error info for the fix agent prompt.
 * Falls back to review.log if review-report.md is empty/missing.
 */
function extractFixContext(projectDir: string, reportContent: string): string {
  // Try review-report.md first
  const failLines = reportContent.split('\n')
    .filter(l => l.includes('❌') || l.includes('FAIL') || l.includes('Bug') || l.includes('bug') || l.includes('Error') || l.includes('error'))
    .slice(0, 30)
    .join('\n')

  if (failLines.trim()) return failLines

  // Fallback: extract errors from review.log (Claude Code JSONL output)
  const reviewLogPath = join(projectDir, 'review.log')
  if (existsSync(reviewLogPath)) {
    try {
      const logContent = readFileSync(reviewLogPath, 'utf-8')
      const errorLines = logContent.split('\n')
        .filter(l => {
          try {
            const parsed = JSON.parse(l)
            // Look for tool_use results with errors
            return parsed.type === 'result' && parsed.result?.includes?.('Error')
              || parsed.type === 'assistant' && parsed.message?.content?.toString().includes('Error')
          } catch {
            // Not JSON — check raw text
            return /error|Error|FAIL|Cannot|not found/i.test(l)
          }
        })
        .slice(0, 20)
        .join('\n')

      if (errorLines.trim()) return errorLines
    } catch {}
  }

  // Last fallback: error-context.json from validation gate
  const errorCtx = readErrorContext(projectDir)
  if (errorCtx?.errors?.length) {
    return errorCtx.errors
      .map((e: any) => `- ${e.step}: ${e.command} failed — ${e.stderr_lines?.slice(0, 3).join('; ')}`)
      .join('\n')
  }

  return 'Le build ou les tests échouent. Lis les logs, identifie les erreurs, et corrige-les.'
}

function spawnReviewFixAgent(projectDir: string, round: number, reportContent: string): Promise<number> {
  return new Promise((resolve) => {
    const fixContext = extractFixContext(projectDir, reportContent)

    const errorCtx = readErrorContext(projectDir)
    const previousFixes = errorCtx?.previous_fixes?.length
      ? `\n\n## Corrections déjà tentées (NE PAS refaire)\n${errorCtx.previous_fixes.map((f: string) => `- ${f}`).join('\n')}`
      : ''

    const prompt = `Tu es en mode FIX après un round de review (round ${round}/${MAX_REVIEW_ROUNDS}).

## Problèmes identifiés par la review

${fixContext}
${previousFixes}

## Règles

1. Corrige les bugs et erreurs identifiés dans le rapport
2. Assure-toi que \`npm run build\` et \`npm test\` passent après tes corrections
3. Ne refactore pas au-delà de ce qui est nécessaire pour corriger
4. Lis le CLAUDE.md pour le contexte des specs si nécessaire

Après correction, vérifie que le projet compile et que les tests passent.`

    const logFile = join(projectDir, `review-fix-round-${round}.log`)
    const logFd = openSync(logFile, 'w')

    console.log(`[review] Spawning fix agent for round ${round}`)

    const child = spawn(CLAUDE_PATH, [
      '--dangerously-skip-permissions',
      '--verbose',
      '--output-format', 'stream-json',
      '-p', prompt,
    ], {
      cwd: projectDir,
      env: { ...process.env },
      stdio: ['ignore', logFd, logFd],
      detached: true,
    })

    child.unref()
    child.on('error', (err) => {
      console.error(`[review] Fix agent spawn error:`, err)
      resolve(1)
    })
    child.on('exit', (code) => {
      console.log(`[review] Fix agent exited (code ${code}) for round ${round}`)
      resolve(code || 0)
    })
  })
}

/**
 * Force delivery after max rounds. Direct DB + vault update, no self-PATCH.
 */
function forceDelivery(projectId: string, projectDir: string): void {
  const endTime = new Date().toISOString()
  const db = getDb()

  generateRemainingAudit(projectDir, projectId)

  db.prepare("UPDATE projects SET document_status = 'reviewed_with_caveats' WHERE id = ?").run(projectId)
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `evt-review-${Date.now()}`, 'review.force_delivery', 'system',
    JSON.stringify({ projectId, rounds: MAX_REVIEW_ROUNDS }), endTime
  )
  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, 'review',
      `Limite ${MAX_REVIEW_ROUNDS} rounds atteinte ⚠️ — livraison forcée avec remaining-audit.md`,
      'review', endTime)

  // Direct transition — no self-PATCH
  transitionProjectState(projectId, 'delivery', { document_status: 'reviewed_with_caveats' })
}

export function launchReview(opts: ReviewOptions): { pid: number; status: string } {
  const projectDir = join(AUTO_BUILD_DIR, opts.projectId)

  if (!existsSync(projectDir)) {
    console.error(`[review] Project dir not found: ${projectDir}`)
    return { pid: 0, status: 'no_project_dir' }
  }

  if (runningReviews.has(opts.projectId)) {
    const info = runningReviews.get(opts.projectId)!
    console.log(`[review] Already running for ${opts.projectId} (PID ${info.pid})`)
    return { pid: info.pid, status: 'already_running' }
  }

  const currentRound = getReviewRound(opts.projectId)

  // Clear stale state on first round
  if (currentRound === 0) {
    clearStaleErrorContext(projectDir)
  }

  if (currentRound >= MAX_REVIEW_ROUNDS) {
    console.log(`[review] Max rounds reached for ${opts.projectId} — forcing delivery`)
    forceDelivery(opts.projectId, projectDir)
    return { pid: 0, status: 'force_delivery' }
  }

  const round = incrementReviewRound(opts.projectId)

  // Check if build is unstable (from validation gate)
  const db = getDb()
  const project = db.prepare('SELECT document_status FROM projects WHERE id = ?').get(opts.projectId) as { document_status: string } | undefined
  const isUnstable = project?.document_status === 'build_unstable'

  const unstableWarning = isUnstable
    ? `\n\n⚠️ ATTENTION : ce build est marqué comme INSTABLE. La validation gate (install + build + test) a échoué après 3 tentatives de fix. Consulte error-context.json pour le détail des erreurs. Priorise la résolution des erreurs de compilation avant de tester les features.`
    : ''

  writeFileSync(join(projectDir, '.mcp.json'), generateReviewMcpJson(), 'utf-8')

  const logFile = join(projectDir, 'review.log')
  const logFd = openSync(logFile, 'w')

  const prompt = `Tu es en phase de REVIEW d'un projet qui vient d'être buildé dans ce répertoire.
Round ${round}/${MAX_REVIEW_ROUNDS}.${unstableWarning}

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

  console.log(`[review] Spawning Claude Code review for ${opts.projectId} (round ${round}/${MAX_REVIEW_ROUNDS})`)
  console.log(`[review] Project dir: ${projectDir}`)

  const child = spawn(CLAUDE_PATH, [
    '--dangerously-skip-permissions',
    '--verbose',
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

  try {
    db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `evt-review-${Date.now()}`, 'review.started', 'system',
      JSON.stringify({ projectId: opts.projectId, pid, projectDir, round }), now
    )
    db.prepare("UPDATE projects SET document_status = 'reviewing' WHERE id = ?").run(opts.projectId)
    db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(opts.projectId, 'review', `Review round ${round}/${MAX_REVIEW_ROUNDS} lancée — tests exhaustifs (PID ${pid})`, 'review', now)
  } catch (err) {
    console.error(`[review] DB logging failed:`, err)
  }

  // Exit handler
  child.on('exit', async (code) => {
    runningReviews.delete(opts.projectId)
    const endTime = new Date().toISOString()

    console.log(`[review] ${code === 0 ? 'Completed' : 'Failed'} for ${opts.projectId} (code ${code}, round ${round})`)

    let verdict = 'UNKNOWN'
    const reportPath = join(projectDir, 'review-report.md')
    let reportContent = ''
    if (existsSync(reportPath)) {
      reportContent = readFileSync(reportPath, 'utf-8')
      if (reportContent.includes('PASS')) verdict = 'PASS'
      else if (reportContent.includes('FAIL')) verdict = 'FAIL'
    }

    try {
      const db = getDb()

      db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
        `evt-review-${Date.now()}`,
        verdict === 'PASS' ? 'review.passed' : 'review.failed',
        'system',
        JSON.stringify({ projectId: opts.projectId, exitCode: code, verdict, round }), endTime
      )

      if (verdict === 'PASS') {
        db.prepare("UPDATE projects SET document_status = 'reviewed' WHERE id = ?").run(opts.projectId)
        db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(opts.projectId, 'review',
            `Review passée ✅ (round ${round}) — toutes les features testées positivement. Passage en delivery.`,
            'review', endTime)

        // Direct transition — no self-PATCH
        transitionProjectState(opts.projectId, 'delivery', { document_status: 'reviewed' })

      } else if (round >= MAX_REVIEW_ROUNDS) {
        console.log(`[review] Max rounds (${MAX_REVIEW_ROUNDS}) reached — forcing delivery`)
        forceDelivery(opts.projectId, projectDir)

      } else {
        db.prepare("UPDATE projects SET document_status = 'review_failed' WHERE id = ?").run(opts.projectId)
        db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(opts.projectId, 'review',
            `Review échouée ❌ (round ${round}/${MAX_REVIEW_ROUNDS}) — verdict: ${verdict}. Lancement du fix agent.`,
            'error', endTime)

        const failSummary = reportContent.split('\n')
          .filter(l => l.includes('❌') || l.includes('FAIL'))
          .slice(0, 5)
          .join('; ')
        updateErrorContext(projectDir, round, failSummary || 'Review FAIL — see review-report.md')

        console.log(`[review] Spawning fix agent then re-review for round ${round + 1}`)
        await spawnReviewFixAgent(projectDir, round, reportContent)

        // Direct re-launch — no self-PATCH
        launchReview({
          projectId: opts.projectId,
          projectName: opts.projectName,
          specsPath: opts.specsPath,
        })
      }
    } catch (err) {
      console.error(`[review] Exit handler error:`, err)
    }
  })

  console.log(`[review] Launched for ${opts.projectId} (PID ${pid}, round ${round})`)
  return { pid, status: 'launched' }
}

export function getReviewStatus(projectId: string): { running: boolean; pid?: number; startedAt?: string; round?: number } {
  const info = runningReviews.get(projectId)
  if (!info) return { running: false }
  return { running: true, ...info, round: getReviewRound(projectId) }
}
