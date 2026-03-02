# 🎨 UI — Pages, Composables, Types

**Date :** 2026-03-02 (mis à jour 12:08)  
**Stack :** Vue 3 + Nuxt 3 + TypeScript + Tailwind CSS

---

## Pages

### `/` — Dashboard
**Composants :**
- Résumé agents (cards avec status, équipe, tokens live)
- Projets en cours (kanban simplifié)
- Stats globales (tokens, coûts, sessions actives)

**Composables utilisés :** `useAgents`, `useProjects`, `useTokens`

---

### `/agents` — Liste Agents
**Fonctionnalités :**
- Cards agents avec status, équipe, rôle, tokens live
- Filtres par team/status
- Bouton "Nouvel agent" → `/agents/create-agent`

**Polling :** 10s (via `useAgents`)

---

### `/agents/create-agent` — Création Agent
**Deux modes :**
1. **⚡ Quick** — Inférence AI/heuristic depuis texte libre (POST `/api/agents/infer`)
2. **🔧 Custom** — Formulaire manuel complet

**Pipeline :**
```
Texte/Formulaire
    ↓
Inférence (si Quick)
    ↓
Preview profil
    ↓
POST /api/agents
    ↓
Workspace + Bot MM + DB + Config Gateway
```

---

### `/agent/:id` — Détail Agent
**Header (gradient par team) :**
- **Gradient coloré** : bleu/violet (code), violet/rose (writing), orange/amber (system), emerald/teal (free)
- **Navigation ← / →** : flèches pour passer à l'agent précédent/suivant (fetch `/api/agents`)
- **Avatar** : emoji de l'agent dans un carré arrondi glassmorphism
- **Badges** : team + role intégrés au header
- **Stats bento 2×2** : sessions, tokens, contexte %, modèle — compactes à droite de l'identité

**Polling :** Soft-poll toutes les 30s (`$fetch` direct → `liveOverride` ref), pas de re-render DOM.

**Tabs :** (par défaut : Skills)
  - **Skills** — Éditeur drag & drop deux colonnes
    - Colonne gauche (bleue) : Skills assignés
    - Colonne droite (grise) : Skills disponibles
    - Glisser-déposer entre colonnes (HTML5 natif)
    - Boutons +/✕ en fallback
    - Scroll position préservée après actions (`refreshKeepScroll`)
  - **Projets** — Projets assignés avec état et progress bar
  - **Fichiers** — Workspace files (SOUL.md, IDENTITY.md, etc.)
  - **Sessions** — Sessions live
  - **Channels** — Channels Mattermost

**Composable :** `useAgents` (détail)

**Endpoints utilisés :**
- `GET /api/agents` — Liste agents (pour navigation ← / →)
- `GET /api/agents/:id` — Détail agent + skills + projets
- `POST /api/agents/:id/skills` — Ajouter skill
- `DELETE /api/agents/:id/skills` — Retirer skill
- `GET /api/skills` — Liste tous les skills

---

### `/projets` — Liste Projets
**Vue :** Kanban par état (`backlog` → `planning` → `build` → `review` → `delivery` → `rex` → `done`)

**Cards :**
- Nom, description
- Progress bar (0% backlog → 100% done, basé sur state index)
- Team badges (agents assignés)

**Drag & Drop :** ✅
- Glisser-déposer entre colonnes (toutes transitions autorisées)
- PATCH `/api/projects/:id` avec nouveau state
- Refresh automatique depuis DB
- Toasts de succès/erreur

**Composable :** `useProjects`

---

### `/project/:id` — Détail Projet
**Sections :**
- **Header :** nom, état, progress bar, GitHub link, bouton suppression 🗑️
- **Équipe :** agents assignés avec rôles
- **Phases :** timeline ordonnée
- **Docs :** fichiers du projet (`projects/{id}/`)
- **Activité :** historique updates + tokens utilisés

**Actions :**
- **Suppression :** Modale de confirmation → DELETE → Redirection `/projets`
- **État :** Dropdown pour changer l'état
- **Progress :** Slider éditable

**Composables :** `useProjects` (détail), `/api/projects/:id/activity`

---

### `/skills` — Skills
**Fonctionnalités :**
- Liste skills installés
- Filtrage par agent
- Assignments (quels agents ont quel skill)

**Composable :** `useSkills`

---

### `/tokens` — Consommation Tokens
**Sections :**
1. **Summary :** KPIs globaux
   - Tokens live (depuis session stores)
   - Coûts DB (depuis `token_events`)
   - Top agents (par consommation)
   - Top projets (par consommation)

2. **Timeline :** graphique agrégé (SQL GROUP BY)
   - Filtrage par agent/projet
   - Périodes : heure, jour, semaine, mois

**Composable :** `useTokens`

---

### `/tests` — Tests
**Deux types :**
1. **Suites DB (9 tests)** — Data Integrity, Cross References, Schema Health
2. **Endpoints (9 tests)** — HTTP e2e ($fetch interne)

**UI :** Pas encore implémentée (TODO)

**Endpoints :**
- `GET /api/tests/suites`
- `GET /api/tests/endpoints`

---

## Composables

### `useAgents`
**Source :** `GET /api/agents`

**Polling :** 10s (auto start/stop)

**State :**
```typescript
{
  agents: Ref<Agent[]>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  refresh: () => Promise<void>
}
```

**Live data mergé :** `totalTokens`, `activeSessions`, `maxPercentUsed`, `lastActivity`

---

### `useProjects`
**Source :** `GET /api/projects`

**Polling :** Aucun (refresh manuel ou via WebSocket)

**State :**
```typescript
{
  projects: Ref<Project[]>,
  columns: ComputedRef<Record<ProjectState, Project[]>>, // Kanban
  loading: Ref<boolean>,
  error: Ref<string | null>,
  refresh: () => Promise<void>
}
```

---

### `useSkills`
**Source :** `GET /api/skills`

**Polling :** Aucun (refresh manuel ou via WebSocket)

**State :**
```typescript
{
  skills: Ref<Skill[]>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  refresh: () => Promise<void>
}
```

---

### `useTokens`
**Sources :**
- `GET /api/tokens/summary`
- `GET /api/tokens/timeline`

**Polling :** Aucun (refresh manuel)

**State :**
```typescript
{
  summary: Ref<TokenSummary>,
  timeline: Ref<TimelinePoint[]>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  refresh: () => Promise<void>,
  fetchTimeline: (period: string, agentId?: string, projectId?: string) => Promise<void>
}
```

---

### `useToast`
**Usage :** Système de notifications UI

**Méthodes :**
```typescript
{
  success: (message: string) => void,
  error: (message: string) => void,
  info: (message: string) => void,
  warning: (message: string) => void
}
```

---

### `useWebSocket`
**État :** ✅ Activé (`WS_ENABLED=true`)

**Endpoint :** `GET /api/ws` (upgrade WebSocket)

**Événements écoutés :**
- `connected` — confirmation
- `data:updated` — trigger refresh des composables

**Singleton :** Une seule connexion partagée entre tous les composables

**Fallback :** Polling 10s si WebSocket échoue

---

## Types (7 fichiers)

### `types/agent.ts`
```typescript
type Agent = {
  id: string;
  name: string;
  emoji: string;
  team: AgentTeam;
  role: string;
  status: AgentStatus;
  model: string;
  workspace: string;
  // Live data (merged from session stores)
  totalTokens?: number;
  activeSessions?: number;
  maxPercentUsed?: number;
  lastActivity?: string;
}

type AgentDetail = Agent & {
  projects: Project[];
  files: string[];
  sessions: LiveSession[];
  channels: string[];
}

type AgentTeam = 'system' | 'code' | 'research' | 'content';
type AgentStatus = 'active' | 'idle' | 'offline';
```

---

### `types/project.ts`
```typescript
type Project = {
  id: string;
  name: string;
  state: ProjectState;
  progress: number;
  description?: string;
  github?: string;
  workspace?: string;
  // Relations
  phases?: ProjectPhase[];
  updates?: ProjectUpdate[];
  team?: ProjectTeamMember[];
}

type ProjectState = 'backlog' | 'planning' | 'development' | 'review' | 'done';

type ProjectUpdate = {
  id: number;
  projectId: string;
  agentId: string;
  timestamp: string;
  message: string;
  type: UpdateType;
}

type UpdateType = 'status' | 'progress' | 'phase' | 'note' | 'document' | 'assignment' | 'created' | 'nudge';

type ProjectTeamMember = {
  agentId: string;
  role: string;
  assignedAt: string;
}
```

---

### `types/skill.ts`
```typescript
type Skill = {
  id: string;
  name: string;
  location: string;
  description?: string;
  // Assignments
  agentIds?: string[];
}

type SkillVerification = {
  verified: boolean;
  location?: string;
  error?: string;
}
```

---

### `types/token.ts`
```typescript
type TokenEvent = {
  id: number;
  agentId: string;
  projectId?: string;
  timestamp: string;
  tokens: number;
  cost?: number;
  model?: string;
  operation?: string;
}

type TokenSummary = {
  totalTokens: number;        // Live (session stores)
  totalCost: number;          // DB (token_events)
  topAgents: { id: string; tokens: number }[];
  topProjects: { id: string; tokens: number }[];
}

type TimelinePoint = {
  timestamp: string;
  tokens: number;
  cost: number;
}
```

---

### `types/team.ts`
```typescript
type Team = {
  id: string;
  name: string;
  defaultSkills?: string[];
  rules?: string;
}
```

---

### `types/event.ts`
```typescript
type SystemEvent = {
  id: number;
  timestamp: string;
  type: string;
  agentId?: string;
  projectId?: string;
  details?: string;
}
```

---

### `types/websocket.ts`
```typescript
type WSEventType = 'connected' | 'data:updated';

type WSMessage = {
  type: WSEventType;
  data?: any;
}
```

---

## Header — Session Timer

**Fonctionnalités :**
- Sessions de 5h avec resets à 00:00, 05:00, 10:00, 15:00, 20:00 (Europe/Paris)
- ⏱️ Countdown jusqu'au prochain reset
- Barre de progression (bleu → jaune → orange → rouge)
- Heure du prochain reset
- Tokens globaux live (polling 10s via `useAgents`)

**Composant :** `components/SessionTimer.vue`

---

## Références

- **Architecture :** Voir [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API :** Voir [API.md](./API.md)
- **Agents :** Voir [AGENTS.md](./AGENTS.md)

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
