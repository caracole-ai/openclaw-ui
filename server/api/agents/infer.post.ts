import { readFile } from 'fs/promises'
import { join } from 'path'

const OPENCLAW_DIR = join(process.env.HOME || '', '.openclaw')

async function getAnthropicToken(): Promise<string> {
  // Read from OpenClaw's auth profiles
  const authPath = join(OPENCLAW_DIR, 'agents', 'main', 'agent', 'auth-profiles.json')
  const raw = await readFile(authPath, 'utf-8')
  const profiles = JSON.parse(raw)
  // Find anthropic profile
  for (const [, profile] of Object.entries(profiles) as [string, any][]) {
    if (profile.provider === 'anthropic' && profile.token) {
      return profile.token
    }
  }
  throw new Error('No Anthropic token found')
}

async function getExistingContext(): Promise<{ teams: string[], skills: string[], projects: string[] }> {
  const teams = new Set<string>()
  const skills = new Set<string>()
  const projects = new Set<string>()

  try {
    const agentsRaw = await readFile(join(OPENCLAW_DIR, 'sources', 'agents.json'), 'utf-8')
    const agentsData = JSON.parse(agentsRaw)
    for (const a of agentsData.agents || []) {
      if (a.team) teams.add(a.team)
      for (const s of a.skills || []) skills.add(s)
      for (const p of a.projects || []) projects.add(p)
    }
  } catch {}

  try {
    const projRaw = await readFile(join(OPENCLAW_DIR, 'sources', 'projects.json'), 'utf-8')
    const projData = JSON.parse(projRaw)
    for (const p of projData.projects || []) projects.add(p.id)
  } catch {}

  return {
    teams: Array.from(teams),
    skills: Array.from(skills),
    projects: Array.from(projects),
  }
}

export default defineEventHandler(async (event) => {
  const { prompt } = await readBody<{ prompt: string }>(event)

  if (!prompt?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  }

  const token = await getAnthropicToken()
  const context = await getExistingContext()

  const systemPrompt = `Tu es un assistant qui crée des profils d'agents IA. À partir d'une description libre, tu génères un profil complet.

Contexte existant :
- Équipes disponibles : ${context.teams.join(', ')} (tu peux en créer de nouvelles)
- Skills disponibles : ${context.skills.join(', ')}
- Projets existants : ${context.projects.join(', ')}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication :
{
  "id": "lowercase-hyphenated",
  "name": "Prénom",
  "emoji": "un seul emoji représentatif",
  "role": "rôle court (developer, designer, writer, reviewer, etc.)",
  "team": "code|system|writing|creative|ops",
  "model": "",
  "skills": ["skills pertinents parmi ceux disponibles"],
  "projects": ["projets pertinents parmi ceux existants, ou vide"],
  "soulDescription": "Une description courte de la personnalité et expertise de l'agent, en français, 2-3 phrases."
}

Règles :
- L'id est le prénom en minuscules
- L'emoji doit refléter le rôle/personnalité
- Choisis les skills pertinents pour le rôle
- Si le rôle est technique (dev, archi, config), team = "code"
- Si le rôle est créatif (writer, designer), team = "writing" ou "creative"
- Le model reste vide (utilise le défaut Opus)
- soulDescription décrit la personnalité en français, style direct`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error: ${response.status} ${err}`)
    }

    const data = await response.json() as any
    const text = data.content?.[0]?.text || ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in LLM response')
    }

    const inferred = JSON.parse(jsonMatch[0])

    return {
      success: true,
      agent: {
        id: inferred.id,
        name: inferred.name,
        emoji: inferred.emoji,
        role: inferred.role,
        team: inferred.team,
        model: inferred.model || '',
        skills: inferred.skills || [],
        projects: inferred.projects || [],
      },
      soulDescription: inferred.soulDescription || '',
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Inference failed',
      data: { error: err.message },
    })
  }
})
