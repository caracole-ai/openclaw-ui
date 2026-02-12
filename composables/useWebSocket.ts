import { ref, onUnmounted } from 'vue'
import type { WSEventType, WSEvent } from '~/types/websocket'

type EventHandler<T = any> = (data: T) => void

export function useWebSocket() {
  const status = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const handlers = new Map<WSEventType, Set<EventHandler>>()

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 1000
  const MAX_DELAY = 30000

  function connect() {
    if (import.meta.server) return

    status.value = 'connecting'

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${window.location.hostname}:8080/api/events`)

      ws.onopen = () => {
        status.value = 'connected'
        reconnectDelay = 1000
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
        status.value = 'disconnected'
        scheduleReconnect()
      }

      ws.onerror = () => {
        status.value = 'error'
        ws?.close()
      }
    } catch {
      status.value = 'error'
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY)
      connect()
    }, reconnectDelay)
  }

  function on<T = any>(event: WSEventType, handler: EventHandler<T>) {
    if (!handlers.has(event)) handlers.set(event, new Set())
    handlers.get(event)!.add(handler as EventHandler)
  }

  function off<T = any>(event: WSEventType, handler: EventHandler<T>) {
    handlers.get(event)?.delete(handler as EventHandler)
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
    status.value = 'disconnected'
  }

  // Auto-connect on client
  if (!import.meta.server) {
    connect()
  }

  onUnmounted(() => {
    disconnect()
  })

  return { status, on, off, disconnect, connect }
}
