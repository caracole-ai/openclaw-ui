/**
 * SQLite database layer — single source of truth for the dashboard.
 * Uses better-sqlite3 (synchronous, no async needed).
 * Session stores remain JSON (gateway-owned, read-only).
 */
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

const HOME = process.env.HOME || ''
const DB_PATH = join(HOME, '.openclaw/dashboard.db')
const SOURCES_DIR = join(HOME, '.openclaw/sources')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  _db = new Database(DB_PATH, { fileMustExist: false })
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('busy_timeout = 5000')
  runMigrations(_db)
  return _db
}

// ─── Schema ───

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  team TEXT,
  role TEXT,
  model TEXT DEFAULT 'anthropic/claude-opus-4-6',
  workspace TEXT,
  status TEXT DEFAULT 'active',
  mm_username TEXT,
  mm_user_id TEXT,
  mm_token TEXT,
  permissions TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  source TEXT,
  path TEXT,
  manifest TEXT, -- JSON
  installed_at TEXT,
  installed_by TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  skill_id TEXT,
  PRIMARY KEY (agent_id, skill_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT,
  description TEXT,
  template TEXT,
  default_skills TEXT, -- JSON array
  rules TEXT -- JSON array
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'backlog',
  state TEXT DEFAULT 'backlog',
  progress INTEGER DEFAULT 0,
  lead TEXT,
  channel TEXT,
  channel_id TEXT,
  workspace TEXT,
  github_repo TEXT,
  github_created INTEGER DEFAULT 0,
  current_phase TEXT,
  last_nudge_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_agents (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT,
  PRIMARY KEY (project_id, agent_id)
);

CREATE TABLE IF NOT EXISTS project_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  agent_id TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'note',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS token_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  project_id TEXT,
  skill_id TEXT,
  session_id TEXT,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  input_cost REAL DEFAULT 0,
  output_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  action TEXT,
  trigger_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_token_events_agent ON token_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_events_project ON token_events(project_id);
CREATE INDEX IF NOT EXISTS idx_token_events_date ON token_events(created_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor TEXT,
  data TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`

function runMigrations(db: Database.Database) {
  db.exec(SCHEMA)

  // Check if already seeded
  const seeded = db.prepare('SELECT value FROM meta WHERE key = ?').get('seeded')
  if (!seeded) {
    seedFromJson(db)
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('seeded', new Date().toISOString())
  }
}

// ─── Seed from JSON sources ───

function readJson(filename: string): any {
  const p = join(SOURCES_DIR, filename)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return null }
}

function seedFromJson(db: Database.Database) {
  const tx = db.transaction(() => {
    // --- Agents ---
    const agentsData = readJson('agents.json')
    if (agentsData?.agents) {
      const insertAgent = db.prepare(`
        INSERT OR REPLACE INTO agents (id, name, emoji, team, role, model, workspace, status, mm_username, mm_user_id, mm_token, permissions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const a of agentsData.agents) {
        insertAgent.run(
          a.id, a.name, a.emoji, a.team, a.role, a.model,
          a.workspace, a.status || 'active',
          a.mattermost?.username || null,
          a.mattermost?.userId || null,
          a.mattermost?.token || null,
          a.permissions ? JSON.stringify(a.permissions) : null,
          a.createdAt || new Date().toISOString()
        )
      }
    }

    // --- Skills ---
    const skillsData = readJson('skills.json')
    if (skillsData?.installed) {
      const insertSkill = db.prepare(`
        INSERT OR REPLACE INTO skills (id, name, description, version, source, path, manifest, installed_at, installed_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const s of skillsData.installed) {
        insertSkill.run(
          s.id, s.name, s.description, s.version, s.source, s.path,
          s.manifest ? JSON.stringify(s.manifest) : null,
          s.installedAt, s.installedBy, s.status || 'active'
        )
      }
      // Assignments
      if (skillsData.assignments) {
        const insertAS = db.prepare('INSERT OR REPLACE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)')
        for (const [agentId, skills] of Object.entries(skillsData.assignments)) {
          for (const skillId of skills as string[]) {
            insertAS.run(agentId, skillId)
          }
        }
      }
    }

    // --- Teams ---
    const teamsData = readJson('teams.json')
    if (teamsData?.teams) {
      const insertTeam = db.prepare(`
        INSERT OR REPLACE INTO teams (id, name, channel, description, template, default_skills, rules)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const [id, t] of Object.entries(teamsData.teams) as [string, any][]) {
        insertTeam.run(
          id, t.name, t.channel, t.description || null, t.template || null,
          t.defaultSkills ? JSON.stringify(t.defaultSkills) : null,
          t.rules ? JSON.stringify(t.rules) : null
        )
      }
    }

    // --- Projects ---
    const projData = readJson('projects.json')
    if (projData?.projects) {
      const insertProj = db.prepare(`
        INSERT OR REPLACE INTO projects (id, name, description, type, status, state, progress, lead, channel, channel_id, workspace, github_repo, github_created, current_phase, last_nudge_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertPA = db.prepare('INSERT OR REPLACE INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')
      const insertPhase = db.prepare('INSERT INTO project_phases (project_id, name, status, started_at, completed_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      const insertUpdate = db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)')

      for (const p of projData.projects) {
        insertProj.run(
          p.id, p.name, p.description || null, p.type || null,
          p.status || 'backlog', p.state || 'backlog', p.progress || 0,
          p.lead || null, p.channel || null, p.channelId || null,
          p.workspace || null, p.github?.repo || null, p.github?.created ? 1 : 0,
          p.currentPhase || null, p.lastNudgeAt || null,
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString()
        )

        // Team/agents
        if (p.team && Array.isArray(p.team)) {
          for (const t of p.team) {
            if (typeof t === 'object') {
              insertPA.run(p.id, t.agent, t.role || null)
            } else {
              insertPA.run(p.id, t, null)
            }
          }
        }

        // Phases
        if (p.phases) {
          p.phases.forEach((ph: any, i: number) => {
            insertPhase.run(p.id, ph.name, ph.status || 'pending', ph.startedAt || null, ph.completedAt || null, i)
          })
        }

        // Updates
        if (p.updates) {
          for (const u of p.updates) {
            insertUpdate.run(p.id, u.agentId || null, u.message, u.type || 'note', u.timestamp || new Date().toISOString())
          }
        }
      }
    }

    // --- Token events ---
    const tokensData = readJson('tokens.json')
    if (tokensData?.usage) {
      const insertToken = db.prepare(`
        INSERT OR REPLACE INTO token_events (id, agent_id, project_id, skill_id, session_id, model, input_tokens, output_tokens, total_tokens, input_cost, output_cost, total_cost, action, trigger_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const e of tokensData.usage) {
        insertToken.run(
          e.id, e.agentId, e.projectId || null, e.skillId || null,
          e.sessionId || null, e.model,
          e.tokens?.input || 0, e.tokens?.output || 0, e.tokens?.total || 0,
          e.cost?.input || 0, e.cost?.output || 0, e.cost?.total || 0,
          e.context?.action || null, e.context?.trigger || null,
          e.timestamp
        )
      }
    }

    // --- Events ---
    const eventsData = readJson('events.json')
    if (eventsData?.events) {
      const insertEvent = db.prepare('INSERT OR REPLACE INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)')
      for (const e of eventsData.events) {
        insertEvent.run(e.id, e.type, e.actor || null, e.data ? JSON.stringify(e.data) : null, e.timestamp)
      }
    }
  })

  tx()
}

// ─── Live session data (read-only from gateway) ───

const AGENTS_DIR = join(HOME, '.openclaw/agents')
const DEFAULT_CTX = 200000

export interface LiveStats {
  totalTokens: number
  activeSessions: number
  maxPercentUsed: number
  lastActivity: string | null
}

export interface LiveSession {
  sessionKey: string
  model: string | null
  totalTokens: number
  inputTokens: number
  outputTokens: number
  contextWindow: number
  percentUsed: number
  lastActivity: string | null
}

export function getLiveStats(agentId: string): LiveStats {
  const sessFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json')
  if (!existsSync(sessFile)) {
    return { totalTokens: 0, activeSessions: 0, maxPercentUsed: 0, lastActivity: null }
  }
  try {
    const sess = JSON.parse(readFileSync(sessFile, 'utf-8'))
    let totalTokens = 0, activeSessions = 0, maxPercent = 0
    let lastActivity: string | null = null

    for (const val of Object.values(sess) as any[]) {
      const t = val.totalTokens || 0
      totalTokens += t
      if (t > 0) activeSessions++
      const ctx = val.contextTokens || DEFAULT_CTX
      const pct = ctx > 0 ? Math.round((t / ctx) * 100) : 0
      if (pct > maxPercent) maxPercent = pct
      const ua = val.updatedAt ? (typeof val.updatedAt === 'number' ? new Date(val.updatedAt).toISOString() : val.updatedAt) : null
      if (ua && (!lastActivity || ua > lastActivity)) lastActivity = ua
    }
    return { totalTokens, activeSessions, maxPercentUsed: maxPercent, lastActivity }
  } catch {
    return { totalTokens: 0, activeSessions: 0, maxPercentUsed: 0, lastActivity: null }
  }
}

export function getLiveSessions(agentId: string): LiveSession[] {
  const sessFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json')
  if (!existsSync(sessFile)) return []
  try {
    const sess = JSON.parse(readFileSync(sessFile, 'utf-8'))
    return Object.entries(sess).map(([key, val]: [string, any]) => {
      const t = val.totalTokens || 0
      const ctx = val.contextTokens || DEFAULT_CTX
      return {
        sessionKey: key,
        model: val.model || null,
        totalTokens: t,
        inputTokens: val.inputTokens || 0,
        outputTokens: val.outputTokens || 0,
        contextWindow: ctx,
        percentUsed: ctx > 0 ? Math.round((t / ctx) * 100) : 0,
        lastActivity: val.updatedAt ? (typeof val.updatedAt === 'number' ? new Date(val.updatedAt).toISOString() : val.updatedAt) : null,
      }
    })
  } catch { return [] }
}
