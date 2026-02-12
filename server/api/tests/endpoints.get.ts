/**
 * GET /api/tests/endpoints
 * E2E test: calls all API endpoints internally and reports status
 */
export default defineEventHandler(async (event) => {
  const baseUrl = getRequestURL(event)
  const origin = `${baseUrl.protocol}//${baseUrl.host}`

  const endpoints = [
    { path: '/api/agents', check: (d: any) => `${d.agents?.length} agents` },
    { path: '/api/agents/main', check: (d: any) => `name=${d.name} team=${d.team}` },
    { path: '/api/agents/amelia', check: (d: any) => `name=${d.name} projects=${d.projects?.length}` },
    { path: '/api/agents/main/live', check: (d: any) => `tokens=${d.totalTokens} sessions=${d.sessions?.length}` },
    { path: '/api/agents/amelia/live', check: (d: any) => `tokens=${d.totalTokens}` },
    { path: '/api/projects', check: (d: any) => `${d.projects?.length} projects` },
    { path: '/api/projects/dashboard', check: (d: any) => `name=${d.name || d.id}` },
    { path: '/api/projects/dashboard/docs', check: (d: any) => `${(Array.isArray(d) ? d : d.docs || []).length} docs` },
    { path: '/api/skills', check: (d: any) => `${d.installed?.length} installed` },
    { path: '/api/tokens/summary', check: (d: any) => `topAgents=${d.topAgents?.length || 0}` },
    { path: '/api/tokens/timeline', check: (d: any) => `keys=${Object.keys(d).length}` },
  ]

  const results = []
  for (const ep of endpoints) {
    const start = Date.now()
    try {
      const res = await fetch(`${origin}${ep.path}`)
      const durationMs = Date.now() - start
      if (res.status >= 400) {
        results.push({ path: ep.path, status: 'fail', httpStatus: res.status, durationMs, message: await res.text() })
        continue
      }
      const data = await res.json()
      results.push({ path: ep.path, status: 'pass', httpStatus: res.status, durationMs, detail: ep.check(data) })
    } catch (e: any) {
      results.push({ path: ep.path, status: 'fail', durationMs: Date.now() - start, message: e.message })
    }
  }

  const pass = results.filter(r => r.status === 'pass').length
  const fail = results.filter(r => r.status === 'fail').length

  return {
    results,
    summary: { total: results.length, pass, fail },
    timestamp: new Date().toISOString(),
  }
})
