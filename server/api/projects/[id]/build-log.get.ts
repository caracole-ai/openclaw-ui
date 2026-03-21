/**
 * GET /api/projects/:id/build-log
 * Returns the build log content for live monitoring.
 * Parses stream-json (JSONL) output from Claude Code into readable text.
 * Supports ?tail=N to return only the last N lines.
 * Supports ?since=OFFSET to return content after byte offset (for polling).
 * Supports ?raw=1 to return unparsed JSONL content.
 */
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const AUTO_BUILD_DIR = join(process.env.HOME || '', 'Desktop/coding-projects/AUTO-BUILD')

/**
 * Parse Claude Code stream-json (JSONL) into readable log text.
 * Falls back to returning raw content if not JSONL.
 */
function formatStreamLog(raw: string): string {
  if (!raw.trim()) return ''

  // Detect if content is JSONL (first non-empty line starts with '{')
  const firstLine = raw.trim().split('\n')[0]
  if (!firstLine.startsWith('{')) return raw

  const lines = raw.split('\n').filter(l => l.trim())
  const parts: string[] = []

  for (const line of lines) {
    try {
      const event = JSON.parse(line)

      // System init
      if (event.type === 'system' && event.subtype === 'init') {
        parts.push('[Build] Session started\n')
        continue
      }

      // Assistant message (text + tool_use blocks)
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            parts.push(block.text)
          }
          if (block.type === 'tool_use') {
            const input = block.input || {}
            let summary = ''
            if (block.name === 'Write' || block.name === 'Edit' || block.name === 'Read') {
              summary = input.file_path || ''
            } else if (block.name === 'Bash') {
              summary = (input.command || '').slice(0, 120)
            } else {
              summary = JSON.stringify(input).slice(0, 120)
            }
            parts.push(`\n[${block.name}] ${summary}\n`)
          }
        }
      }

      // Tool result (show errors only, skip large outputs)
      if (event.type === 'tool_result') {
        if (event.is_error && event.content) {
          const errText = typeof event.content === 'string'
            ? event.content
            : JSON.stringify(event.content)
          parts.push(`[Error] ${errText.slice(0, 300)}\n`)
        }
      }

      // Final result
      if (event.type === 'result') {
        if (event.result) {
          parts.push(`\n[Done] ${typeof event.result === 'string' ? event.result.slice(0, 500) : 'Build complete'}\n`)
        }
        if (event.cost_usd) {
          parts.push(`[Cost] $${event.cost_usd.toFixed(4)} | ${Math.round((event.duration_ms || 0) / 1000)}s\n`)
        }
      }
    } catch {
      // Not valid JSON — include raw line
      if (line.trim()) parts.push(line)
    }
  }

  return parts.join('\n')
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const query = getQuery(event)
  const tail = parseInt(query.tail as string) || 0
  const since = parseInt(query.since as string) || 0
  const raw = query.raw === '1'

  // Check build.log exists
  const logPath = join(AUTO_BUILD_DIR, id, 'build.log')
  if (!existsSync(logPath)) {
    return { content: '', size: 0, exists: false }
  }

  const stats = statSync(logPath)
  const totalSize = stats.size

  // If since offset is provided, return only new content (raw bytes, parsed by client)
  if (since > 0 && since < totalSize) {
    const fd = require('fs').openSync(logPath, 'r')
    const buffer = Buffer.alloc(totalSize - since)
    require('fs').readSync(fd, buffer, 0, buffer.length, since)
    require('fs').closeSync(fd)
    const rawContent = buffer.toString('utf-8')
    return {
      content: raw ? rawContent : formatStreamLog(rawContent),
      size: totalSize,
      offset: since,
      exists: true,
    }
  }

  // Full read
  let content = readFileSync(logPath, 'utf-8')

  // Parse JSONL to readable text (unless raw mode)
  if (!raw) {
    content = formatStreamLog(content)
  }

  // Tail: return only last N lines
  if (tail > 0) {
    const lines = content.split('\n')
    content = lines.slice(-tail).join('\n')
  }

  // Also check review.log if it exists
  const reviewLogPath = join(AUTO_BUILD_DIR, id, 'review.log')
  let reviewContent = ''
  if (existsSync(reviewLogPath)) {
    const rawReview = readFileSync(reviewLogPath, 'utf-8')
    reviewContent = raw ? rawReview : formatStreamLog(rawReview)
  }

  // Check if build process is still running
  let building = false
  try {
    const { getBuildStatus } = await import('~/server/utils/build-launcher')
    building = getBuildStatus(id).running
  } catch {}

  let reviewing = false
  try {
    const { getReviewStatus } = await import('~/server/utils/review-launcher')
    reviewing = getReviewStatus(id).running
  } catch {}

  return {
    content,
    reviewContent: reviewContent || undefined,
    size: totalSize,
    exists: true,
    building,
    reviewing,
  }
})
