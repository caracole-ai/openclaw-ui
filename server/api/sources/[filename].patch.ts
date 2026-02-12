/**
 * PATCH /api/sources/:filename
 * Legacy compat — redirects to proper endpoints.
 * For now, returns 410 Gone to signal migration to specific endpoints.
 */
export default defineEventHandler((event) => {
  const filename = getRouterParam(event, 'filename')
  throw createError({
    statusCode: 410,
    statusMessage: `PATCH /api/sources/${filename} is deprecated. Use specific endpoints (POST/PATCH /api/agents, /api/projects, etc.).`
  })
})
