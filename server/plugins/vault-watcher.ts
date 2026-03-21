/**
 * File watcher plugin for Obsidian Vault.
 * - Watches Idées/, Projets/, Agents/ and syncs to DB on changes.
 * - Runs periodic full reconciliation (DB ↔ Vault) every 60s.
 */
import { watch } from 'chokidar'
import { join } from 'path'
import { syncVaultToDb, fullReconciliation, vaultConfig } from '../utils/vault'
import { broadcastDataUpdate } from './source-watcher'

let debounceTimer: NodeJS.Timeout | null = null
const DEBOUNCE_MS = 500
const RECONCILIATION_INTERVAL_MS = 60_000

// Guard against re-entrant syncs
let syncing = false

async function safeSync(fn: () => void, label: string) {
  if (syncing) return
  syncing = true
  try {
    fn()
    broadcastDataUpdate()
  } catch (err) {
    console.error(`[vault-watcher] ${label} failed:`, err)
  } finally {
    syncing = false
  }
}

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV === 'production' || process.dev) {
    const { basePath, folders } = vaultConfig

    const watchPaths = [
      join(basePath, folders.ideas, '*.md'),
      join(basePath, folders.projects, '**/*.md'),
      join(basePath, folders.agents, '**/*.md'),
    ]

    // ── File watcher: vault changes → DB ──
    const watcher = watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    })

    watcher.on('all', (event, path) => {
      if (event !== 'change' && event !== 'add' && event !== 'unlink') return

      console.log(`[vault-watcher] ${event}: ${path}`)

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(() => {
        safeSync(() => syncVaultToDb(), 'vault→DB sync')
      }, DEBOUNCE_MS)
    })

    watcher.on('error', (error) => {
      console.error('[vault-watcher] Error:', error)
    })

    // ── Initial full reconciliation on startup ──
    safeSync(() => fullReconciliation(), 'initial reconciliation')

    // ── Periodic reconciliation every 60s ──
    const reconciliationTimer = setInterval(() => {
      safeSync(() => fullReconciliation(), 'periodic reconciliation')
    }, RECONCILIATION_INTERVAL_MS)

    console.log(`[vault-watcher] Watching vault: ${basePath} (reconciliation every ${RECONCILIATION_INTERVAL_MS / 1000}s)`)

    // ── Cleanup ──
    nitroApp.hooks.hook('close', () => {
      console.log('[vault-watcher] Closing vault watcher')
      watcher.close()
      clearInterval(reconciliationTimer)
      if (debounceTimer) clearTimeout(debounceTimer)
    })
  }
})
