/**
 * GET /api/tests/endpoints
 * E2E test: calls all API endpoints via internal $fetch
 */
export default defineEventHandler(async (event) => {
  const endpoints = [
    { path: '/api/agents', check: (d: any) => `${d.agents?.length} agents` },
    { path: '/api/agents/main', check: (d: any) => `name=${d.name} team=${d.team}` },
    { path: '/api/agents/amelia', check: (d: any) => `name=${d.name} skills=${d.skills?.length}` },
    { path: '/api/projects', check: (d: any) => `${d.projects?.length} projects` },
    { path: '/api/projects/dashboard', check: (d: any) => `name=${d.name || d.id}` },
    { path: '/api/projects/dashboard/docs', check: (d: any) => `${(d.docs || []).length} docs` },
    { path: '/api/skills', check: (d: any) => `${d.installed?.length} installed` },
    { path: '/api/tokens/summary', check: (d: any) => `topAgents=${d.topAgents?.length || 0}` },
    { path: '/api/tokens/timeline', check: (d: any) => `points=${d.timeline?.length || 0}` },
  ]

  const results = []

  for (const ep of endpoints) {
    const start = Date.now()
    try {
      const data = await $fetch(ep.path)
      const duration = Date.now() - start
      const detail = ep.check(data)
      results.push({ path: ep.path, status: 'pass', httpStatus: 200, durationMs: duration, detail })
    } catch (err: any) {
      results.push({ path: ep.path, status: 'fail', durationMs: Date.now() - start, message: err.message || String(err) })
    }
  }

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length

  return { results, summary: { total: results.length, passed, failed }, timestamp: new Date().toISOString() }
})
