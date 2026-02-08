/**
 * POST /api/channels/mapping
 * Ajoute ou met à jour un mapping canal → projectId
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname } from 'path'

const MAPPING_FILE = process.env.CHANNEL_MAPPING_FILE || `${process.env.HOME}/.openclaw/channel-project-mapping.json`

interface ChannelProjectMapping {
  [channelId: string]: {
    projectId: string
    channelName: string
    addedAt: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  const { channelId, channelName, projectId } = body
  
  if (!channelId || !projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'channelId and projectId are required'
    })
  }

  try {
    // Ensure directory exists
    const dir = dirname(MAPPING_FILE)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
    
    // Load existing mapping
    let mapping: ChannelProjectMapping = {}
    if (existsSync(MAPPING_FILE)) {
      const content = await readFile(MAPPING_FILE, 'utf-8')
      mapping = JSON.parse(content)
    }
    
    // Update mapping
    mapping[channelId] = {
      projectId,
      channelName: channelName || channelId,
      addedAt: new Date().toISOString()
    }
    
    // Save
    await writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2))
    
    return { 
      success: true, 
      channelId, 
      projectId,
      mapping 
    }
  } catch (error: any) {
    console.error('[/api/channels/mapping] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update mapping',
      data: { error: error.message }
    })
  }
})
