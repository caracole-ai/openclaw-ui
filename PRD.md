# PRD — OpenClaw Dashboard v3

**Date :** 2026-02-12  
**Status :** En production (développement actif)  
**Stack :** Vue 3 + Nuxt 3 + TypeScript + Tailwind CSS + SQLite (better-sqlite3)  
**Repo :** `caracole-ai/openclaw-ui` (`~/Desktop/coding-projects/openclaw-ui`)  
**Config :** `caracole-ai/openclaw-config` (`~/.openclaw/`)

---

## Vision

Dashboard de pilotage du système multi-agents OpenClaw. SQLite comme source de vérité unique, données live mergées depuis les session stores gateway, UI réactive avec polling.

---

## Architecture

### Data Layer

```
~/.openclaw/
├── openclaw.json                    # Config gateway (secrets — pas commitée)
├── dashboard.db                     # 🔴 SOURCE DE VÉRITÉ UNIQUE (SQLite)
├── agents/{id}/sessions/            # Session stores gateway (données live, read-only)
│   └── sessions.json                # Tokens, modèle, contexte par session
├── workspace/                       # Workspace agent principal (Cloclo)
├── workspace-{name}/                # Workspaces agents (SOUL, IDENTITY, USER, etc.)
├── projects/{id}/                   # Fichiers projets partagés (docs, PRD, etc.)
├── scripts/                         # Scripts robustesse (create-agent, validate, etc.)
└── sources/                         # ⚠️ JSON legacy (seeded into DB, non utilisés en runtime)
```

#### SQLite Schema (11 tables)
- `agents` — profil, team, modèle, workspace, Mattermost credentials
- `skills` — skills installés
- `agent_skills` — N:N agents ↔ skills
- `teams` — équipes avec rules et default skills
- `projects` — projets avec état, progress, github
- `project_agents` — N:N projets ↔ agents avec rôle
- `project_phases` — phases ordonnées d'un projet
- `project_updates` — historique obligatoire (audit trail)
- `token_events` — events de consommation (tokens + coûts)
- `events` — audit trail système
- `meta` — metadata (seeded timestamp, schema version)

#### Live Data (gateway-owned, read-only)
Les session stores (`agents/{id}/sessions/sessions.json`) sont écrits par le gateway. Les endpoints API les lisent et les mergent avec les données DB pour un résultat toujours frais.

### Agents

| Agent | ID | Emoji | Team | Rôle | Modèle |
|---|---|---|---|---|---|
| Cloclo | `main` | 🔧 | system | orchestrator | claude-opus-4-6 |
| Winston | `winston` | 🏗️ | code | architect | claude-opus-4-6 |
| Amelia | `amelia` | 💻 | code | developer | claude-opus-4-6 |
| Claudio | `claudio` | ⚙️ | code | config | claude-opus-4-6 |

Communication inter-agents via Mattermost (http://localhost:8065, team OpenClaw).

### Règles

- **SQLite = source de vérité** : tous les endpoints lisent/écrivent la DB
- **Transactions ACID** : plus de race conditions sur les écritures concurrentes
- **Session stores = read-only** : seul le gateway les écrit, l'API les lit
- **Historique obligatoire** : toute action projet → INSERT dans `project_updates`
- **Composables singleton** : state hoisted, polling 10s, pas de double-fetch
- **WebSocket désactivé** : `WS_ENABLED=false` (pas de backend events encore)

---

## UI — Pages

### `/` — Dashboard
- Résumé agents (cards avec status, équipe, tokens live)
- Projets en cours (kanban simplifié)
- Stats globales

### `/agents` — Liste agents
- Cards agents avec status, équipe, rôle, tokens live
- Filtres par team/status
- Bouton "Nouvel agent" → `/agents/create-agent`
- Polling 10s pour données fraîches

### `/agents/create-agent` — Création agent
- Deux tabs : ⚡ Quick (AI/heuristic inference) / 🔧 Custom (formulaire)
- Pipeline : inference → preview → create (workspace + MM bot + DB + gateway config)

### `/agent/:id` — Détail agent
- Header : nom, emoji, team badge, role badge, status
- Stats live : sessions actives, tokens utilisés, contexte % (polling 10s)
- Tabs : Projets assignés, Fichiers workspace, Sessions live, Channels

### `/projets` — Liste projets
- Kanban par état (backlog → done)
- Cards avec progress bar, team badges

### `/project/:id` — Détail projet
- Infos projet, équipe, phases
- Docs du projet (depuis `projects/{id}/`)
- Historique d'activité (depuis `project_updates` SQL)

### `/skills` — Skills
- Skills installés avec assignments par agent
- Filtrage par agent

### `/tokens` — Consommation tokens
- Summary : KPIs globaux (tokens live + coûts DB), top agents, top projets
- Timeline : agrégation SQL en temps réel (plus d'aggregats pré-calculés)

### `/tests` — Tests
- **Suites** (3) : Data Integrity, Cross References, Schema Health — 9/9 ✅
- **Endpoints** (9) : HTTP internes sur tous les endpoints API — 9/9 ✅

---

## API Endpoints

### Agents
| Méthode | Route | Source | Description |
|---|---|---|---|
| GET | `/api/agents` | DB + live | Liste agents enrichie (tokens, sessions live) |
| GET | `/api/agents/:id` | DB + live + FS | Détail agent + fichiers workspace + projets + sessions |
| POST | `/api/agents` | DB + script + config | Créer agent (workspace + MM bot + DB + gateway) |
| POST | `/api/agents/infer` | DB | Inférence profil agent depuis texte libre |
| GET | `/api/agents/:id/files/:filename` | DB + FS | Lire un fichier workspace |
| PUT | `/api/agents/:id/files/:filename` | DB + FS | Écrire un fichier workspace |

### Projets
| Méthode | Route | Source | Description |
|---|---|---|---|
| GET | `/api/projects` | DB | Liste projets + phases + updates + agents |
| POST | `/api/projects` | DB | Créer projet |
| GET | `/api/projects/:id` | DB | Détail projet |
| PATCH | `/api/projects/:id` | DB | Modifier projet |
| GET | `/api/projects/:id/docs` | DB + FS | Lister docs projet |
| GET | `/api/projects/:id/docs/:filename` | DB + FS | Lire un doc projet |
| GET | `/api/projects/:id/activity` | DB + live | Activité projet (tokens live + updates DB) |
| POST | `/api/projects/:id/nudge` | DB | Relancer agents sur un projet |

### Skills
| Méthode | Route | Source | Description |
|---|---|---|---|
| GET | `/api/skills` | DB | Skills installés + assignments |
| GET | `/api/skills/verify/:agentId/:skillId` | DB + FS | Vérifier skill opérationnel |

### Tokens
| Méthode | Route | Source | Description |
|---|---|---|---|
| GET | `/api/tokens/summary` | DB + live | KPIs : tokens live + coûts DB |
| GET | `/api/tokens/timeline` | DB | Timeline agrégée (SQL GROUP BY) |
| POST | `/api/tokens/record` | DB | Enregistrer event consommation |

### Sources (legacy compat)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/sources/:filename` | Lecture DB formatée en JSON |
| PATCH | `/api/sources/:filename` | **Deprecated** (410 Gone) |

### Tests
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/tests/suites` | Tests intégrité DB (3 suites, 9 tests) |
| GET | `/api/tests/endpoints` | Tests e2e ($fetch interne, 9 endpoints) |

### Autres
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/sessions/send` | Envoyer message dans une session OpenClaw |

---

## Server Utils

| Fichier | Description |
|---|---|
| `server/utils/db.ts` | Singleton SQLite, schema, migration JSON→DB, helpers live data |

### DB Initialization
Au premier accès, `getDb()` :
1. Crée la DB si elle n'existe pas
2. Exécute le schema (11 tables + index)
3. Si pas encore seeded : importe les 6 JSON sources en une transaction
4. Marque comme seeded dans `meta`

### Live Data Helpers
- `getLiveStats(agentId)` → `{ totalTokens, activeSessions, maxPercentUsed, lastActivity }`
- `getLiveSessions(agentId)` → sessions détaillées avec tokens/contexte

---

## Composables

| Composable | Source | Polling | Description |
|---|---|---|---|
| `useAgents` | `/api/agents` | 10s | Liste agents + live data, auto start/stop |
| `useProjects` | `/api/projects` | — | Liste projets, kanban columns |
| `useSkills` | `/api/skills` | — | Skills installés + assignments |
| `useTokens` | `/api/tokens/summary` + `/timeline` | — | KPIs tokens, timeline |
| `useToast` | local | — | Système de toasts |
| `useWebSocket` | — | — | Désactivé (`WS_ENABLED=false`) |

---

## Types (7 fichiers)

| Fichier | Types principaux |
|---|---|
| `agent.ts` | `Agent`, `AgentDetail`, `AgentTeam`, `AgentStatus` |
| `project.ts` | `Project`, `ProjectState`, `ProjectUpdate`, `ProjectTeamMember` |
| `skill.ts` | `Skill`, `SkillsSource`, `SkillVerification` |
| `token.ts` | `TokenEvent`, `TokenSummary`, `TimelinePoint` |
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
- Tokens globaux live (depuis `useAgents` polling 10s)

---

## Scripts (`~/.openclaw/scripts/`)

| Script | Description |
|---|---|
| `create-project.sh` | Crée dossier projet + fichiers |
| `create-agent.sh` | Workspace + bot Mattermost (appelé par POST /api/agents) |
| `assign-skill.sh` | Assigne un skill à un agent |
| `add-agent-to-project.sh` | Ajoute un agent à un projet |
| `validate-sources.sh` | Vérifie la cohérence |
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
7. **SQLite WAL mode** : la DB crée des fichiers `-wal` et `-shm` temporaires (gitignored)
8. **Migration JSON→DB** : se fait automatiquement au premier boot, une seule fois

---

## TODO

- [ ] Backend WebSocket events → réactiver `WS_ENABLED`
- [ ] SOUL/IDENTITY editor (PUT endpoints existent, manque l'UI)
- [ ] Page `/tests` UI
- [ ] Dark mode
- [ ] Responsive mobile
- [ ] Tests e2e Playwright
