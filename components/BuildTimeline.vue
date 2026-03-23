<template>
  <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <div class="flex items-center gap-2">
        <span class="text-lg">📦</span>
        <h3 class="text-sm font-bold text-gray-200">Build Timeline</h3>
        <span v-if="building" class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">{{ events.length }} events</span>
        <!-- Cost badge if result available -->
        <span v-if="resultEvent" class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-400">
          ${{ resultEvent.costUsd?.toFixed(2) }} · {{ formatDuration(resultEvent.durationMs) }}
        </span>
      </div>
    </div>

    <!-- Timeline content -->
    <div
      ref="timelineContainer"
      class="p-4 bg-gray-950 overflow-y-auto max-h-[500px]"
      @scroll="onScroll"
    >
      <div v-if="events.length === 0" class="text-center py-8 text-gray-600 text-sm">
        En attente des events...
      </div>

      <div v-else class="space-y-0.5">
        <div
          v-for="ev in events"
          :key="ev.id"
          class="flex gap-3 items-start group"
          :class="{ 'pl-6': ev.parentToolUseId }"
        >
          <!-- Timeline dot -->
          <div class="flex flex-col items-center pt-1.5 shrink-0">
            <div class="w-2 h-2 rounded-full" :class="dotClass(ev)"></div>
            <div class="w-px flex-1 bg-gray-800 min-h-[16px]"></div>
          </div>

          <!-- Event card -->
          <div class="flex-1 pb-3 min-w-0">
            <div class="flex items-center gap-2 text-xs">
              <span class="text-gray-600 font-mono shrink-0">{{ formatTime(ev.createdAt) }}</span>
              <span
                class="px-1.5 py-0.5 rounded font-mono text-xs font-medium shrink-0"
                :class="badgeClass(ev)"
              >
                {{ badgeLabel(ev) }}
              </span>
              <span v-if="ev.parentToolUseId" class="text-gray-700 text-xs">sub-agent</span>
            </div>

            <!-- Summary -->
            <p class="text-sm mt-0.5 break-all" :class="summaryClass(ev)">{{ ev.summary }}</p>

            <!-- File path detail -->
            <p v-if="ev.filePath" class="text-xs text-gray-600 font-mono mt-0.5 truncate">
              {{ ev.filePath }}
            </p>

            <!-- Command detail -->
            <p v-if="ev.command" class="text-xs text-blue-400/60 font-mono mt-0.5 truncate">
              $ {{ ev.command }}
            </p>

            <!-- Error detail -->
            <pre
              v-if="ev.errorText"
              class="mt-1 text-xs text-red-400 bg-red-950/30 border border-red-900/30 p-2 rounded overflow-x-auto max-h-32"
            >{{ ev.errorText }}</pre>

            <!-- Result summary -->
            <div v-if="ev.type === 'result'" class="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div class="bg-gray-800/50 rounded p-2 text-center">
                <div class="text-emerald-400 font-bold">${{ ev.costUsd?.toFixed(2) || '?' }}</div>
                <div class="text-gray-600">Cost</div>
              </div>
              <div class="bg-gray-800/50 rounded p-2 text-center">
                <div class="text-blue-400 font-bold">{{ formatDuration(ev.durationMs) }}</div>
                <div class="text-gray-600">Duration</div>
              </div>
              <div class="bg-gray-800/50 rounded p-2 text-center">
                <div class="text-purple-400 font-bold">{{ ev.numTurns || '?' }}</div>
                <div class="text-gray-600">Turns</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BuildEvent } from '~/types/build-event'

const props = defineProps<{
  projectId: string
  building: boolean
}>()

const events = ref<BuildEvent[]>([])
const timelineContainer = ref<HTMLElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
let userScrolled = false

const resultEvent = computed(() =>
  events.value.find(e => e.type === 'result')
)

async function fetchEvents() {
  try {
    const lastTimestamp = events.value.length
      ? events.value[events.value.length - 1].createdAt
      : undefined
    const since = lastTimestamp ? `?since=${encodeURIComponent(lastTimestamp)}` : ''
    const data = await $fetch<{ events: BuildEvent[] }>(`/api/projects/${props.projectId}/build-events${since}`)

    if (!lastTimestamp) {
      // Initial load
      events.value = data.events
    } else if (data.events.length > 0) {
      // Append new events
      events.value = [...events.value, ...data.events]
    }

    // Auto-scroll to bottom unless user scrolled up
    if (!userScrolled) {
      await nextTick()
      if (timelineContainer.value) {
        timelineContainer.value.scrollTop = timelineContainer.value.scrollHeight
      }
    }
  } catch {}
}

function onScroll() {
  if (!timelineContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = timelineContainer.value
  // Consider "at bottom" if within 50px
  userScrolled = scrollHeight - scrollTop - clientHeight > 50
}

// WebSocket real-time push
if (!import.meta.server) {
  const { on } = useWebSocket()
  on('build:event', (ev: BuildEvent) => {
    if (ev.projectId !== props.projectId) return
    events.value = [...events.value, ev]
    if (!userScrolled) {
      nextTick(() => {
        if (timelineContainer.value) {
          timelineContainer.value.scrollTop = timelineContainer.value.scrollHeight
        }
      })
    }
  })
}

// Polling fallback
if (!import.meta.server) {
  fetchEvents()
  pollTimer = setInterval(fetchEvents, 3000)
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
}

// ── Styling helpers ──

function dotClass(ev: BuildEvent): string {
  switch (ev.type) {
    case 'init': return 'bg-blue-500'
    case 'agent_spawn': return 'bg-purple-500'
    case 'agent_result': return 'bg-purple-400'
    case 'tool_error': return 'bg-red-500'
    case 'result': return ev.isError ? 'bg-red-500' : 'bg-emerald-500'
    default:
      if (ev.toolName === 'Write' || ev.toolName === 'Edit') return 'bg-green-500'
      if (ev.toolName === 'Bash') return 'bg-blue-400'
      return 'bg-gray-500'
  }
}

function badgeClass(ev: BuildEvent): string {
  switch (ev.type) {
    case 'init': return 'bg-blue-900/50 text-blue-400'
    case 'agent_spawn':
    case 'agent_result': return 'bg-purple-900/50 text-purple-400'
    case 'tool_error': return 'bg-red-900/50 text-red-400'
    case 'result': return ev.isError ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'
    default:
      if (ev.toolName === 'Write' || ev.toolName === 'Edit') return 'bg-green-900/50 text-green-400'
      if (ev.toolName === 'Bash') return 'bg-blue-900/50 text-blue-400'
      return 'bg-gray-800 text-gray-400'
  }
}

function badgeLabel(ev: BuildEvent): string {
  if (ev.type === 'init') return 'INIT'
  if (ev.type === 'result') return 'DONE'
  if (ev.type === 'agent_spawn') return 'AGENT'
  if (ev.type === 'agent_result') return 'AGENT OK'
  if (ev.type === 'tool_error') return 'ERROR'
  return ev.toolName || ev.type
}

function summaryClass(ev: BuildEvent): string {
  if (ev.isError || ev.type === 'tool_error') return 'text-red-400'
  if (ev.type === 'agent_spawn' || ev.type === 'agent_result') return 'text-purple-300'
  if (ev.type === 'result') return 'text-emerald-300'
  if (ev.type === 'init') return 'text-blue-300'
  return 'text-gray-300'
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return '?'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m${s % 60}s`
}
</script>
