/**
 * Endpoint POST /api/sessions/send
 * Envoie un message dans une session OpenClaw
 * Utilisé pour /clear et autres commandes
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    // Utiliser openclaw CLI pour envoyer le message
    // La commande sessions_send de l'API tool interne
    const escapedMessage = message.replace(/"/g, '\\"')
    const escapedKey = sessionKey.replace(/"/g, '\\"')
    
    // On utilise openclaw send qui envoie un message dans une session
    const command = `openclaw send --session "${escapedKey}" "${escapedMessage}"`
    
    const { stdout, stderr } = await execAsync(command, {
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
