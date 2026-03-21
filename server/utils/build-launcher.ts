/**
 * Build launcher — spawns Claude Code to build a project from specs.
 * Fire-and-forget: Claude runs autonomously (5-30 min).
 */
import { spawn, execSync } from 'child_process'
import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, openSync, existsSync } from 'fs'
import { getDb } from './db'
import { parseVaultFile, updateVaultFrontmatter, loadTemplate, vaultConfig } from './vault'

const HOME = process.env.HOME || '/Users/caracole'
const CLAUDE_PATH = join(HOME, '.local/bin/claude')
const AUTO_BUILD_DIR = join(HOME, 'Desktop/coding-projects/AUTO-BUILD')
const GITHUB_OWNER = 'caracole-ai'

const runningBuilds = new Map<string, { pid: number; startedAt: string }>()

interface BuildOptions {
  projectId: string
  projectName: string
  specsPath: string
}

/**
 * Extract the CLAUDE.md coding principles section from the project template.
 * Falls back to a minimal default if the template is unavailable.
 */
function loadCodingPrinciples(): string {
  try {
    const template = loadTemplate('projet')
    // Extract everything from "## CLAUDE.md" to the next "## " or end of body
    const claudeMatch = template.body.match(/## CLAUDE\.md[^\n]*\n([\s\S]*?)(?=\n## [^#]|$)/)
    if (claudeMatch) return claudeMatch[1].trim()
    // Fallback: extract any "### Coding Principles" section
    const principlesMatch = template.body.match(/### Coding Principles\n([\s\S]*?)(?=\n## [^#]|$)/)
    if (principlesMatch) return `## Coding Principles\n\n${principlesMatch[1].trim()}`
  } catch (err) {
    console.warn('[build] Failed to load coding principles from template, using fallback:', err)
  }
  return '## Coding Principles\n\nFollow existing patterns. No hardcoded values. SOLID principles. Keep docs in sync.'
}

/**
 * Strip the raw agent conversation from specs to keep CLAUDE.md under 35k chars.
 * The structured sections (résumé, architecture, features, stack, risks, plan)
 * already contain all the information Claude needs to build. The conversation
 * is preserved in Obsidian for traceability but excluded from the build context.
 */
function trimSpecsConversation(specsContent: string): string {
  const marker = /^## Conversation complète/m
  const match = specsContent.match(marker)
  if (!match || match.index === undefined) return specsContent
  return specsContent.slice(0, match.index).trimEnd()
}

function generateClaudeMd(projectName: string, specsContent: string): string {
  const trimmedSpecs = trimSpecsConversation(specsContent)
  const codingPrinciples = loadCodingPrinciples()

  const directives = `## Directives de build

- Tu dois implémenter ce projet de A à Z selon les specs ci-dessus.
- Utilise le MCP context7 pour vérifier la documentation officielle des libs/frameworks utilisés.
- Structure du projet :
  - README.md (description, installation, usage, architecture)
  - package.json ou requirements.txt selon la stack
  - src/ — code source
  - tests/ — tests unitaires
  - .env.example si variables d'environnement nécessaires
- Le code doit être fonctionnel, testé, et prêt à run.
- Pas de TODO ou placeholder — chaque feature doit être implémentée.
- Suis les coding principles ci-dessus à la lettre.
- Commence par créer la structure du projet, puis implémente feature par feature.`

  return `# ${projectName}\n\n${codingPrinciples}\n\n## Specs du projet\n\n${trimmedSpecs}\n\n${directives}\n`
}

function generateMcpJson(): string {
  return JSON.stringify({
    mcpServers: {
      context7: {
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp']
      }
    }
  }, null, 2)
}

export function launchBuild(opts: BuildOptions): { pid: number; status: string } {
  // Guard: no specs
  if (!opts.specsPath || !existsSync(opts.specsPath)) {
    console.error(`[build] Specs not found: ${opts.specsPath}`)
    return { pid: 0, status: 'no_specs' }
  }

  // Guard: already running
  if (runningBuilds.has(opts.projectId)) {
    const info = runningBuilds.get(opts.projectId)!
    console.log(`[build] Already running for ${opts.projectId} (PID ${info.pid})`)
    return { pid: info.pid, status: 'already_running' }
  }

  // 1. Create project directory
  const projectDir = join(AUTO_BUILD_DIR, opts.projectId)
  mkdirSync(projectDir, { recursive: true })

  // 2. Read specs
  const specsContent = readFileSync(opts.specsPath, 'utf-8')

  // 3. Generate CLAUDE.md
  const claudeMd = generateClaudeMd(opts.projectName, specsContent)
  writeFileSync(join(projectDir, 'CLAUDE.md'), claudeMd, 'utf-8')

  // 4. Generate .mcp.json
  writeFileSync(join(projectDir, '.mcp.json'), generateMcpJson(), 'utf-8')

  // 5. Spawn Claude Code
  const logFile = join(projectDir, 'build.log')
  const logFd = openSync(logFile, 'w')

  const prompt = `Lis le fichier CLAUDE.md dans ce répertoire. Il contient les coding principles, les specs complètes du projet, et les directives de build. Implémente le projet de A à Z.`

  console.log(`[build] Spawning Claude Code for ${opts.projectId}`)
  console.log(`[build] Project dir: ${projectDir}`)
  console.log(`[build] Log file: ${logFile}`)

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
    console.error(`[build] Spawn error for ${opts.projectId}:`, err)
    runningBuilds.delete(opts.projectId)
  })

  child.unref()

  const now = new Date().toISOString()
  const pid = child.pid || 0
  runningBuilds.set(opts.projectId, { pid, startedAt: now })

  // 6. Log to DB
  try {
    const db = getDb()
    db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `evt-build-${Date.now()}`,
      'build.started',
      'system',
      JSON.stringify({ projectId: opts.projectId, projectName: opts.projectName, pid, projectDir }),
      now
    )

    const project = db.prepare('SELECT id, vault_path FROM projects WHERE id = ?').get(opts.projectId) as any
    if (project) {
      db.prepare("UPDATE projects SET state = 'build', document_status = 'building' WHERE id = ?").run(opts.projectId)
      db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(opts.projectId, 'build', `Build lancé — Claude Code autonome (PID ${pid})`, 'build', now)

      // Sync state to Obsidian vault to prevent reconciliation from reverting
      if (project.vault_path && existsSync(project.vault_path)) {
        try {
          updateVaultFrontmatter(project.vault_path, { statut: 'build', phase_courante: 'build' })
        } catch (err) {
          console.error(`[build] Vault sync failed:`, err)
        }
      }
    }
  } catch (err) {
    console.error(`[build] DB logging failed:`, err)
  }

  console.log(`[build] Launched for ${opts.projectId} (PID ${pid})`)

  // On build completion, auto-transition to review
  child.on('exit', (code) => {
    runningBuilds.delete(opts.projectId)
    const endTime = new Date().toISOString()
    const success = code === 0

    console.log(`[build] ${success ? 'Completed' : 'Failed'} for ${opts.projectId} (code ${code})`)

    try {
      const db = getDb()

      db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
        `evt-build-${Date.now()}`,
        success ? 'build.completed' : 'build.failed',
        'system',
        JSON.stringify({ projectId: opts.projectId, exitCode: code }),
        endTime
      )

      const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(opts.projectId)
      if (project) {
        db.prepare("UPDATE projects SET document_status = ? WHERE id = ?")
          .run(success ? 'built' : 'build_failed', opts.projectId)
        db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(
            opts.projectId, 'build',
            success ? 'Build terminé avec succès. Passage en review.' : `Build échoué (code ${code}).`,
            success ? 'build' : 'error', endTime
          )

        // Auto-transition to review if build succeeded (via PATCH = DB + vault + hooks)
        if (success) {
          const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3333'
          fetch(`${baseUrl}/api/projects/${opts.projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: 'review' }),
          }).catch(err => {
            console.error(`[build] Auto-review trigger failed:`, err)
          })
        }
      }
    } catch (err) {
      console.error(`[build] Exit handler error:`, err)
    }
  })

  return { pid, status: 'launched' }
}

export function getBuildStatus(projectId: string): { running: boolean; pid?: number; startedAt?: string } {
  const info = runningBuilds.get(projectId)
  return info ? { running: true, ...info } : { running: false }
}
