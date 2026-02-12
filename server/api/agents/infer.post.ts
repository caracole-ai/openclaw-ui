import { readFile } from 'fs/promises'
import { join } from 'path'

const OPENCLAW_DIR = join(process.env.HOME || '', '.openclaw')

// ─── LLM inference (if ANTHROPIC_API_KEY available) ────────────
async function llmInfer(prompt: string, context: { teams: string[], skills: string[], projects: string[] }): Promise<any | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const systemPrompt = `Tu crées des profils d'agents IA. Contexte :
- Équipes : ${context.teams.join(', ')} (ou nouvelles)
- Skills : ${context.skills.join(', ')}
- Projets : ${context.projects.join(', ')}

Réponds UNIQUEMENT en JSON valide, sans backticks :
{"id":"lowercase","name":"Prénom","emoji":"emoji","role":"rôle","team":"team","model":"","skills":[],"projects":[],"soulDescription":"description fr, 2-3 phrases"}

Règles : id=prénom minuscule, emoji=reflet du rôle, skills pertinents, team=code|system|writing|creative|ops, model vide.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as any
    const text = data.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch {
    return null
  }
}

// ─── Role → metadata mapping ──────────────────────────────────
const ROLE_PROFILES: Record<string, { emoji: string, team: string, skills: string[], soulTemplate: string }> = {
  // Code roles
  'developer':   { emoji: '💻', team: 'code', skills: ['github', 'coding-agent', 'chrome-devtools-mcp'], soulTemplate: 'Développeur·se rigoureux·se, code propre et efficace.' },
  'dev':         { emoji: '💻', team: 'code', skills: ['github', 'coding-agent', 'chrome-devtools-mcp'], soulTemplate: 'Développeur·se rigoureux·se, code propre et efficace.' },
  'développeur': { emoji: '💻', team: 'code', skills: ['github', 'coding-agent', 'chrome-devtools-mcp'], soulTemplate: 'Développeur·se rigoureux·se, code propre et efficace.' },
  'développeuse':{ emoji: '💻', team: 'code', skills: ['github', 'coding-agent', 'chrome-devtools-mcp'], soulTemplate: 'Développeuse rigoureuse, code propre et efficace.' },
  'architect':   { emoji: '🏗️', team: 'code', skills: ['github', 'coding-agent'], soulTemplate: 'Architecte logiciel, vision macro et patterns solides.' },
  'architecte':  { emoji: '🏗️', team: 'code', skills: ['github', 'coding-agent'], soulTemplate: 'Architecte logiciel, vision macro et patterns solides.' },
  'devops':      { emoji: '⚙️', team: 'ops', skills: ['github', 'coding-agent'], soulTemplate: 'Spécialiste DevOps, infra fiable et automatisée.' },
  'config':      { emoji: '⚙️', team: 'code', skills: ['github', 'coding-agent', 'mattermost-mcp'], soulTemplate: 'Expert config et intégration, tout doit être branché proprement.' },
  'reviewer':    { emoji: '🔍', team: 'code', skills: ['github', 'coding-agent'], soulTemplate: 'Code reviewer exigeant, feedback constructif et précis.' },
  'tester':      { emoji: '🧪', team: 'code', skills: ['github', 'coding-agent', 'chrome-devtools-mcp'], soulTemplate: 'Spécialiste QA, rien ne passe sans tests.' },
  'qa':          { emoji: '🧪', team: 'code', skills: ['github', 'coding-agent', 'chrome-devtools-mcp'], soulTemplate: 'Spécialiste QA, rien ne passe sans tests.' },

  // Creative roles
  'designer':    { emoji: '🎨', team: 'creative', skills: ['nano-banana-pro', 'peekaboo'], soulTemplate: 'Designer créatif·ve, esthétique et fonctionnel.' },
  'illustrateur':{ emoji: '🖌️', team: 'creative', skills: ['nano-banana-pro'], soulTemplate: 'Illustrateur passionné, images qui racontent des histoires.' },
  'illustratrice':{ emoji: '🖌️', team: 'creative', skills: ['nano-banana-pro'], soulTemplate: 'Illustratrice passionnée, images qui racontent des histoires.' },
  'ui':          { emoji: '🎯', team: 'creative', skills: ['peekaboo', 'chrome-devtools-mcp'], soulTemplate: 'Spécialiste UI, interfaces intuitives et élégantes.' },
  'ux':          { emoji: '🧭', team: 'creative', skills: ['peekaboo', 'chrome-devtools-mcp'], soulTemplate: 'Spécialiste UX, l\'utilisateur d\'abord.' },

  // Writing roles
  'writer':      { emoji: '✍️', team: 'writing', skills: [], soulTemplate: 'Rédacteur·rice précis·e, chaque mot compte.' },
  'rédacteur':   { emoji: '✍️', team: 'writing', skills: [], soulTemplate: 'Rédacteur précis, chaque mot compte.' },
  'rédactrice':  { emoji: '✍️', team: 'writing', skills: [], soulTemplate: 'Rédactrice précise, chaque mot compte.' },
  'romancier':   { emoji: '📖', team: 'writing', skills: [], soulTemplate: 'Romancier passionné, narrateur d\'univers.' },
  'romancière':  { emoji: '📖', team: 'writing', skills: [], soulTemplate: 'Romancière passionnée, narratrice d\'univers.' },
  'copywriter':  { emoji: '📝', team: 'writing', skills: [], soulTemplate: 'Copywriter percutant, mots qui vendent.' },
  'poète':       { emoji: '🌹', team: 'writing', skills: [], soulTemplate: 'Poète sensible, maître des mots et des rythmes.' },
  'scénariste':  { emoji: '🎬', team: 'writing', skills: [], soulTemplate: 'Scénariste inventif·ve, dialogues et structure narrative.' },
  'journaliste': { emoji: '📰', team: 'writing', skills: [], soulTemplate: 'Journaliste rigoureux·se, faits et clarté.' },
  'traducteur':  { emoji: '🌐', team: 'writing', skills: [], soulTemplate: 'Traducteur fidèle, nuances et contexte culturel.' },
  'traductrice': { emoji: '🌐', team: 'writing', skills: [], soulTemplate: 'Traductrice fidèle, nuances et contexte culturel.' },

  // Ops roles
  'monitor':     { emoji: '📊', team: 'ops', skills: [], soulTemplate: 'Monitoring et alertes, rien n\'échappe à la surveillance.' },
  'orchestrator':{ emoji: '🎭', team: 'system', skills: ['mattermost-mcp'], soulTemplate: 'Orchestrateur multi-agents, coordination efficace.' },

  // Default
  'assistant':   { emoji: '🤖', team: 'system', skills: [], soulTemplate: 'Assistant polyvalent, toujours prêt à aider.' },
}

// ─── Team keywords ─────────────────────────────────────────────
const TEAM_KEYWORDS: Record<string, string> = {
  'code': 'code', 'dev': 'code', 'technique': 'code', 'tech': 'code', 'backend': 'code', 'frontend': 'code',
  'creative': 'creative', 'créatif': 'creative', 'créative': 'creative', 'design': 'creative', 'art': 'creative',
  'writing': 'writing', 'écriture': 'writing', 'rédaction': 'writing', 'littéraire': 'writing',
  'system': 'system', 'système': 'system', 'ops': 'ops', 'infra': 'ops',
}

function inferAgent(prompt: string) {
  const lower = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const original = prompt.toLowerCase()

  // Extract name — first word (usually the name comes first in the description)
  const firstWord = prompt.split(/[\s,]+/)[0].trim()
  // If first word is capitalized, use it; otherwise find first capitalized word
  const name = /^[A-ZÀ-Ö]/.test(firstWord) ? firstWord : (prompt.match(/\b([A-ZÀ-Ö][a-zà-ö]+)\b/)?.[1] || firstWord)
  const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '')

  // Find role — match against known roles in the prompt
  let matchedRole: string | null = null
  let matchedProfile = ROLE_PROFILES['assistant']

  // Sort roles by length (longest first) to avoid "dev" matching before "développeuse"
  const sortedRoles = Object.entries(ROLE_PROFILES).sort((a, b) => b[0].length - a[0].length)
  for (const [role, profile] of sortedRoles) {
    const roleNorm = role.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (original.includes(role) || lower.includes(roleNorm)) {
      matchedRole = role
      matchedProfile = profile
      break
    }
  }

  // If no exact role match, try to infer from context
  if (!matchedRole) {
    if (/roman|fiction|livre|histoire|narrat|balzac|zola|hugo|flaubert|proust|dumas/i.test(prompt)) {
      matchedRole = 'romancier'
      matchedProfile = ROLE_PROFILES['romancier']
    } else if (/code|program|typescript|javascript|python|react|vue|nuxt|api/i.test(prompt)) {
      matchedRole = 'developer'
      matchedProfile = ROLE_PROFILES['developer']
    } else if (/design|ui|ux|maquette|interface|pixel|illustr/i.test(prompt)) {
      matchedRole = 'designer'
      matchedProfile = ROLE_PROFILES['designer']
    } else if (/write|redig|blog|article|copy|content/i.test(prompt)) {
      matchedRole = 'writer'
      matchedProfile = ROLE_PROFILES['writer']
    }
  }

  // Find team override from prompt
  let team = matchedProfile.team
  for (const [keyword, teamName] of Object.entries(TEAM_KEYWORDS)) {
    if (lower.includes(keyword)) {
      team = teamName
      break
    }
  }

  // Build soul description with context from prompt
  let soulDescription = matchedProfile.soulTemplate
  // Add style/specifics from prompt
  const styleMatch = prompt.match(/style\s+(\w+)/i)
  if (styleMatch) {
    soulDescription += ` Style ${styleMatch[1]}, ancré dans la tradition.`
  }
  const specMatch = prompt.match(/spécialisé(?:e)?\s+(?:en|dans)\s+(.+?)(?:\.|,|$)/i)
  if (specMatch) {
    soulDescription += ` Spécialisé·e en ${specMatch[1]}.`
  }

  return {
    id,
    name,
    emoji: matchedProfile.emoji,
    role: matchedRole || 'assistant',
    team,
    model: '',
    skills: matchedProfile.skills,
    projects: [] as string[],
    soulDescription,
  }
}

export default defineEventHandler(async (event) => {
  const { prompt } = await readBody<{ prompt: string }>(event)

  if (!prompt?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  }

  const context = await getExistingContext()

  // Try LLM first (if API key available), fallback to heuristics
  const llmResult = await llmInfer(prompt, context)

  if (llmResult) {
    return {
      success: true,
      mode: 'llm',
      agent: {
        id: llmResult.id,
        name: llmResult.name,
        emoji: llmResult.emoji,
        role: llmResult.role,
        team: llmResult.team,
        model: llmResult.model || '',
        skills: llmResult.skills || [],
        projects: llmResult.projects || [],
      },
      soulDescription: llmResult.soulDescription || '',
    }
  }

  // Fallback: heuristic inference
  const agent = inferAgent(prompt)

  return {
    success: true,
    mode: 'heuristic',
    agent: {
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      role: agent.role,
      team: agent.team,
      model: agent.model,
      skills: agent.skills,
      projects: agent.projects,
    },
    soulDescription: agent.soulDescription,
  }
})
