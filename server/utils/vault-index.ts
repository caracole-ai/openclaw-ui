/**
 * Vault Index — in-memory index of all vault markdown files.
 * Provides wikilink resolution, backlink computation, full-text search,
 * and hierarchical tree building for the /obsidian browser UI.
 */
import { readdirSync, statSync, existsSync } from 'fs'
import { join, relative, basename, extname, dirname } from 'path'
import { parseVaultFile, vaultConfig } from './vault'

// ─── Types ───

export interface VaultEntry {
  relativePath: string
  displayName: string
  emoji: string | null
  category: string
  fileType: VaultFileType
  frontmatter: Record<string, any>
  body: string
  outgoingLinks: string[]
  backlinks: { path: string; context: string }[]
  modifiedAt: string
  size: number
}

export type VaultFileType =
  | 'agent' | 'project' | 'idea' | 'mcp' | 'skill'
  | 'metaflow' | 'dashboard' | 'template' | 'kanban' | 'other'

export interface VaultTreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  displayName?: string
  emoji?: string
  fileType?: VaultFileType
  children?: VaultTreeNode[]
}

export interface ResolvedLink {
  raw: string
  resolved: string | null
  displayName: string
}

export interface BacklinkEntry {
  path: string
  displayName: string
  emoji?: string
  fileType: VaultFileType
  context: string
}

export interface RelatedFile {
  path: string
  displayName: string
  emoji?: string
  relation: string
}

export interface SearchResult {
  path: string
  displayName: string
  emoji?: string
  fileType: VaultFileType
  snippet: string
  score: number
}

interface VaultIndex {
  entries: Map<string, VaultEntry>
  nameIndex: Map<string, string[]>
  builtAt: string
  totalFiles: number
}

// ─── Singleton ───

let _index: VaultIndex | null = null

const IGNORED_DIRS = new Set(['.obsidian', '.git', '.claude', '.trash', 'node_modules'])

// ─── Wikilink extraction ───

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

/**
 * Extract all wikilink targets from a string.
 * Handles both body `[[name]]` and frontmatter `"[[name]]"`.
 */
export function extractWikilinks(text: string): string[] {
  const links: string[] = []
  let match: RegExpExecArray | null
  // Reset regex state
  WIKILINK_RE.lastIndex = 0
  while ((match = WIKILINK_RE.exec(text)) !== null) {
    const target = match[1].trim()
    if (target && !links.includes(target)) {
      links.push(target)
    }
  }
  return links
}

/**
 * Extract wikilinks from frontmatter values (deeply).
 */
function extractFrontmatterWikilinks(obj: any): string[] {
  if (!obj) return []
  if (typeof obj === 'string') return extractWikilinks(obj)
  if (Array.isArray(obj)) return obj.flatMap(extractFrontmatterWikilinks)
  if (typeof obj === 'object') return Object.values(obj).flatMap(extractFrontmatterWikilinks)
  return []
}

// ─── File type detection ───

function detectFileType(relativePath: string, frontmatter: Record<string, any>): VaultFileType {
  const category = relativePath.split('/')[0]
  if (frontmatter.type === 'metaflow') return 'metaflow'
  switch (category) {
    case 'Agents': return 'agent'
    case 'Projets': return 'project'
    case 'Idées': return 'idea'
    case 'Dashboard': return 'dashboard'
    case 'Templates': return 'template'
    case 'MetaFlow': return 'metaflow'
    case 'Tools': {
      const sub = relativePath.split('/')[1]
      if (sub === 'MCPs') return 'mcp'
      if (sub === 'Skills') return 'skill'
      return 'other'
    }
    default:
      if (basename(relativePath) === 'Kanban.md') return 'kanban'
      return 'other'
  }
}

function getDisplayName(frontmatter: Record<string, any>, stem: string): string {
  return frontmatter.titre || frontmatter.nom || frontmatter.name || stem
}

// ─── Recursive walk ───

function walkDir(dir: string, basePath: string): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      files.push(...walkDir(fullPath, basePath))
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      files.push(fullPath)
    }
  }
  return files
}

// ─── Index building ───

export function buildVaultIndex(): VaultIndex {
  const { basePath } = vaultConfig
  const entries = new Map<string, VaultEntry>()
  const nameIndex = new Map<string, string[]>()

  const allFiles = walkDir(basePath, basePath)

  // First pass: parse all files, build entries and name index
  for (const absPath of allFiles) {
    try {
      const relPath = relative(basePath, absPath)
      const stat = statSync(absPath)
      const stem = basename(absPath, '.md')
      const { frontmatter, body } = parseVaultFile(absPath)

      const fileType = detectFileType(relPath, frontmatter)
      const displayName = getDisplayName(frontmatter, stem)
      const emoji = frontmatter.emoji || null
      const category = relPath.split('/')[0]

      // Extract all outgoing wikilinks
      const bodyLinks = extractWikilinks(body)
      const fmLinks = extractFrontmatterWikilinks(frontmatter)
      const allLinks = [...new Set([...bodyLinks, ...fmLinks])]

      const entry: VaultEntry = {
        relativePath: relPath,
        displayName,
        emoji,
        category,
        fileType,
        frontmatter,
        body,
        outgoingLinks: allLinks,
        backlinks: [],
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size,
      }

      entries.set(relPath, entry)

      // Register in nameIndex under multiple keys for flexible resolution
      const keys: string[] = [stem.toLowerCase()]

      // Folder name (for agents in subfolders: Agents/code/sabrina/SOUL.md → "sabrina")
      const parentDir = basename(dirname(absPath))
      if (parentDir !== basename(basePath) && parentDir.toLowerCase() !== stem.toLowerCase()) {
        keys.push(parentDir.toLowerCase())
      }

      // Frontmatter id
      if (frontmatter.id) {
        keys.push(String(frontmatter.id).toLowerCase())
      }

      // Frontmatter nom/titre (less specific, only if different)
      const fmName = (frontmatter.nom || frontmatter.titre || '').toLowerCase()
      if (fmName && !keys.includes(fmName)) {
        keys.push(fmName)
      }

      for (const key of [...new Set(keys)]) {
        const existing = nameIndex.get(key) || []
        if (!existing.includes(relPath)) {
          existing.push(relPath)
          nameIndex.set(key, existing)
        }
      }
    } catch (err) {
      console.warn(`[vault-index] Failed to index: ${absPath}`, err)
    }
  }

  // Second pass: compute backlinks
  for (const [, entry] of entries) {
    for (const linkTarget of entry.outgoingLinks) {
      const resolvedPath = resolveWikilinkFromIndex(linkTarget, entries, nameIndex)
      if (resolvedPath) {
        const targetEntry = entries.get(resolvedPath)
        if (targetEntry) {
          // Find context line
          const context = findLinkContext(entry.body, linkTarget)
          targetEntry.backlinks.push({
            path: entry.relativePath,
            context,
          })
        }
      }
    }
  }

  const index: VaultIndex = {
    entries,
    nameIndex,
    builtAt: new Date().toISOString(),
    totalFiles: entries.size,
  }

  console.log(`[vault-index] Built index: ${entries.size} files, ${nameIndex.size} name entries`)
  return index
}

/**
 * Find the line containing a wikilink target, for backlink context.
 */
function findLinkContext(body: string, target: string): string {
  const lines = body.split('\n')
  for (const line of lines) {
    if (line.includes(`[[${target}`) || line.toLowerCase().includes(`[[${target.toLowerCase()}`)) {
      return line.trim().substring(0, 120)
    }
  }
  return ''
}

// ─── Singleton access ───

export function getVaultIndex(): VaultIndex {
  if (!_index) {
    _index = buildVaultIndex()
  }
  return _index
}

export function invalidateIndex(): void {
  _index = null
  console.log('[vault-index] Index invalidated')
}

// ─── Wikilink resolution ───

function resolveWikilinkFromIndex(
  name: string,
  entries: Map<string, VaultEntry>,
  nameIndex: Map<string, string[]>,
): string | null {
  const normalized = name.trim()

  // 1. Exact relative path match (e.g. "Projets/openclaw-ui/openclaw-ui.md")
  if (entries.has(normalized)) return normalized
  if (entries.has(normalized + '.md')) return normalized + '.md'

  // 2. Name index lookup
  const key = normalized.toLowerCase()
  const candidates = nameIndex.get(key)
  if (!candidates || candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  // 3. Disambiguation: prefer canonical files
  // Prefer exact id match
  for (const c of candidates) {
    const entry = entries.get(c)
    if (entry?.frontmatter.id?.toLowerCase() === key) return c
  }
  // Prefer SOUL.md (agent canonical)
  for (const c of candidates) {
    if (basename(c) === 'SOUL.md') return c
  }
  // Prefer folder-named file (project canonical)
  for (const c of candidates) {
    const stem = basename(c, '.md')
    const parent = basename(dirname(c))
    if (stem === parent) return c
  }
  // Prefer shallower path
  candidates.sort((a, b) => a.split('/').length - b.split('/').length)
  return candidates[0]
}

/**
 * Public wikilink resolution. Returns relativePath or null.
 */
export function resolveWikilink(name: string): string | null {
  const { entries, nameIndex } = getVaultIndex()
  return resolveWikilinkFromIndex(name, entries, nameIndex)
}

/**
 * Resolve all outgoing links of an entry to full ResolvedLink objects.
 */
export function resolveOutgoingLinks(entry: VaultEntry): ResolvedLink[] {
  const index = getVaultIndex()
  return entry.outgoingLinks.map(raw => {
    const resolved = resolveWikilinkFromIndex(raw, index.entries, index.nameIndex)
    const resolvedEntry = resolved ? index.entries.get(resolved) : null
    return {
      raw,
      resolved,
      displayName: resolvedEntry?.displayName || raw.split('/').pop() || raw,
    }
  })
}

/**
 * Get full backlink entries with metadata for display.
 */
export function getBacklinkEntries(entry: VaultEntry): BacklinkEntry[] {
  const index = getVaultIndex()
  return entry.backlinks.map(bl => {
    const source = index.entries.get(bl.path)
    return {
      path: bl.path,
      displayName: source?.displayName || basename(bl.path, '.md'),
      emoji: source?.emoji || undefined,
      fileType: source?.fileType || 'other',
      context: bl.context,
    }
  })
}

// ─── Related files computation ───

export function computeRelatedFiles(entry: VaultEntry): RelatedFile[] {
  const index = getVaultIndex()
  const related: RelatedFile[] = []
  const seen = new Set<string>()

  function add(path: string | null | undefined, relation: string) {
    if (!path || seen.has(path) || path === entry.relativePath) return
    const target = index.entries.get(path)
    if (!target) return
    seen.add(path)
    related.push({
      path,
      displayName: target.displayName,
      emoji: target.emoji || undefined,
      relation,
    })
  }

  function resolveAndAdd(name: string, relation: string) {
    const resolved = resolveWikilinkFromIndex(name, index.entries, index.nameIndex)
    add(resolved, relation)
  }

  const fm = entry.frontmatter

  switch (entry.fileType) {
    case 'agent': {
      // Skills
      const skills = extractFrontmatterWikilinks(fm.skills)
      skills.forEach(s => resolveAndAdd(s, 'skill'))
      // MCPs
      const mcps = extractFrontmatterWikilinks(fm.mcps)
      mcps.forEach(m => resolveAndAdd(m, 'mcp'))
      // Find projects where this agent is in equipe
      for (const [, e] of index.entries) {
        if (e.fileType !== 'project') continue
        const equipe = e.frontmatter.equipe
        if (Array.isArray(equipe)) {
          for (const member of equipe) {
            const agentRef = String(member.agent || member || '')
            const links = extractWikilinks(agentRef)
            if (links.some(l => resolveWikilinkFromIndex(l, index.entries, index.nameIndex) === entry.relativePath)) {
              add(e.relativePath, 'project')
              break
            }
          }
        }
        // Also check lead
        if (fm.id && e.frontmatter.lead) {
          const leadLinks = extractWikilinks(String(e.frontmatter.lead))
          if (leadLinks.some(l => l.toLowerCase() === fm.id?.toLowerCase())) {
            add(e.relativePath, 'project (lead)')
          }
        }
      }
      // Team members (same team folder, excluding files from the same agent subfolder)
      const agentSubDir = dirname(entry.relativePath) // e.g. Agents/code/sabrina
      const teamDir = dirname(agentSubDir)            // e.g. Agents/code
      for (const [, e] of index.entries) {
        if (e.fileType !== 'agent') continue
        const eSubDir = dirname(e.relativePath)
        // Same team folder but different agent subfolder, and only SOUL.md (canonical)
        if (dirname(eSubDir) === teamDir && eSubDir !== agentSubDir && basename(e.relativePath) === 'SOUL.md') {
          add(e.relativePath, 'teammate')
        }
      }
      break
    }

    case 'project': {
      // Team members
      if (Array.isArray(fm.equipe)) {
        for (const member of fm.equipe) {
          const links = extractFrontmatterWikilinks(member.agent || member)
          links.forEach(l => resolveAndAdd(l, 'team'))
        }
      }
      // Lead
      if (fm.lead) {
        const leadLinks = extractWikilinks(String(fm.lead))
        leadLinks.forEach(l => resolveAndAdd(l, 'lead'))
      }
      // Idea source
      if (fm.idee_source) {
        resolveAndAdd(String(fm.idee_source), 'idea_source')
      }
      // Skills & MCPs
      const skills = extractFrontmatterWikilinks(fm.skills)
      skills.forEach(s => resolveAndAdd(s, 'skill'))
      const mcps = extractFrontmatterWikilinks(fm.mcps)
      mcps.forEach(m => resolveAndAdd(m, 'mcp'))
      break
    }

    case 'idea': {
      if (fm.projet_lie) {
        resolveAndAdd(String(fm.projet_lie), 'project')
      }
      break
    }

    case 'mcp':
    case 'skill': {
      // Find agents that use this tool
      for (const [, e] of index.entries) {
        if (e.fileType !== 'agent') continue
        const toolLinks = [
          ...extractFrontmatterWikilinks(e.frontmatter.skills),
          ...extractFrontmatterWikilinks(e.frontmatter.mcps),
        ]
        const entryId = fm.id || basename(entry.relativePath, '.md')
        if (toolLinks.some(l => l.toLowerCase() === entryId.toLowerCase())) {
          add(e.relativePath, 'agent')
        }
      }
      break
    }
  }

  return related
}

// ─── Tree building ───

export function buildTree(): VaultTreeNode[] {
  const index = getVaultIndex()

  // Use a flat path→node map for efficient lookup, then assemble tree
  const nodeMap = new Map<string, VaultTreeNode>()

  function ensureFolder(pathStr: string): VaultTreeNode {
    if (nodeMap.has(pathStr)) return nodeMap.get(pathStr)!
    const node: VaultTreeNode = {
      name: basename(pathStr),
      path: pathStr,
      type: 'folder',
      children: [],
    }
    nodeMap.set(pathStr, node)
    return node
  }

  for (const [relPath, entry] of index.entries) {
    const parts = relPath.split('/')

    // Ensure all parent folders exist
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/')
      ensureFolder(folderPath)
    }

    // Create file node
    const fileNode: VaultTreeNode = {
      name: parts[parts.length - 1],
      path: relPath,
      type: 'file',
      displayName: entry.displayName,
      emoji: entry.emoji || undefined,
      fileType: entry.fileType,
    }
    nodeMap.set(relPath, fileNode)
  }

  // Assemble tree by attaching children to parents
  const roots: VaultTreeNode[] = []
  for (const [pathStr, node] of nodeMap) {
    const parentPath = dirname(pathStr)
    if (parentPath === '.' || parentPath === pathStr) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(parentPath)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
  }

  sortTree(roots)
  return roots
}

function sortTree(nodes: VaultTreeNode[]): void {
  nodes.sort((a, b) => {
    // Folders first
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, 'fr')
  })
  for (const node of nodes) {
    if (node.children) sortTree(node.children)
  }
}

// ─── Search ───

export function searchVault(query: string): SearchResult[] {
  if (!query || query.length < 2) return []

  const index = getVaultIndex()
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results: SearchResult[] = []

  for (const [, entry] of index.entries) {
    // Skip templates
    if (entry.fileType === 'template') continue

    let score = 0
    const searchableText = [
      entry.displayName,
      entry.frontmatter.id || '',
      entry.frontmatter.description || '',
      JSON.stringify(entry.frontmatter.tags || []),
      JSON.stringify(entry.frontmatter.expertise || []),
      JSON.stringify(entry.frontmatter.themes || []),
      entry.body,
    ].join(' ').toLowerCase()

    for (const term of terms) {
      // Display name match (high weight)
      if (entry.displayName.toLowerCase().includes(term)) score += 10
      // ID match (high weight)
      if (entry.frontmatter.id?.toLowerCase().includes(term)) score += 8
      // Body/metadata match
      if (searchableText.includes(term)) score += 1
    }

    if (score > 0) {
      // Extract snippet around first match
      const snippet = extractSnippet(entry.body, terms[0])
      results.push({
        path: entry.relativePath,
        displayName: entry.displayName,
        emoji: entry.emoji || undefined,
        fileType: entry.fileType,
        snippet,
        score,
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 20)
}

function extractSnippet(body: string, term: string): string {
  const lower = body.toLowerCase()
  const idx = lower.indexOf(term)
  if (idx === -1) return body.substring(0, 100).trim()

  const start = Math.max(0, idx - 40)
  const end = Math.min(body.length, idx + term.length + 60)
  let snippet = body.substring(start, end).trim()

  if (start > 0) snippet = '...' + snippet
  if (end < body.length) snippet = snippet + '...'

  return snippet.replace(/\n/g, ' ')
}
