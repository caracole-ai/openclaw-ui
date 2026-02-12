# PRD — OpenClaw Dashboard v3

**Date :** 2026-02-12  
**Status :** En production (développement actif)  
**Stack :** Vue 3 + Nuxt 3 + TypeScript + Tailwind CSS  
**Repo :** `caracole-ai/openclaw-ui` (`~/Desktop/coding-projects/openclaw-ui`)  
**Config :** `caracole-ai/openclaw-config` (`~/.openclaw/`)

---

## Vision

Dashboard de pilotage du système multi-agents OpenClaw. Source de vérité unique (`~/.openclaw/sources/*.json`), données live depuis le gateway, UI réactive.

---

## Architecture

### Source de vérité

```
~/.openclaw/
├── openclaw.json                    # Config gateway (secrets — pas commitée)
├── sources/                         # 🔴 SOURCE DE VÉRITÉ UNIQUE
│   ├── agents.json                  # 4 agents : main, winston, amelia, claudio
│   ├── projects.json                # Projets + états + team + updates[]
│   ├── skills.json                  # Skills installés + assignments par agent
│   ├── tokens.json                  # Usage tokens (events)
│   ├── teams.json                   # Équipes
│   └── events.json                  # Audit trail
├── agents/{id}/sessions/            # Session stores gateway (données live)
│   └── sessions.json                # Tokens, modèle, contexte par session
├── workspace/                       # Workspace agent principal (Cloclo)
├── workspace-{name}/                # Workspaces agents (SOUL, IDENTITY, USER, etc.)
├── projects/{id}/                   # Fichiers projets partagés (docs, PRD, etc.)
├── scripts/                         # Scripts robustesse (create-agent, validate, etc.)
└── templates/                       # Templates workspace (agent-code, agent-writing)
```

### Agents

| Agent | ID | Emoji | Team | Rôle | Modèle |
|---|---|---|---|---|---|
| Cloclo | `main` | 🔧 | system | orchestrator | claude-opus-4-6 |
| Winston | `winston` | 🏗️ | code | architect | claude-opus-4-6 |
| Amelia | `amelia` | 💻 | code | developer | claude-opus-4-6 |
| Claudio | `claudio` | ⚙️ | code | config | claude-opus-4-6 |

Communication inter-agents via Mattermost (http://localhost:8065, team OpenClaw).

### Règles

- **Source de vérité unique** : tous les endpoints lisent/écrivent `sources/*.json`
- **Historique obligatoire** : toute action projet → entrée `updates[]` dans projects.json
- **Composables singleton** : state hoisted, flag `fetched`, pas de double-fetch
- **WebSocket désactivé** : `WS_ENABLED=false` (pas de backend events encore)

---

## UI — Pages

### `/` — Dashboard
- Résumé agents (cards avec status, équipe, tokens)
- Projets en cours (kanban simplifié)
- Stats globales

### `/agents` — Liste agents
- Cards agents avec status, équipe, rôle
- Filtres par team/status

### `/agent/:id` — Détail agent
- Header : nom, emoji, team badge, role badge, status
- Stats live : sessions actives, tokens utilisés, contexte % (depuis gateway)
- Tabs : Projets assignés, Fichiers workspace, Sessions live, Channels
- Source : `/api/agents/:id` + `/api/agents/:id/live`

### `/projets` — Liste projets
- Kanban par état (backlog → done)
- Cards avec progress bar, team badges

### `/project/:id` — Détail projet
- Infos projet, équipe, phases
- Docs du projet (depuis `projects/{id}/`)
- Historique d'activité (updates[])

### `/skills` — Skills
- Skills installés avec assignments par agent
- Filtrage par agent

### `/tokens` — Consommation tokens
- Summary : KPIs globaux, top agents, top projets
- Timeline : graphe d'usage dans le temps

### `/tests` — Tests
- **Unit tests** (3 suites) : Sources JSON, Intégrité cross-refs, Données live gateway
- **E2E** : HTTP calls sur tous les endpoints API
- Bouton run, summary bar, progress bar, suites dépliables
- Résultat actuel : 36/36 unit ✅, 11/11 e2e ✅

---

## API Endpoints

### Agents
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/agents` | Liste agents (filtres team, status) — `sources/agents.json` |
| GET | `/api/agents/:id` | Détail agent + fichiers workspace + projets — `agents.json` + `projects.json` + `tokens.json` |
| GET | `/api/agents/:id/live` | Sessions live, tokens, contexte % — `agents/{id}/sessions/sessions.json` |
| GET | `/api/agents/live` | Stats agrégées tous agents (tokens globaux, sessions) — tous les session stores |
| GET | `/api/agents/:id/files/:filename` | Lire un fichier workspace |
| PUT | `/api/agents/:id/files/:filename` | Écrire un fichier workspace |

### Projets
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/projects` | Liste projets — `sources/projects.json` |
| POST | `/api/projects` | Créer projet |
| GET | `/api/projects/:id` | Détail projet |
| PATCH | `/api/projects/:id` | Modifier projet (status, updates, etc.) |
| GET | `/api/projects/:id/docs` | Lister docs projet — `projects/{id}/` |
| GET | `/api/projects/:id/docs/:filename` | Lire un doc projet |
| GET | `/api/projects/:id/activity` | Historique activité |
| POST | `/api/projects/:id/nudge` | Relancer un agent sur un projet |

### Skills
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/skills` | Skills installés + assignments — `sources/skills.json` |
| GET | `/api/skills/verify/:agentId/:skillId` | Vérifier qu'un skill fonctionne pour un agent |

### Tokens
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/tokens/summary` | KPIs : top agents, top projets, agrégats |
| GET | `/api/tokens/timeline` | Timeline d'usage (filtres from/to/agent/groupBy) |
| POST | `/api/tokens/record` | Enregistrer un event de consommation |

### Sources (générique)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/sources/:filename` | Lire un fichier source JSON brut |
| PATCH | `/api/sources/:filename` | Patcher un fichier source JSON |

### Tests
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/tests/suites` | Tests unitaires (sources, intégrité, live) |
| GET | `/api/tests/endpoints` | Tests e2e (HTTP sur tous endpoints) |

### Autres
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/sessions/send` | Envoyer un message dans une session OpenClaw |

---

## Composables

| Composable | Source | Description |
|---|---|---|
| `useAgents` | `/api/agents` | Liste agents, filtres, singleton |
| `useProjects` | `/api/projects` | Liste projets, kanban columns, singleton |
| `useSkills` | `/api/skills` | Skills installés + assignments, singleton |
| `useTokens` | `/api/tokens/summary` + `/timeline` | KPIs tokens, timeline |
| `useToast` | local | Système de toasts |
| `useWebSocket` | — | Désactivé (`WS_ENABLED=false`) |

---

## Composants (23)

### Layout
- `AppHeader` — Nav, stats agents, tokens live, session timer (5h, resets 00/05/10/15/20h Paris)
- `Breadcrumb` — Fil d'ariane

### Agents
- `AgentCard` — Card agent avec status, team, rôle
- `AgentsDashboard` — Grille d'agents
- `AgentStatusBadge` — Badge status (active/idle/offline)
- `AgentActivityChart` — Graphe activité
- `AgentRoleChart` — Répartition par rôle

### Projets
- `ProjectCard` — Card projet avec progress, team badges
- `ProjectsKanban` — Vue kanban des projets
- `ProjectsSection` — Section projets du dashboard

### Skills
- `SkillCard` — Card skill avec assignments
- `SkillVerifyButton` — Bouton vérification skill

### Stats
- `StatsOverview` — Vue d'ensemble stats
- `StatsCard` / `StatCard` — Cards de statistiques
- `CostChart` — Graphe de coûts

### UI
- `Skeleton` — Loader skeleton
- `ToastContainer` / `ToastItem` — Système toasts
- `MarkdownEditor` — Éditeur markdown
- `AccordionItem` — Accordéon
- `ActionButton` — Bouton d'action
- `FlowStep` — Étape de flow

---

## Types (7 fichiers)

| Fichier | Types principaux |
|---|---|
| `agent.ts` | `Agent`, `AgentTeam`, `AgentStatus`, `AgentRole`, `AgentsSource` |
| `project.ts` | `Project`, `ProjectState`, `ProjectUpdate`, `ProjectTeamMember` |
| `skill.ts` | `SkillManifest`, `SkillsSource`, `SkillAssignment` |
| `token.ts` | `TokenUsage`, `TokenEvent`, `TokenSummary`, `TokensSource` |
| `team.ts` | `Team` |
| `event.ts` | `SystemEvent` |
| `websocket.ts` | `WSEventType` |

---

## Header — Session Timer

Sessions de 5h avec resets à 00:00, 05:00, 10:00, 15:00, 20:00 (Europe/Paris).

Le widget affiche :
- ⏱️ Countdown jusqu'au prochain reset
- Barre de progression (bleu → jaune → orange → rouge)
- Heure du prochain reset
- Tokens globaux live (rafraîchis toutes les 30s depuis `/api/agents/live`)

---

## Scripts (`~/.openclaw/scripts/`)

| Script | Description |
|---|---|
| `create-project.sh` | Crée dossier projet + fichiers + met à jour projects.json |
| `create-agent.sh` | Workspace + bot Mattermost + met à jour agents.json |
| `assign-skill.sh` | Assigne un skill à un agent dans skills.json |
| `add-agent-to-project.sh` | Met à jour agents.json et projects.json |
| `validate-sources.sh` | Vérifie la cohérence de toutes les sources |
| `record-token-usage.sh` | Enregistre un event token |
| `sync-tokens.sh` | Sync depuis openclaw status |

---

## Pièges documentés

1. **Plugin Mattermost local** : ne PAS installer de copie locale, utiliser le bundled uniquement
2. **`plugins.installs`** : ne pas ajouter, le plugin bundled est auto-détecté
3. **`config.patch` arrays** : REMPLACE, ne merge pas — toujours envoyer la liste complète
4. **WS sans handler** : WebSocket upgrade sans backend → ECONNRESET → crash-loop
5. **Composables non-singleton** : state dans la fonction → multi-fetch → flood d'erreurs
6. **`contextTokens` dans session store** : c'est la taille de la fenêtre (200k), PAS l'usage
7. **`/**/` dans commentaires TS** : les paths avec `*/` cassent esbuild (unterminated regex)

---

## TODO

- [ ] Backend WebSocket events → réactiver `WS_ENABLED`
- [ ] SOUL/IDENTITY editor (PUT endpoints existent, manque l'UI)
- [ ] Dark mode
- [ ] Responsive mobile
- [ ] Tests e2e Playwright
