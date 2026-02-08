/**
 * GET /api/channels/mapping
 * Récupère le mapping canal Mattermost → projectId
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const MAPPING_FILE = process.env.CHANNEL_MAPPING_FILE || `${process.env.HOME}/.openclaw/channel-project-mapping.json`

export interface ChannelProjectMapping {
  [channelId: string]: {
    projectId: string
    channelName: string
    addedAt: string
  }
}

export default defineEventHandler(async () => {
  try {
    if (!existsSync(MAPPING_FILE)) {
      return { mapping: {}, file: MAPPING_FILE }
    }
    
    const content = await readFile(MAPPING_FILE, 'utf-8')
    const mapping: ChannelProjectMapping = JSON.parse(content)
    
    return { mapping, file: MAPPING_FILE }
  } catch (error: any) {
    console.error('[/api/channels/mapping] Error:', error.message)
    return { mapping: {}, file: MAPPING_FILE, error: error.message }
  }
})
