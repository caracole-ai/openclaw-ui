/**
 * POST /api/projects/:id/ceremony
 * Triggers a review or rex ceremony for a project.
 * 
 * Flow:
 * 1. Creates/gets MM channel
 * 2. Invites orchestrator + lio + contributing agents
 * 3. Posts kick-off message as admin (triggers orchestrator via MM binding)
 * 4. Stores channel info in project DB
 */
import { getDb } from '~/server/utils/db'
import { setupCeremonyChannel, getAgentMM, mmPostAsAdmin, LIO_USER_ID } from '~/server/utils/mattermost'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Project ID requis' })

  const body = await readBody(event)
  const ceremony = body.ceremony as 'review' | 'rex'
  if (!ceremony || !['review', 'rex'].includes(ceremony)) {
    throw createError({ statusCode: 400, statusMessage: 'ceremony must be "review" or "rex"' })
  }

  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  if (!project) throw createError({ statusCode: 404, statusMessage: `Projet '${id}' non trouvé` })

  const teamRows = db.prepare('SELECT agent_id FROM project_agents WHERE project_id = ?').all(id) as any[]
  const contributingAgentIds = teamRows.map(r => r.agent_id).filter(a => a !== 'main')

  if (contributingAgentIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucun agent contributeur sur ce projet' })
  }

  // 1. Setup MM channel (create, invite, kick-off message posted as orchestrator)
  const { channelId, channelName } = await setupCeremonyChannel({
    projectId: id,
    projectName: project.name,
    ceremony,
    contributingAgentIds,
  })

  // 2. Store channel info in project
  db.prepare('UPDATE projects SET channel = ?, channel_id = ? WHERE id = ?').run(channelName, channelId, id)

  // 3. Log the ceremony start
  db.prepare('INSERT INTO project_updates (project_id, agent_id, message, type, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
    id, 'system', `${ceremony === 'review' ? '🔍 Review' : '💡 REX'} lancé(e) — canal #${channelName} créé`, 'status'
  )

  // 4. Post coordination instructions as admin @lio (this triggers orchestrator via MM)
  // The orchestrator bot is in the channel, so it will receive this message
  const agentDetails = contributingAgentIds.map(aid => {
    const a = getAgentMM(aid)
    return a ? `${a.name} ${a.emoji} (${a.role}, agentId: ${aid})` : aid
  }).join(', ')

  const label = ceremony === 'review' ? 'Review' : 'REX'
  const docsDir = project.workspace ? `${project.workspace}/reviews` : `/Users/caracole/.openclaw/projects/${id}/reviews`
  const timestamp = new Date().toISOString().slice(0, 10)

  const triggerMessage = ceremony === 'review'
    ? `@orchestrator Lance la review séquentielle du projet **${project.name}**.

Agents à interroger dans l'ordre : ${agentDetails}

**Dossier documents** : \`${docsDir}\`

**Protocole** :
1. Pour chaque agent, utilise \`sessions_send\` pour demander sa review du projet.
2. Demande-lui d'écrire un fichier markdown complet dans \`${docsDir}/review-{agentId}-${timestamp}.md\` (qualité, architecture, suggestions, points forts/faibles).
3. Après sa réponse, lis le fichier et poste un résumé dans ce canal. Effet cumulatif : l'agent N reçoit les reviews des agents 1 à N-1 comme contexte.
4. À la fin, écris une synthèse dans \`${docsDir}/review-synthese-${timestamp}.md\` et poste-la ici.`
    : `@orchestrator Lance le REX séquentiel du projet **${project.name}**.

Agents à interroger dans l'ordre : ${agentDetails}

**Dossier documents** : \`${docsDir}\`

**Protocole** :
1. Pour chaque agent, utilise \`sessions_send\` pour demander son retour d'expérience.
2. Demande-lui d'écrire un fichier markdown dans \`${docsDir}/rex-{agentId}-${timestamp}.md\` (ce qui a marché, améliorations process, leçons apprises).
3. Après sa réponse, lis le fichier et poste un résumé ici. Effet cumulatif.
4. À la fin, écris une synthèse dans \`${docsDir}/rex-synthese-${timestamp}.md\` et poste-la ici.`

  // Post the protocol in the channel (from admin/lio)
  await mmPostAsAdmin(channelId, triggerMessage)

  return {
    ok: true,
    channelId,
    channelName,
    ceremony,
    agents: contributingAgentIds,
  }
})
