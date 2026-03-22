/**
 * Tests d'intégration - Skills API
 * Teste les endpoints skills et agent_skills
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { tmpdir } from 'os'
import { join } from 'path'
import { rm } from 'fs/promises'
import { existsSync } from 'fs'

describe('Skills API - SQLite layer', () => {
  let db: Database.Database
  const dbPath = join(tmpdir(), `skills-test-${Date.now()}.db`)

  beforeEach(() => {
    db = new Database(dbPath)
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      );
      CREATE TABLE skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active'
      );
      CREATE TABLE agent_skills (
        agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
        skill_id TEXT,
        PRIMARY KEY (agent_id, skill_id)
      );
    `)

    // Seed test data
    db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run('winston', 'Winston')
    db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run('walid', 'Walid')
    db.prepare('INSERT INTO skills (id, name, description) VALUES (?, ?, ?)').run('github', 'GitHub CLI', 'Interact with GitHub')
    db.prepare('INSERT INTO skills (id, name, description) VALUES (?, ?, ?)').run('coding-agent', 'Coding Agent', 'Run coding agents')
    db.prepare('INSERT INTO skills (id, name, description) VALUES (?, ?, ?)').run('weather', 'Weather', 'Get weather info')
  })

  afterEach(async () => {
    db.close()
    if (existsSync(dbPath)) await rm(dbPath)
  })

  describe('GET /api/skills equivalent', () => {
    it('returns all installed skills', () => {
      const skills = db.prepare('SELECT * FROM skills ORDER BY name').all()
      expect(skills).toHaveLength(3)
    })

    it('returns assignments map', () => {
      db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'github')
      db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'coding-agent')

      const assignments = db.prepare('SELECT agent_id, skill_id FROM agent_skills').all() as any[]
      const map: Record<string, string[]> = {}
      for (const a of assignments) {
        if (!map[a.agent_id]) map[a.agent_id] = []
        map[a.agent_id].push(a.skill_id)
      }

      expect(map.winston).toEqual(['github', 'coding-agent'])
      expect(map.walid).toBeUndefined()
    })
  })

  describe('POST /api/agents/:id/skills equivalent', () => {
    it('assigns a skill to an agent', () => {
      db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'weather')
      const skills = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?').all('winston') as any[]
      expect(skills.map(s => s.skill_id)).toContain('weather')
    })

    it('INSERT OR IGNORE prevents duplicates', () => {
      db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'github')
      db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'github')

      const count = db.prepare('SELECT COUNT(*) as cnt FROM agent_skills WHERE agent_id = ? AND skill_id = ?').get('winston', 'github') as any
      expect(count.cnt).toBe(1)
    })
  })

  describe('DELETE /api/agents/:id/skills equivalent', () => {
    it('removes a skill from an agent', () => {
      db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'github')
      db.prepare('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?').run('winston', 'github')

      const skills = db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?').all('winston')
      expect(skills).toHaveLength(0)
    })

    it('does not error when removing non-existent assignment', () => {
      const info = db.prepare('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?').run('winston', 'nonexistent')
      expect(info.changes).toBe(0)
    })
  })

  describe('DELETE /api/projects/:id equivalent', () => {
    it('cascade deletes related data', () => {
      db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE project_agents (
          project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
          agent_id TEXT,
          PRIMARY KEY (project_id, agent_id)
        );
      `)
      db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run('p1', 'Test Project')
      db.prepare('INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)').run('p1', 'winston')

      db.prepare('DELETE FROM projects WHERE id = ?').run('p1')

      const agents = db.prepare('SELECT * FROM project_agents WHERE project_id = ?').all('p1')
      expect(agents).toHaveLength(0)
    })
  })

  describe('Agent skills from agent detail', () => {
    it('returns skill IDs for a specific agent', () => {
      db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'github')
      db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('winston', 'coding-agent')
      db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run('walid', 'weather')

      const winstonSkills = (db.prepare('SELECT skill_id FROM agent_skills WHERE agent_id = ?').all('winston') as any[]).map(r => r.skill_id)
      expect(winstonSkills.sort()).toEqual(['coding-agent', 'github'])
      expect(winstonSkills).not.toContain('weather')
    })
  })
})
