import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const ALLOWED_SOURCES = ['agents', 'projects', 'teams', 'skills', 'tokens', 'events']
const SOURCES_DIR = join(process.env.HOME || '', '.openclaw/sources')

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

async function logEvent(action: string, filename: string) {
  try {
    const eventsPath = join(SOURCES_DIR, 'events.json')
    let events: any = { events: [] }
    try {
      events = JSON.parse(await readFile(eventsPath, 'utf-8'))
    } catch {}
    events.events.push({
      id: `evt-${Date.now()}`,
      type: `source:patched`,
      timestamp: new Date().toISOString(),
      actor: 'api',
      data: { source: filename, action }
    })
    await writeFile(eventsPath, JSON.stringify(events, null, 2))
  } catch {}
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename || !ALLOWED_SOURCES.includes(filename)) {
    throw createError({ statusCode: 400, statusMessage: `Source invalide. Autorisées: ${ALLOWED_SOURCES.join(', ')}` })
  }

  const patch = await readBody(event)
  if (!patch || typeof patch !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Body JSON requis' })
  }

  const filePath = join(SOURCES_DIR, `${filename}.json`)

  try {
    let current: any = {}
    try {
      current = JSON.parse(await readFile(filePath, 'utf-8'))
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err
    }

    const merged = deepMerge(current, patch)
    await writeFile(filePath, JSON.stringify(merged, null, 2))
    await logEvent('patch', filename)

    return merged
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur écriture source', data: { error: err.message } })
  }
})
