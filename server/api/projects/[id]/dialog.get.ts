/**
 * GET /api/projects/:id/dialog
 * Returns conversation messages from the project's dialog channel with Cloclo.
 */
import { getDb } from '~/server/utils/db'
import { mmApi, getAgentMM, mmCreateChannel, mmAddToChannel } from '~/server/utils/mattermost'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projet non trouvé' })

  // Get or create the dialog channel
  const channelName = `dialog-${id}`.slice(0, 64)
  let channel: any
  try {
    channel = await mmApi('GET', `/teams/${process.env.MATTERMOST_TEAM_ID}/channels/name/${channelName}`)
  } catch {
    // Channel doesn't exist yet — return empty
    return { messages: [], channelId: null }
  }

  // Fetch recent posts
  try {
    const postsData = await mmApi('GET', `/channels/${channel.id}/posts?per_page=50`)
    const posts = postsData?.posts || {}
    const order = postsData?.order || []

    // Get agents info for display
    const orchestrator = getAgentMM('main')

    const messages = order.reverse().map((postId: string) => {
      const post = posts[postId]
      if (!post || post.type) return null // Skip system messages

      const isOrchestrator = orchestrator && post.user_id === orchestrator.mattermost.userId
      return {
        id: post.id,
        content: post.message,
        timestamp: post.create_at,
        sender: isOrchestrator ? 'cloclo' : 'lio',
        senderName: isOrchestrator ? `${orchestrator.emoji} ${orchestrator.name}` : '👤 Lio',
      }
    }).filter(Boolean)

    return { messages, channelId: channel.id }
  } catch (err: any) {
    console.error(`[dialog] Failed to fetch messages:`, err.message)
    return { messages: [], channelId: channel.id }
  }
})
