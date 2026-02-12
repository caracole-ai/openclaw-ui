import { ref } from 'vue'
import type { WSEventType, WSEvent } from '~/types/websocket'

type EventHandler<T = any> = (data: T) => void

// Singleton state
const status = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
const handlers = new Map<WSEventType, Set<EventHandler>>()
let ws: WebSocket | null = null
let attempted = false

// Set to true to enable WebSocket connection (requires a real WS backend)
const WS_ENABLED = false

function connect() {
  if (!WS_ENABLED) return
  if (import.meta.server) return
  if (attempted) return
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

  attempted = true
  status.value = 'connecting'

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPort = import.meta.env.VITE_WS_PORT || window.location.port || '8080'
    ws = new WebSocket(`${protocol}//${window.location.hostname}:${wsPort}/api/events`)

    ws.onopen = () => {
      status.value = 'connected'
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data)
        const eventHandlers = handlers.get(msg.type)
        if (eventHandlers) {
          eventHandlers.forEach(h => h(msg.data))
        }
      } catch {}
    }

    ws.onclose = () => {
      ws = null
      status.value = 'disconnected'
    }

    ws.onerror = () => {
      ws?.close()
    }
  } catch {
    status.value = 'error'
  }
}

export function useWebSocket() {
  function on<T = any>(event: WSEventType, handler: EventHandler<T>) {
    if (!handlers.has(event)) handlers.set(event, new Set())
    handlers.get(event)!.add(handler as EventHandler)
  }

  function off<T = any>(event: WSEventType, handler: EventHandler<T>) {
    handlers.get(event)?.delete(handler as EventHandler)
  }

  function disconnect() {
    ws?.close()
    ws = null
    status.value = 'disconnected'
  }

  // Auto-connect once on first client-side use
  if (!import.meta.server && !attempted && WS_ENABLED) {
    connect()
  }

  return { status, on, off, disconnect, connect }
}
