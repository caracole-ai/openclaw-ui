/**
 * WebSocket endpoint for real-time updates.
 * Clients connect here to receive data:updated events.
 */
import { registerWSClient, unregisterWSClient } from '../plugins/source-watcher'

export default defineEventHandler({
  handler: () => {},
  
  websocket: {
    open(peer) {
      console.log('[ws] Client connected:', peer.id)
      registerWSClient(peer)
      
      // Send welcome message
      peer.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      }))
    },

    close(peer) {
      console.log('[ws] Client disconnected:', peer.id)
      unregisterWSClient(peer)
    },

    error(peer, error) {
      console.error('[ws] Error for peer', peer.id, ':', error)
    },

    message(peer, message) {
      console.log('[ws] Message from', peer.id, ':', message.text())
      
      // Echo back for now (can be extended with commands)
      peer.send(JSON.stringify({
        type: 'echo',
        data: message.text()
      }))
    }
  }
})
