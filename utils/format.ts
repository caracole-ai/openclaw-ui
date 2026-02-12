/**
 * Shared formatting utilities — auto-imported by Nuxt.
 * Replaces duplicated functions across pages and components.
 */

export function formatTokens(n: number): string {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

export function formatCost(n: number): string {
  if (n == null) return '€0.0000'
  return `€${n.toFixed(4)}`
}

export function formatDate(ts: string): string {
  if (!ts) return 'N/A'
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ts
  }
}

export function formatDateFull(ts: string): string {
  if (!ts) return 'N/A'
  return new Date(ts).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateShort(ts: string): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatModel(model: string | null): string {
  if (!model) return '-'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('gpt-4')) return 'GPT-4'
  return model.split('/').pop()?.split('-')[0] ?? model
}

export function formatAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (seconds < 60) return `${seconds}s`
  if (minutes < 60) return `${minutes}m`
  return `${hours}h`
}

export function formatAgeSince(timestamp: string | null): string {
  if (!timestamp) return 'Jamais'
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes}m`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`

  return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function formatSessionKey(key: string): string {
  const parts = key.split(':')
  if (parts.length <= 3) return parts[parts.length - 1] || key
  return parts.slice(2).join(' / ')
}
