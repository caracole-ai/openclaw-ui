/**
 * Vault Markdown Renderer — custom marked configuration for Obsidian vault content.
 * Handles wikilinks, callouts, and task checkboxes.
 */
import { Marked, type TokenizerExtension, type RendererExtension } from 'marked'
import { resolveWikilink, getVaultIndex } from './vault-index'
import { basename } from 'path'

// ─── Wikilink Extension ───

const wikilinkTokenizer: TokenizerExtension = {
  name: 'wikilink',
  level: 'inline',
  start(src: string) {
    return src.indexOf('[[')
  },
  tokenizer(src: string) {
    const match = src.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
    if (match) {
      return {
        type: 'wikilink',
        raw: match[0],
        target: match[1].trim(),
        alias: match[2]?.trim() || null,
      }
    }
    return undefined
  },
}

const wikilinkRenderer: RendererExtension = {
  name: 'wikilink',
  renderer(token: any) {
    const resolved = resolveWikilink(token.target)
    const display = token.alias || token.target.split('/').pop() || token.target

    if (resolved) {
      const entry = getVaultIndex().entries.get(resolved)
      const emoji = entry?.emoji ? `${entry.emoji} ` : ''
      return `<a data-wiki="${resolved}" class="vault-wikilink" title="${token.target}">${emoji}${display}</a>`
    }
    return `<span class="vault-wikilink-unresolved" title="Unresolved: ${token.target}">${display}</span>`
  },
}

// ─── Callout post-processing ───

/**
 * Transform Obsidian callout syntax in rendered HTML.
 * Input:  <blockquote><p>[!info] Title\nContent</p></blockquote>
 * Output: <div class="vault-callout vault-callout-info"><div class="vault-callout-title">Title</div><p>Content</p></div>
 */
function transformCallouts(html: string): string {
  // Match blockquotes that start with [!type]
  return html.replace(
    /<blockquote>\s*<p>\[!([\w-]+)\]\s*(.*?)(?:\n|<br>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
    (_, type, title, content) => {
      const calloutType = type.toLowerCase()
      const calloutTitle = title.trim() || calloutType.charAt(0).toUpperCase() + calloutType.slice(1)
      const iconMap: Record<string, string> = {
        info: 'ℹ️',
        warning: '⚠️',
        tip: '💡',
        note: '📝',
        danger: '🔴',
        example: '📋',
        quote: '💬',
        abstract: '📄',
        success: '✅',
        question: '❓',
        bug: '🐛',
      }
      const icon = iconMap[calloutType] || '📌'
      return `<div class="vault-callout vault-callout-${calloutType}"><div class="vault-callout-title">${icon} ${calloutTitle}</div><div class="vault-callout-content">${content.trim()}</div></div>`
    },
  )
}

// ─── Dataview block detection ───

function transformDataviewBlocks(html: string): string {
  // Replace dataview/dataviewjs code blocks with info panels
  return html.replace(
    /<pre><code class="language-dataview(?:js)?">([\s\S]*?)<\/code><\/pre>/gi,
    (_, content) => {
      return `<div class="vault-dataview-placeholder"><div class="vault-dataview-title">📊 Dataview Query</div><pre class="vault-dataview-code">${content}</pre><p class="vault-dataview-note">This query requires Obsidian Dataview plugin to execute.</p></div>`
    },
  )
}

// ─── Task checkbox rendering ───

function transformTasks(html: string): string {
  // Replace [ ] and [x] patterns in list items
  html = html.replace(
    /<li>\s*\[ \]/g,
    '<li class="vault-task"><input type="checkbox" disabled> ',
  )
  html = html.replace(
    /<li>\s*\[x\]/gi,
    '<li class="vault-task vault-task-done"><input type="checkbox" checked disabled> ',
  )
  return html
}

// ─── Main renderer ───

const vaultMarked = new Marked()
vaultMarked.use({ extensions: [wikilinkTokenizer, wikilinkRenderer] })

/**
 * Render vault markdown body to HTML with wikilink resolution,
 * callout support, and task checkboxes.
 */
export function renderVaultMarkdown(body: string): string {
  // Render markdown
  let html = vaultMarked.parse(body, { gfm: true, breaks: true }) as string

  // Post-process
  html = transformCallouts(html)
  html = transformDataviewBlocks(html)
  html = transformTasks(html)

  return html
}
