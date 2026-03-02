# 🏗️ Architecture — OpenClaw UI

**Date :** 2026-02-12 (mis à jour 2026-03-02)  
**Status :** Production  

---

## Vision

Dashboard de pilotage du système multi-agents OpenClaw. **SQLite comme source de vérité unique**, données live mergées depuis les session stores gateway, UI réactive avec polling.

---

## Data Layer

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

---

## SQLite Schema (11 tables)

### Core Data
- **`agents`** — profil, team, modèle, workspace, Mattermost credentials
- **`skills`** — skills installés (nom, location, description)
- **`teams`** — équipes avec rules et default skills
- **`projects`** — projets avec état, progress, github

### Relations (N:N)
- **`agent_skills`** — agents ↔ skills
- **`project_agents`** — projets ↔ agents avec rôle
- **`project_phases`** — phases ordonnées d'un projet

### Audit Trail
- **`project_updates`** — historique obligatoire (chaque action projet)
- **`token_events`** — events de consommation (tokens + coûts)
- **`events`** — audit trail système

### Metadata
- **`meta`** — metadata (seeded timestamp, schema version)

---

## Live Data (gateway-owned, read-only)

Les **session stores** (`agents/{id}/sessions/sessions.json`) sont écrits par le gateway OpenClaw.

Les endpoints API les **lisent** et les **mergent** avec les données DB pour un résultat toujours frais :
- Tokens utilisés (live)
- Sessions actives (live)
- Contexte % (live)
- Dernière activité (live)

**Règle :** L'API ne modifie JAMAIS les session stores. Elle les lit uniquement.

---

## Règles Fondamentales

### 1. SQLite = Source de Vérité
Tous les endpoints lisent/écrivent la DB. Les fichiers JSON (`sources/*.json`) ne sont utilisés que pour le seed initial.

### 2. Transactions ACID
Plus de race conditions sur les écritures concurrentes. Toute opération multi-tables = transaction.

### 3. Session Stores = Read-Only
Seul le gateway OpenClaw écrit les session stores. L'API les lit et les merge avec la DB.

### 4. Historique Obligatoire
Toute action sur un projet → `INSERT INTO project_updates`. Pas de travail silencieux.

### 5. File Watcher + WebSocket
Les modifications des fichiers JSON sources déclenchent un resync automatique de la DB + broadcast WebSocket `data:updated`.

### 6. Composables Singleton
State hoisted, polling 10s, pas de double-fetch. Une seule connexion WebSocket partagée.

---

## DB Initialization (auto-seed)

Au premier accès, `getDb()` (voir `server/utils/db.ts`) :
1. Crée la DB si elle n'existe pas
2. Exécute le schema (11 tables + index)
3. Si pas encore seeded : importe les 6 JSON sources en une transaction
4. Marque comme seeded dans `meta`

**Fichiers sources seeded :**
- `agents.json`
- `skills.json`
- `projects.json`
- `teams.json`
- `tokens.json`
- `events.json`

**Après le seed initial :** La DB est la source de vérité. Les JSON ne sont plus utilisés (sauf si modifiés → file watcher resync).

---

## Sync Temps Réel (file watcher)

**Workflow :**
```
Fichier JSON modifié
    ↓
File Watcher (chokidar) — debounce 1s
    ↓
resyncFromJson() → Transaction SQLite
    ↓
WebSocket Broadcast (data:updated)
    ↓
Frontend Composables Refresh
    ↓
UI mise à jour instantanément
```

**Fichiers surveillés :**
- `~/.openclaw/sources/agents.json`
- `~/.openclaw/sources/skills.json`
- `~/.openclaw/sources/projects.json`
- `~/.openclaw/sources/teams.json`
- `~/.openclaw/sources/tokens.json`
- `~/.openclaw/sources/events.json`

**Plugin Nitro :** `server/plugins/source-watcher.ts`  
**Endpoint WebSocket :** `server/api/ws.ts`

---

## Server Utils

### `server/utils/db.ts`

**Singleton SQLite :**
- `getDb()` — retourne l'instance DB (auto-init si besoin)
- `syncDataFromJson()` — seed initial
- `resyncFromJson()` — resync manuel/auto (file watcher)

**Helpers Live Data :**
- `getLiveStats(agentId)` → `{ totalTokens, activeSessions, maxPercentUsed, lastActivity }`
- `getLiveSessions(agentId)` → sessions détaillées avec tokens/contexte

---

## WebSocket

**État actuel :** ✅ Activé (`WS_ENABLED=true`)

**Événements supportés :**
- `connected` — confirmation de connexion
- `data:updated` — données DB mises à jour (suite à file watcher)

**Endpoint :** `GET /api/ws` (upgrade WebSocket via `crossws`)

**Fallback :** Polling 10s si WebSocket échoue

---

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vue 3 + Nuxt 3 + TypeScript |
| Styling | Tailwind CSS |
| DB | SQLite (`better-sqlite3`) |
| WebSocket | `crossws` (Nitro) |
| File Watcher | `chokidar` |
| Tests | Vitest |

---

## Références

- **API complète :** Voir [API.md](./API.md)
- **UI/Composables :** Voir [UI.md](./UI.md)
- **Agents/Teams :** Voir [AGENTS.md](./AGENTS.md)
- **Scripts/Pièges :** Voir [DEVELOPMENT.md](./DEVELOPMENT.md)

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
