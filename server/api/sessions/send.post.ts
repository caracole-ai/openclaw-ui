/**
 * Endpoint POST /api/sessions/send
 * Envoie un message dans une session OpenClaw
 * Utilisé pour /clear et autres commandes
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  const { sessionKey, message } = body
  
  if (!sessionKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sessionKey is required'
    })
  }
  
  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'message is required'
    })
  }

  try {
    const { stdout } = await execFileAsync('openclaw', ['send', '--session', sessionKey, message], {
      timeout: 30000
    })

    return {
      success: true,
      sessionKey,
      message,
      response: stdout.trim()
    }
  } catch (error: any) {
    console.error('[/api/sessions/send] Error:', error.message)
    
    // Si la commande openclaw send n'existe pas, on essaie une autre approche
    // via l'API REST du gateway si disponible
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send message to session',
      data: { error: error.message }
    })
  }
})
