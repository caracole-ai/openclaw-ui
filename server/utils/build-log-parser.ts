/**
 * Pure JSONL parser for Claude Code stream-json output.
 * Converts a single JSONL line into a BuildEvent or null (skip).
 */
import type { BuildEvent, BuildEventType } from '~/types/build-event'

/** Tools worth showing — the rest is noise */
const VISIBLE_TOOLS = new Set(['Write', 'Edit', 'Bash', 'Agent', 'Task', 'NotebookEdit'])

/** Deterministic ID from event UUID for idempotent re-processing */
function makeId(projectId: string, uuid?: string, suffix?: string): string {
  if (uuid) return `bev-${projectId}-${uuid}${suffix ? '-' + suffix : ''}`
  // Fallback for events without UUID (shouldn't happen in practice)
  return `bev-${projectId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function base(projectId: string, type: BuildEventType, summary: string, uuid?: string, suffix?: string): BuildEvent {
  return {
    id: makeId(projectId, uuid, suffix),
    projectId,
    sessionId: null,
    type,
    toolName: null,
    summary,
    filePath: null,
    command: null,
    isError: false,
    errorText: null,
    parentToolUseId: null,
    costUsd: null,
    durationMs: null,
    numTurns: null,
    createdAt: new Date().toISOString(),
  }
}

/** Parse a single JSONL line. fallbackTimestamp is used for events without their own timestamp. */
export function parseBuildLogLine(line: string, projectId: string, fallbackTimestamp?: string): BuildEvent | null {
  if (!line.trim()) return null

  let event: any
  try {
    event = JSON.parse(line)
  } catch {
    return null
  }

  const timestamp = event.timestamp || fallbackTimestamp || new Date().toISOString()
  const parentId = event.parent_tool_use_id || null
  const sessionId = event.session_id || null
  const uuid = event.uuid || null

  // ── system events ──
  if (event.type === 'system') {
    if (event.subtype === 'init') {
      const ev = base(projectId, 'init', `Build session started (${event.model || 'claude'})`, uuid || event.session_id)
      ev.sessionId = sessionId
      ev.createdAt = timestamp
      return ev
    }
    // Sub-agent lifecycle
    if (event.subtype === 'task_started') {
      const ev = base(projectId, 'agent_spawn', event.description || 'Agent started', uuid, 'tstart')
      ev.toolName = 'Agent'
      ev.sessionId = sessionId
      ev.parentToolUseId = parentId
      ev.createdAt = timestamp
      return ev
    }
    if (event.subtype === 'task_notification') {
      const ev = base(projectId, 'agent_result', event.summary || 'Agent completed', uuid, 'tnotif')
      ev.toolName = 'Agent'
      ev.sessionId = sessionId
      ev.parentToolUseId = parentId
      ev.createdAt = timestamp
      return ev
    }
    return null
  }

  // ── assistant events (tool_use blocks) ──
  if (event.type === 'assistant' && event.message?.content) {
    const contents = event.message.content as any[]

    for (const block of contents) {
      if (block.type !== 'tool_use') continue
      if (!VISIBLE_TOOLS.has(block.name)) continue

      const input = block.input || {}
      // Use block.id (tool_use ID) for deterministic dedup
      const ev = base(projectId, 'tool_use', '', block.id || uuid)
      ev.toolName = block.name
      ev.sessionId = sessionId
      ev.parentToolUseId = parentId
      ev.createdAt = timestamp

      if (block.name === 'Write' || block.name === 'Edit') {
        ev.filePath = input.file_path || null
        ev.summary = `[${block.name}] ${input.file_path || '?'}`
      } else if (block.name === 'Bash') {
        ev.command = (input.command || '').slice(0, 200)
        ev.summary = `[Bash] ${input.description || input.command?.slice(0, 80) || '?'}`
      } else if (block.name === 'Agent' || block.name === 'Task') {
        ev.summary = `[Agent] ${input.description || input.prompt?.slice(0, 100) || '?'}`
        ev.type = 'agent_spawn'
      } else if (block.name === 'NotebookEdit') {
        ev.filePath = input.file_path || null
        ev.summary = `[NotebookEdit] ${input.file_path || '?'}`
      }

      return ev
    }
    return null
  }

  // ── user events (tool results — errors only) ──
  if (event.type === 'user' && event.message?.content) {
    const contents = event.message.content as any[]

    for (const block of contents) {
      if (block.type !== 'tool_result') continue
      if (!block.is_error) continue

      const errText = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content)

      const ev = base(projectId, 'tool_error', `Error: ${errText.slice(0, 150)}`, uuid, block.tool_use_id)
      ev.isError = true
      ev.errorText = errText.slice(0, 500)
      ev.sessionId = sessionId
      ev.parentToolUseId = parentId
      ev.createdAt = timestamp
      return ev
    }
    return null
  }

  // ── result event (final) ──
  if (event.type === 'result') {
    const summary = event.subtype === 'success'
      ? `Build terminé — ${event.num_turns || '?'} turns`
      : `Build failed (${event.subtype || 'unknown'})`
    const ev = base(projectId, 'result', summary, uuid || sessionId, 'result')
    ev.sessionId = sessionId
    ev.costUsd = event.total_cost_usd || null
    ev.durationMs = event.duration_ms || null
    ev.numTurns = event.num_turns || null
    ev.isError = event.is_error || false
    ev.errorText = event.is_error ? (typeof event.result === 'string' ? event.result.slice(0, 500) : null) : null
    ev.createdAt = timestamp
    return ev
  }

  return null
}
