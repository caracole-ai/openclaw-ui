import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'realtime'

export interface Toast {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

const MAX_TOASTS = 5
const AUTO_DISMISS_MS = 5000

const toasts = ref<Toast[]>([])

export function useToast() {
  function add(type: ToastType, message: string) {
    const toast: Toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      createdAt: Date.now()
    }

    toasts.value.push(toast)

    // Trim to max
    if (toasts.value.length > MAX_TOASTS) {
      toasts.value = toasts.value.slice(-MAX_TOASTS)
    }

    // Auto-dismiss
    setTimeout(() => {
      remove(toast.id)
    }, AUTO_DISMISS_MS)
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function success(message: string) { add('success', message) }
  function error(message: string) { add('error', message) }
  function info(message: string) { add('info', message) }
  function warning(message: string) { add('warning', message) }

  // Setup WS listeners for automatic toasts
  if (!import.meta.server) {
    try {
      const { on } = useWebSocket()
      on('skill:installed', (d: any) => add('realtime', `Skill "${d.name || d.id}" installé`))
      on('skill:assigned', (d: any) => add('realtime', `Skill assigné à ${d.agentId || 'agent'}`))
      on('approval:required', (d: any) => add('warning', `Approbation requise: ${d.message || d.action || '?'}`))
      on('project:stateChanged', (d: any) => add('info', `Projet "${d.name || d.id}" → ${d.state}`))
    } catch {}
  }

  return { toasts, add, remove, success, error, info, warning }
}
