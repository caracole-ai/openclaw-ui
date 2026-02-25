/**
 * File watcher plugin for JSON sources.
 * Watches ~/.openclaw/sources/*.json and resyncs DB on changes.
 */
import { watch } from 'chokidar'
import { join } from 'path'
import { resyncFromJson } from '../utils/db'

const HOME = process.env.HOME || ''
const SOURCES_DIR = join(HOME, '.openclaw/sources')

// Debounce multiple rapid changes
let debounceTimer: NodeJS.Timeout | null = null
const DEBOUNCE_MS = 500

// Track WebSocket clients for broadcasting
const wsClients = new Set<any>()

export function registerWSClient(client: any) {
  wsClients.add(client)
}

export function unregisterWSClient(client: any) {
  wsClients.delete(client)
}

function broadcastDataUpdate() {
  const message = JSON.stringify({
    type: 'data:updated',
    timestamp: new Date().toISOString()
  })
  
  wsClients.forEach(client => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message)
      }
    } catch (err) {
      console.error('[ws] Failed to send update:', err)
    }
  })
}

export default defineNitroPlugin((nitroApp) => {
  // Only run in dev or production server (not during build)
  if (process.env.NODE_ENV === 'production' || process.dev) {
    const watcher = watch([
      join(SOURCES_DIR, 'agents.json'),
      join(SOURCES_DIR, 'skills.json'),
      join(SOURCES_DIR, 'projects.json'),
      join(SOURCES_DIR, 'teams.json'),
      join(SOURCES_DIR, 'tokens.json'),
      join(SOURCES_DIR, 'events.json'),
    ], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    })

    watcher.on('change', (path) => {
      console.log(`[watcher] Source file changed: ${path}`)
      
      // Debounce multiple rapid changes
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      
      debounceTimer = setTimeout(() => {
        try {
          resyncFromJson()
          broadcastDataUpdate()
          console.log('[watcher] DB resynced and clients notified')
        } catch (err) {
          console.error('[watcher] Failed to resync:', err)
        }
      }, DEBOUNCE_MS)
    })

    watcher.on('error', (error) => {
      console.error('[watcher] Error:', error)
    })

    console.log('[watcher] Watching sources:', SOURCES_DIR)

    // Cleanup on shutdown
    nitroApp.hooks.hook('close', () => {
      console.log('[watcher] Closing file watcher')
      watcher.close()
    })
  }
})
