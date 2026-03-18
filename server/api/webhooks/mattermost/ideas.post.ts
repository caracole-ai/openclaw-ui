/**
 * POST /api/webhooks/mattermost/ideas
 * Webhook handler for "IDEAS to DASHBOARD" channel
 * Creates project + Mattermost channel + assigns agents
 */
import { getDb } from '~/server/utils/db'
import { matchAgents, createProjectChannel, inviteAgentsToChannel, postBriefToChannel } from '~/server/utils/mattermost'

interface IdeaWebhookPayload {
  channel_name: string
  user_name: string
  text: string
  token: string
  channel_id?: string
  user_id?: string
  team_id?: string
  timestamp?: number
}

export default defineEventHandler(async (event) => {
  const payload = await readBody<IdeaWebhookPayload>(event)

  // Verify webhook token
  const expectedToken = process.env.MATTERMOST_WEBHOOK_SECRET
  if (!expectedToken || payload.token !== expectedToken) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook token' })
  }

  // Filter: only "IDEAS to DASHBOARD" channel + user "lio"
  if (payload.channel_name !== 'IDEAS to DASHBOARD' || payload.user_name.toLowerCase() !== 'lio') {
    return { status: 'ignored', reason: 'Wrong channel or user' }
  }

  // Parse message
  const { title, description } = parseMessage(payload.text)
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot parse title from message' })
  }

  // Match agents based on expertise
  const agents = await matchAgents(description)

  // Create project in DB
  const db = getDb()
  const projectId = generateProjectId(title)
  const now = new Date().toISOString()

  try {
    db.prepare(`
      INSERT INTO projects (id, name, description, status, state, progress, created_at, updated_at, document_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      title,
      description || null,
      'backlog',
      'backlog',
      0,
      now,
      now,
      'pending'
    )

    // Assign matched agents
    const insertPA = db.prepare('INSERT INTO project_agents (project_id, agent_id, role) VALUES (?, ?, ?)')
    for (const agent of agents) {
      insertPA.run(projectId, agent.id, agent.role || null)
    }

    // Create Mattermost channel
    const channelSlug = slugify(title)
    const channelName = `proj-${projectId}-${channelSlug}`.substring(0, 64) // Mattermost limit
    const channelDisplayName = `📋 ${title}`.substring(0, 64)

    const channelId = await createProjectChannel(channelName, channelDisplayName)

    // Update project with channel ID
    db.prepare('UPDATE projects SET channel_id = ?, idea_channel_id = ? WHERE id = ?').run(channelId, channelId, projectId)

    // Invite agents to channel
    const mattermostUserIds = agents.map(a => a.mm_user_id).filter(Boolean) as string[]
    await inviteAgentsToChannel(channelId, mattermostUserIds)

    // Post brief
    const brief = generateBrief(title, description, agents)
    await postBriefToChannel(channelId, brief)

    // Log event
    db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `evt-${Date.now()}`,
      'project.created_from_idea',
      'lio',
      JSON.stringify({ projectId, channelId, agents: agents.map(a => a.id) }),
      now
    )

    // Structured logging (for audit trail)
    console.log(JSON.stringify({
      event: 'project_created_from_ideas',
      projectId,
      title,
      channelId,
      channelName,
      agents: agents.map(a => ({ id: a.id, name: a.name })),
      timestamp: now,
    }))

    return {
      status: 'success',
      projectId,
      channelId,
      channelName,
      assignedAgents: agents.map(a => a.name),
    }
  } catch (error: any) {
    console.error('[ideas] Failed to create project:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create project: ${error.message}`,
    })
  }
})

// ─── Helpers ───

function parseMessage(text: string): { title: string; description: string } {
  const lines = text.trim().split('\n')
  
  if (lines.length === 1) {
    return { title: lines[0], description: '' }
  }

  const title = lines[0]
  const description = lines.slice(1).join('\n').trim()
  
  return { title, description }
}

function generateProjectId(title: string): string {
  const slug = slugify(title).substring(0, 30)
  const timestamp = Date.now().toString().slice(-6)
  return `${slug}-${timestamp}`
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateBrief(title: string, description: string, agents: any[]): string {
  const agentList = agents.map(a => `- @${a.name} (${a.role})`).join('\n')

  return `# 📋 Projet : ${title}

**Créé automatiquement depuis IDEAS to DASHBOARD**

## Description

${description || '_Aucune description fournie_'}

## Agents assignés

${agentList}

## Votre mission

1. **Analyser** le sujet et proposer des approches
2. **Collaborer** pour produire un document MD structuré :
   - Objectifs
   - Contraintes
   - Architecture technique (si applicable)
   - Plan d'implémentation
   - Risques & dépendances

3. **Poster** le document final dans ce canal avec mention @orchestrator

## Format attendu

\`\`\`markdown
# ${title}

## Objectifs
...

## Approche
...

## Implémentation
...
\`\`\`

---
**Statut actuel** : backlog

_Transitions manuelles : backlog → planning (Lio), planning → build (Lio)_
`
}
