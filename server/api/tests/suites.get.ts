/**
 * GET /api/tests/suites
 * Data integrity tests using SQLite
 */
import { getDb } from '~/server/utils/db'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

function runSuite(name: string, tests: (() => TestResult)[]): { name: string; results: TestResult[]; passed: number; failed: number } {
  const results = tests.map(t => { try { return t() } catch (e: any) { return { name: 'unknown', status: 'fail' as const, message: e.message } } })
  return { name, results, passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length }
}

export default defineEventHandler(() => {
  const db = getDb()

  // Suite 1: Data integrity
  const integrity = runSuite('Data Integrity', [
    () => {
      const count = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as any).c
      return { name: 'Agents exist', status: count > 0 ? 'pass' : 'fail', message: `${count} agents` }
    },
    () => {
      const count = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as any).c
      return { name: 'Projects exist', status: count > 0 ? 'pass' : 'fail', message: `${count} projects` }
    },
    () => {
      const count = (db.prepare('SELECT COUNT(*) as c FROM skills').get() as any).c
      return { name: 'Skills exist', status: count > 0 ? 'pass' : 'fail', message: `${count} skills` }
    },
    () => {
      const count = (db.prepare('SELECT COUNT(*) as c FROM teams').get() as any).c
      return { name: 'Teams exist', status: count > 0 ? 'pass' : 'fail', message: `${count} teams` }
    },
  ])

  // Suite 2: Cross-references
  const crossRefs = runSuite('Cross References', [
    () => {
      const orphans = db.prepare(`
        SELECT pa.agent_id FROM project_agents pa
        LEFT JOIN agents a ON a.id = pa.agent_id
        WHERE a.id IS NULL
      `).all()
      return { name: 'No orphan project_agents', status: orphans.length === 0 ? 'pass' : 'fail', message: orphans.length === 0 ? 'OK' : `${orphans.length} orphans` }
    },
    () => {
      const orphans = db.prepare(`
        SELECT as2.agent_id, as2.skill_id FROM agent_skills as2
        LEFT JOIN agents a ON a.id = as2.agent_id
        WHERE a.id IS NULL
      `).all()
      return { name: 'No orphan agent_skills', status: orphans.length === 0 ? 'pass' : 'fail', message: orphans.length === 0 ? 'OK' : `${orphans.length} orphans` }
    },
    () => {
      // Check all agents have workspace
      const noWorkspace = db.prepare('SELECT id FROM agents WHERE workspace IS NULL OR workspace = \'\'').all()
      return { name: 'All agents have workspace', status: noWorkspace.length === 0 ? 'pass' : 'warn', message: noWorkspace.length === 0 ? 'OK' : `${noWorkspace.length} missing` }
    },
  ])

  // Suite 3: Schema check
  const schema = runSuite('Schema Health', [
    () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[]
      const expected = ['agents', 'skills', 'agent_skills', 'teams', 'projects', 'project_agents', 'project_phases', 'project_updates', 'token_events', 'events', 'meta']
      const missing = expected.filter(t => !tables.find(r => r.name === t))
      return { name: 'All tables present', status: missing.length === 0 ? 'pass' : 'fail', message: missing.length === 0 ? `${tables.length} tables` : `Missing: ${missing.join(', ')}` }
    },
    () => {
      const seeded = db.prepare('SELECT value FROM meta WHERE key = ?').get('seeded') as any
      return { name: 'DB seeded', status: seeded ? 'pass' : 'fail', message: seeded ? `Seeded at ${seeded.value}` : 'Not seeded' }
    },
  ])

  const suites = [integrity, crossRefs, schema]
  const totalPassed = suites.reduce((s, suite) => s + suite.passed, 0)
  const totalFailed = suites.reduce((s, suite) => s + suite.failed, 0)

  return { suites, summary: { totalPassed, totalFailed, totalTests: totalPassed + totalFailed }, timestamp: new Date().toISOString() }
})
