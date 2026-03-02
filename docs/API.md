# 🔌 API Endpoints — OpenClaw UI

**Date :** 2026-03-02  
**Base URL :** `http://localhost:3000` (dev)

---

## Agents

### GET `/api/agents`
Liste agents enrichie (DB + live data).

**Source :** SQLite (`agents`, `agent_skills`, `teams`) + session stores

**Réponse :**
```typescript
Agent[] // Avec live data : totalTokens, activeSessions, maxPercentUsed, lastActivity
```

**Polling :** 10s (composable `useAgents`)

---

### GET `/api/agents/:id`
Détail agent complet.

**Source :** SQLite + session stores + filesystem (workspace)

**Réponse :**
```typescript
AgentDetail // Inclut : projets assignés, fichiers workspace, sessions live, channels
```

---

### POST `/api/agents`
Créer un agent.

**Body :**
```typescript
{
  id: string,
  name: string,
  team: string,
  role: string,
  emoji: string,
  model?: string,
  workspace?: string
}
```

**Actions automatiques :**
1. Crée le workspace (`~/.openclaw/workspace-{id}/`)
2. Crée le bot Mattermost (API REST)
3. Insert dans SQLite (`agents`)
4. Patch `openclaw.json` (agents.list, channels.mattermost.accounts, bindings)
5. Redémarre le gateway

**Script appelé :** `~/.openclaw/scripts/create-agent.sh`

---

### POST `/api/agents/infer`
Inférence profil agent depuis texte libre (AI/heuristic).

**Body :**
```typescript
{
  description: string
}
```

**Réponse :**
```typescript
{
  id: string,
  name: string,
  team: string,
  role: string,
  emoji: string,
  skills: string[]
}
```

**Usage :** Page `/agents/create-agent` (tab Quick)

---

### GET `/api/agents/:id/files/:filename`
Lire un fichier workspace.

**Exemple :** `/api/agents/winston/files/SOUL.md`

**Réponse :** Contenu brut du fichier

---

### PUT `/api/agents/:id/files/:filename`
Écrire un fichier workspace.

**Body :**
```typescript
{
  content: string
}
```

**Réponse :** `{ success: true }`

---

## Projets

### GET `/api/projects`
Liste projets avec phases, updates, agents.

**Source :** SQLite (`projects`, `project_phases`, `project_updates`, `project_agents`)

**Réponse :**
```typescript
Project[] // Avec relations : phases[], updates[], team[]
```

**Composable :** `useProjects`

---

### POST `/api/projects`
Créer un projet.

**Body :**
```typescript
{
  id: string,
  name: string,
  state: ProjectState,
  description?: string,
  github?: string,
  workspace?: string
}
```

**Actions automatiques :**
1. Insert dans SQLite (`projects`)
2. Crée le dossier projet (`~/.openclaw/projects/{id}/`)
3. Insert event dans `events` table

**Script appelé :** `~/.openclaw/scripts/create-project.sh`

---

### GET `/api/projects/:id`
Détail projet complet.

**Source :** SQLite + filesystem (docs projet)

**Réponse :**
```typescript
ProjectDetail // Inclut : phases, updates, team, docs
```

---

### PATCH `/api/projects/:id`
Modifier un projet.

**Body :**
```typescript
{
  name?: string,
  state?: ProjectState,
  progress?: number,
  description?: string,
  github?: string
}
```

**Actions automatiques :**
1. Update SQLite (`projects`)
2. Insert dans `project_updates` (historique obligatoire)
3. Si `state: "review"` → trigger review ceremony (crée canal MM, invite agents)

---

### GET `/api/projects/:id/docs`
Lister les docs d'un projet.

**Source :** Filesystem (`~/.openclaw/projects/{id}/`)

**Réponse :**
```typescript
string[] // Liste de noms de fichiers
```

---

### GET `/api/projects/:id/docs/:filename`
Lire un doc projet.

**Exemple :** `/api/projects/openclaw-ui/docs/PRD.md`

**Réponse :** Contenu brut du fichier

---

### GET `/api/projects/:id/activity`
Activité projet (tokens live + updates DB).

**Source :** SQLite (`project_updates`) + session stores (tokens)

**Réponse :**
```typescript
{
  updates: ProjectUpdate[],
  tokenUsage: { total: number, byAgent: Record<string, number> }
}
```

---

### POST `/api/projects/:id/nudge`
Relancer agents sur un projet.

**Body :**
```typescript
{
  message?: string
}
```

**Actions :**
1. Insert update `type: "nudge"` dans `project_updates`
2. Envoie notification Mattermost aux agents assignés

---

## Skills

### GET `/api/skills`
Liste skills installés + assignments.

**Source :** SQLite (`skills`, `agent_skills`)

**Réponse :**
```typescript
Skill[] // Avec agents assignés : agentIds[]
```

**Composable :** `useSkills`

---

### GET `/api/skills/verify/:agentId/:skillId`
Vérifier qu'un skill est opérationnel pour un agent.

**Source :** SQLite + filesystem (check `SKILL.md` existe)

**Réponse :**
```typescript
{
  verified: boolean,
  location?: string,
  error?: string
}
```

---

## Tokens

### GET `/api/tokens/summary`
KPIs globaux : tokens live + coûts DB.

**Source :** SQLite (`token_events`) + session stores (tous les agents)

**Réponse :**
```typescript
{
  totalTokens: number,           // Live (depuis session stores)
  totalCost: number,             // DB (depuis token_events)
  topAgents: { id: string, tokens: number }[],
  topProjects: { id: string, tokens: number }[]
}
```

**Composable :** `useTokens`

---

### GET `/api/tokens/timeline`
Timeline agrégée (SQL GROUP BY).

**Source :** SQLite (`token_events`)

**Query params :**
- `period` — `hour`, `day`, `week`, `month`
- `agentId` — filtre par agent (optionnel)
- `projectId` — filtre par projet (optionnel)

**Réponse :**
```typescript
TimelinePoint[] // { timestamp, tokens, cost }
```

**Composable :** `useTokens` (timeline chart)

---

### POST `/api/tokens/record`
Enregistrer un event de consommation.

**Body :**
```typescript
{
  agentId: string,
  projectId?: string,
  tokens: number,
  cost?: number,
  model?: string,
  operation?: string
}
```

**Actions :**
1. Insert dans SQLite (`token_events`)
2. Broadcast WebSocket `data:updated`

**Script équivalent :** `~/.openclaw/scripts/record-token-usage.sh`

---

## Sources (legacy compat)

### GET `/api/sources/:filename`
Lecture DB formatée en JSON.

**Fichiers supportés :** `agents`, `skills`, `projects`, `teams`, `tokens`, `events`

**⚠️ Deprecated :** Utiliser les endpoints spécifiques (`/api/agents`, etc.) à la place.

**Réponse :** JSON équivalent au fichier `sources/{filename}.json`

---

### PATCH `/api/sources/:filename`
**⚠️ DEPRECATED (410 Gone)**

Les modifications doivent passer par les endpoints spécifiques :
- Agents → `POST /api/agents`, `PATCH /api/agents/:id`
- Projets → `POST /api/projects`, `PATCH /api/projects/:id`
- etc.

**Raison :** SQLite est la source de vérité, plus les JSON sources.

---

## Tests

### GET `/api/tests/suites`
Tests intégrité DB (3 suites, 9 tests).

**Réponse :**
```typescript
{
  suites: [
    { name: "Data Integrity", tests: [...], passed: number, failed: number },
    { name: "Cross References", tests: [...], passed: number, failed: number },
    { name: "Schema Health", tests: [...], passed: number, failed: number }
  ],
  summary: { total: number, passed: number, failed: number }
}
```

---

### GET `/api/tests/endpoints`
Tests e2e ($fetch interne, 9 endpoints).

**Réponse :**
```typescript
{
  endpoints: [
    { name: "GET /api/agents", status: number, passed: boolean, error?: string },
    ...
  ],
  summary: { total: number, passed: number, failed: number }
}
```

---

## Autres

### POST `/api/sessions/send`
Envoyer un message dans une session OpenClaw.

**Body :**
```typescript
{
  sessionKey?: string,
  label?: string,
  message: string,
  timeoutSeconds?: number
}
```

**Prérequis config :**
```json
{
  "tools": {
    "agentToAgent": { "enabled": true }
  }
}
```

---

## WebSocket

### GET `/api/ws` (upgrade)
Endpoint WebSocket pour notifications temps réel.

**Événements émis (serveur → client) :**
- `connected` — confirmation de connexion
- `data:updated` — données DB mises à jour (file watcher)

**Usage :** Composable `useWebSocket` (singleton)

**Fallback :** Polling 10s si WebSocket échoue

---

## Références

- **Architecture :** Voir [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Composables UI :** Voir [UI.md](./UI.md#composables)
- **Types :** Voir [UI.md](./UI.md#types)

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
