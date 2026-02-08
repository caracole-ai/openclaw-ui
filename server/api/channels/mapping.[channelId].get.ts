/**
 * GET /api/channels/mapping/:channelId
 * Récupère le projectId pour un canal donné
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const MAPPING_FILE = process.env.CHANNEL_MAPPING_FILE || `${process.env.HOME}/.openclaw/channel-project-mapping.json`

export default defineEventHandler(async (event) => {
  const channelId = getRouterParam(event, 'channelId')
  
  if (!channelId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'channelId is required'
    })
  }

  try {
    if (!existsSync(MAPPING_FILE)) {
      return { channelId, projectId: null, found: false }
    }
    
    const content = await readFile(MAPPING_FILE, 'utf-8')
    const mapping = JSON.parse(content)
    
    const entry = mapping[channelId]
    
    if (entry) {
      return { 
        channelId, 
        projectId: entry.projectId, 
        channelName: entry.channelName,
        addedAt: entry.addedAt,
        found: true 
      }
    }
    
    return { channelId, projectId: null, found: false }
  } catch (error: any) {
    console.error('[/api/channels/mapping] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get mapping',
      data: { error: error.message }
    })
  }
})
