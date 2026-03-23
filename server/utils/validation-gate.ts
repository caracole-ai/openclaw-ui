/**
 * Validation Gate — mechanical verification after build completes.
 * Runs install + build + test independently. If any fails, spawns Claude Code
 * in "fix" mode (max 3 attempts). Only transitions to review once validated.
 *
 * Uses direct function calls instead of self-PATCH to avoid port mismatch issues.
 */
import { spawn, execSync } from 'child_process'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, openSync } from 'fs'
import { getDb } from './db'
import { transitionProjectState } from './project-transitions'
import { launchReview } from './review-launcher'

const HOME = process.env.HOME || '/Users/caracole'
const CLAUDE_PATH = join(HOME, '.local/bin/claude')
const AUTO_BUILD_DIR = join(HOME, 'Desktop/coding-projects/AUTO-BUILD')
const MAX_FIX_ATTEMPTS = 3
const COMMAND_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes per command

interface ValidationOptions {
  projectId: string
  projectName: string
  specsPath?: string
}

interface ValidationError {
  step: string
  command: string
  exit_code: number
  stderr_lines: string[]
  category: string
}

interface ErrorContext {
  stage: string
  attempt: number
  timestamp: string
  package_manager: string
  errors: ValidationError[]
  previous_fixes: string[]
}

function detectPackageManager(projectDir: string): { name: string; install: string; build: string; test: string } {
  if (existsSync(join(projectDir, 'pnpm-lock.yaml')) || existsSync(join(projectDir, 'pnpm-workspace.yaml'))) {
    return { name: 'pnpm', install: 'pnpm install', build: 'pnpm run build', test: 'pnpm test' }
  }
  if (existsSync(join(projectDir, 'yarn.lock'))) {
    return { name: 'yarn', install: 'yarn install', build: 'yarn build', test: 'yarn test' }
  }
  return { name: 'npm', install: 'npm install', build: 'npm run build', test: 'npm test' }
}

function runCommand(cmd: string, cwd: string): { ok: boolean; stderr: string; exitCode: number } {
  try {
    execSync(cmd, {
      cwd,
      timeout: COMMAND_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true' },
    })
    return { ok: true, stderr: '', exitCode: 0 }
  } catch (err: any) {
    const stderr = err.stderr?.toString() || err.message || 'Unknown error'
    const exitCode = err.status || 1
    return { ok: false, stderr, exitCode }
  }
}

function categorizeError(stderr: string): string {
  if (stderr.includes('MODULE_NOT_FOUND') || stderr.includes('Cannot find module')) return 'missing_dependency'
  if (stderr.includes('SyntaxError') || stderr.includes('Unexpected token')) return 'syntax_error'
  if (stderr.includes('TypeError') || stderr.includes('is not a function')) return 'type_error'
  if (stderr.includes('ENOENT')) return 'file_not_found'
  if (stderr.includes('EACCES') || stderr.includes('permission denied')) return 'permission_error'
  if (stderr.includes('test') || stderr.includes('FAIL') || stderr.includes('fail')) return 'test_failure'
  return 'unknown'
}

function extractStderrLines(stderr: string): string[] {
  const lines = stderr.split('\n').filter(l => l.trim())
  const errorLines = lines.filter(l =>
    /error|Error|FAIL|fail|Cannot|not found|MODULE_NOT_FOUND/i.test(l)
  )
  if (errorLines.length > 0) return errorLines.slice(0, 30)
  return lines.slice(-30)
}

function writeErrorContext(projectDir: string, ctx: ErrorContext): void {
  writeFileSync(join(projectDir, 'error-context.json'), JSON.stringify(ctx, null, 2), 'utf-8')
}

function readErrorContext(projectDir: string): ErrorContext | null {
  const path = join(projectDir, 'error-context.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function runValidation(projectDir: string, pm: ReturnType<typeof detectPackageManager>): ValidationError[] {
  const errors: ValidationError[] = []
  const steps = [
    { name: 'install', cmd: pm.install },
    { name: 'build', cmd: pm.build },
    { name: 'test', cmd: pm.test },
  ]

  for (const step of steps) {
    console.log(`[validation] Running ${step.cmd} in ${projectDir}`)
    const result = runCommand(step.cmd, projectDir)
    if (!result.ok) {
      errors.push({
        step: step.name,
        command: step.cmd,
        exit_code: result.exitCode,
        stderr_lines: extractStderrLines(result.stderr),
        category: categorizeError(result.stderr),
      })
      break // Stop on first failure
    }
    console.log(`[validation] ${step.name} passed`)
  }

  return errors
}

function spawnFixAgent(projectDir: string, errorContext: ErrorContext): Promise<number> {
  return new Promise((resolve) => {
    const errorSummary = errorContext.errors
      .map(e => `- ${e.step}: \`${e.command}\` failed (exit ${e.exit_code})\n  ${e.stderr_lines.slice(0, 10).join('\n  ')}`)
      .join('\n\n')

    const previousFixes = errorContext.previous_fixes.length > 0
      ? `\n\n## Corrections déjà tentées (NE PAS refaire)\n${errorContext.previous_fixes.map(f => `- ${f}`).join('\n')}`
      : ''

    const prompt = `Tu es en mode FIX. Le build du projet a échoué à la validation mécanique.

## Erreurs à corriger

${errorSummary}
${previousFixes}

## Règles

1. Corrige UNIQUEMENT les erreurs listées ci-dessus
2. Ne refactore pas le code existant
3. Ne change pas l'architecture
4. Après correction, vérifie que les commandes suivantes passent :
   - \`${errorContext.package_manager} install\` (si erreur d'install)
   - \`${errorContext.package_manager} run build\` (si erreur de build)
   - \`${errorContext.package_manager} test\` (si erreur de test)
5. Si une dépendance manque, installe-la avec le bon package manager (${errorContext.package_manager})

Lis le CLAUDE.md pour le contexte du projet si nécessaire.`

    const logFile = join(projectDir, `fix-attempt-${errorContext.attempt}.log`)
    const logFd = openSync(logFile, 'w')

    console.log(`[validation] Spawning fix agent (attempt ${errorContext.attempt})`)

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
      console.error(`[validation] Fix agent spawn error:`, err)
      resolve(1)
    })
    child.on('exit', (code) => {
      console.log(`[validation] Fix agent exited (code ${code})`)
      resolve(code || 0)
    })
  })
}

/**
 * Resolve specs path for a project (subfolder convention then flat).
 */
function resolveSpecsPath(projectId: string): string {
  const vaultBase = join(HOME, 'Documents/ObsidianVault')
  const subfolder = join(vaultBase, 'Projets', projectId, 'specs.md')
  if (existsSync(subfolder)) return subfolder
  const flat = join(vaultBase, 'Projets', `${projectId}-specs.md`)
  if (existsSync(flat)) return flat
  return ''
}

/**
 * Main entry point: validates the build, runs fix loop if needed, then transitions to review.
 * Uses direct function calls — no self-PATCH.
 */
export async function launchValidationGate(opts: ValidationOptions): Promise<void> {
  const projectDir = join(AUTO_BUILD_DIR, opts.projectId)

  if (!existsSync(projectDir)) {
    console.error(`[validation] Project dir not found: ${projectDir}`)
    return
  }

  const pm = detectPackageManager(projectDir)
  console.log(`[validation] Detected package manager: ${pm.name}`)

  const db = getDb()
  const project = db.prepare('SELECT build_attempt FROM projects WHERE id = ?').get(opts.projectId) as { build_attempt: number } | undefined
  let attempt = (project?.build_attempt || 0)

  // Log start
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `evt-validation-${Date.now()}`, 'validation.started', 'system',
    JSON.stringify({ projectId: opts.projectId, attempt }), new Date().toISOString()
  )
  db.prepare("UPDATE projects SET document_status = 'validating' WHERE id = ?").run(opts.projectId)
  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(opts.projectId, 'validation', `Validation gate lancée (${pm.name} install + build + test)`, 'build', new Date().toISOString())

  const existingCtx = readErrorContext(projectDir)
  const previousFixes: string[] = existingCtx?.previous_fixes || []

  // Validation + fix loop
  while (attempt < MAX_FIX_ATTEMPTS) {
    const errors = runValidation(projectDir, pm)

    if (errors.length === 0) {
      console.log(`[validation] All checks passed for ${opts.projectId}`)

      db.prepare("UPDATE projects SET document_status = 'validated', build_attempt = ? WHERE id = ?")
        .run(attempt, opts.projectId)
      db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
        `evt-validation-${Date.now()}`, 'validation.passed', 'system',
        JSON.stringify({ projectId: opts.projectId, attempt }), new Date().toISOString()
      )
      db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(opts.projectId, 'validation', `Validation gate passée ✅ (attempt ${attempt}). Transition vers review.`, 'build', new Date().toISOString())

      // Direct transition — no self-PATCH
      transitionProjectState(opts.projectId, 'review', { document_status: 'validated' })
      launchReview({
        projectId: opts.projectId,
        projectName: opts.projectName,
        specsPath: opts.specsPath || resolveSpecsPath(opts.projectId),
      })
      return
    }

    // Validation failed
    attempt++
    const errorCtx: ErrorContext = {
      stage: 'validation_gate',
      attempt,
      timestamp: new Date().toISOString(),
      package_manager: pm.name,
      errors,
      previous_fixes: previousFixes,
    }

    writeErrorContext(projectDir, errorCtx)

    db.prepare("UPDATE projects SET build_attempt = ? WHERE id = ?").run(attempt, opts.projectId)
    db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(opts.projectId, 'validation',
        `Validation échouée (attempt ${attempt}/${MAX_FIX_ATTEMPTS}) : ${errors.map(e => `${e.step} → ${e.category}`).join(', ')}`,
        'error', new Date().toISOString())

    if (attempt >= MAX_FIX_ATTEMPTS) break

    console.log(`[validation] Spawning fix agent (attempt ${attempt}/${MAX_FIX_ATTEMPTS})`)
    await spawnFixAgent(projectDir, errorCtx)
    previousFixes.push(`Attempt ${attempt}: fixed ${errors.map(e => e.category).join(', ')} in ${errors.map(e => e.step).join(', ')}`)
  }

  // Max attempts — transition with unstable flag
  console.log(`[validation] Max fix attempts reached for ${opts.projectId} — transitioning with build_unstable`)

  db.prepare("UPDATE projects SET document_status = 'build_unstable', build_attempt = ? WHERE id = ?")
    .run(attempt, opts.projectId)
  db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `evt-validation-${Date.now()}`, 'validation.failed', 'system',
    JSON.stringify({ projectId: opts.projectId, attempt, maxReached: true }), new Date().toISOString()
  )
  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(opts.projectId, 'validation',
      `Validation gate échouée après ${MAX_FIX_ATTEMPTS} tentatives ⚠️ — passage en review avec flag build_unstable.`,
      'error', new Date().toISOString())

  // Direct transition — no self-PATCH
  transitionProjectState(opts.projectId, 'review', { document_status: 'build_unstable' })
  launchReview({
    projectId: opts.projectId,
    projectName: opts.projectName,
    specsPath: opts.specsPath || resolveSpecsPath(opts.projectId),
  })
}
