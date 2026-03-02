# 🛠️ Development — Scripts, Pièges, Tests, TODO

**Date :** 2026-03-02  
**Repo :** `caracole-ai/openclaw-ui`  
**Config :** `caracole-ai/openclaw-config`

---

## Scripts (`~/.openclaw/scripts/`)

### Agents
| Script | Description |
|--------|-------------|
| `create-agent.sh` | Crée workspace + bot Mattermost (appelé par `POST /api/agents`) |
| `assign-skill.sh` | Assigne un skill à un agent |
| `validate-sources.sh` | Vérifie la cohérence des sources |

**Usage :**
```bash
# Créer un agent (via API recommandé)
POST /api/agents { id, name, team, role, emoji }

# Assigner un skill
~/.openclaw/scripts/assign-skill.sh winston console-prompting-tools
```

---

### Projets
| Script | Description |
|--------|-------------|
| `create-project.sh` | Crée dossier projet + fichiers |
| `add-agent-to-project.sh` | Ajoute un agent à un projet |

**Usage :**
```bash
# Créer un projet (via API recommandé)
POST /api/projects { id, name, state, description }

# Ajouter un agent
~/.openclaw/scripts/add-agent-to-project.sh openclaw-ui winston architect
```

---

### Tokens
| Script | Description |
|--------|-------------|
| `record-token-usage.sh` | Enregistre un event token |
| `sync-tokens.sh` | Sync depuis `openclaw status` |

**Usage :**
```bash
# Enregistrer manuellement
~/.openclaw/scripts/record-token-usage.sh winston openclaw-ui 50000 0.25 claude-opus-4-6

# Sync auto (cron recommandé)
~/.openclaw/scripts/sync-tokens.sh
```

---

## Pièges Documentés

### 1. Plugin Mattermost Local ❌
**Ne PAS installer de copie locale** (`~/.openclaw/extensions/mattermost`).

**Raison :** Cause `Cannot find module 'zod'` car la copie locale n'a pas accès au `node_modules` parent.

**Solution :** Utiliser uniquement le plugin bundled OpenClaw.

---

### 2. `plugins.installs` ❌
**Ne pas ajouter** `plugins.installs.mattermost`.

**Raison :** Le plugin bundled est auto-détecté via `plugins.entries.mattermost.enabled: true`.

---

### 3. `config.patch` Arrays ⚠️
Les arrays (`agents.list`, `bindings`) sont **REMPLACÉS**, pas mergés.

**Problème :**
```json
// MAUVAIS : va écraser les autres agents
{ "agents.list": [{ "id": "nouveau" }] }

// BON : inclure TOUS les agents
{ "agents.list": [
  { "id": "main" },
  { "id": "winston" },
  { "id": "amelia" },
  { "id": "claudio" },
  { "id": "nouveau" }
]}
```

**Solution :** Toujours GET la config actuelle avant PATCH.

---

### 4. WebSocket Sans Handler 🔥
Activer WebSocket sans backend event handler → `ECONNRESET` → crash-loop.

**Solution :** Le file watcher + `server/api/ws.ts` sont maintenant implémentés. `WS_ENABLED=true` est safe.

---

### 5. Composables Non-Singleton 🔄
State dans la fonction → multi-fetch → flood d'erreurs.

**Problème :**
```typescript
// MAUVAIS
export function useAgents() {
  const agents = ref([]) // Nouvelle instance à chaque appel
  // ...
}

// BON
const agents = ref([]) // Hoisted, partagé
export function useAgents() {
  // ...
}
```

**Solution :** State hoisted (déjà implémenté dans tous les composables actuels).

---

### 6. `contextTokens` vs Usage 📊
Le champ `contextTokens` dans les session stores = **taille de la fenêtre** (ex: 200k), PAS l'usage réel.

**Usage réel :** Calculé depuis `messages[].tokens` (somme).

**Helper :** `getLiveStats(agentId)` fait ce calcul correctement.

---

### 7. SQLite WAL Mode 📁
SQLite crée des fichiers temporaires `-wal` et `-shm`.

**Solution :** Gitignorés (`.gitignore` : `*.db-wal`, `*.db-shm`).

---

### 8. Migration JSON→DB (auto-seed) 🌱
La migration se fait automatiquement au premier boot, **une seule fois**.

**Flag :** `meta.seeded = true` après seed initial.

**Resync manuel :**
```bash
# Supprimer la DB → reseed au prochain boot
rm ~/.openclaw/dashboard.db

# Ou déclencher un resync sans supprimer
touch ~/.openclaw/sources/agents.json # File watcher → resync auto
```

---

## Tests

### Tests Unitaires/Intégration (Vitest)

**Lancer les tests :**
```bash
npm run test:unit
```

**Suites :**
- 12 suites passées
- 117/147 tests passed
- 5 tests skipped (intentionnels)
- 25 tests todo (fonctionnalités futures)

**Résultat actuel :** ✅ Aucun test cassé

---

### Tests DB (via API)

**Endpoint :** `GET /api/tests/suites`

**3 suites, 9 tests :**
1. **Data Integrity** — vérifications FK, NOT NULL, types
2. **Cross References** — cohérence entre tables
3. **Schema Health** — index, meta, seeded flag

**Résultat :** ✅ 9/9 passed (last check 2026-02-25)

---

### Tests Endpoints (via API)

**Endpoint :** `GET /api/tests/endpoints`

**9 endpoints testés :**
- `GET /api/agents`
- `GET /api/projects`
- `GET /api/skills`
- `GET /api/tokens/summary`
- `GET /api/tokens/timeline`
- `GET /api/sources/agents`
- `GET /api/sources/projects`
- `GET /api/sources/skills`
- `GET /api/sources/teams`

**Résultat :** ✅ 9/9 passed (last check 2026-02-25)

---

### Tests Manuels

#### File Watcher
```bash
# Terminal 1
npm run dev

# Terminal 2
touch ~/.openclaw/sources/agents.json

# Vérifier logs du serveur
# ✅ Devrait afficher :
# [watcher] Source file changed: ...
# [db] Resynced from JSON sources
# [watcher] DB resynced and clients notified
```

**Résultat :** ✅ Fonctionne (testé 2026-02-25)

---

#### WebSocket
```bash
# Ouvrir le dashboard dans le navigateur
# Ouvrir DevTools → Network → WS

# ✅ Doit afficher :
# Connection to ws://localhost:3000/api/ws
# Message: {"type":"connected"}

# Modifier un fichier source
touch ~/.openclaw/sources/projects.json

# ✅ Doit recevoir :
# Message: {"type":"data:updated"}
```

**Résultat :** ✅ Fonctionne (testé 2026-02-25)

---

### Test Script Automatisé

**Script :** `test-sync.sh` (racine du projet)

**Checks :**
- SQLite DB existe
- 6 fichiers JSON sources présents
- File watcher installé
- WebSocket endpoint créé
- Tests unitaires OK
- TypeScript OK (via Nuxt)

**Résultat :** ✅ Tous checks OK (last run 2026-02-25)

---

## TODO

### UI
- [ ] Page `/tests` avec affichage des résultats
- [ ] Dark mode
- [ ] Responsive mobile
- [ ] SOUL/IDENTITY editor (endpoints existent, manque l'UI)

### Backend
- [ ] WebSocket events complets (au-delà de `data:updated`)
  - `agent:created`
  - `project:stateChanged`
  - `skill:assigned`
  - etc.
- [ ] Commandes WebSocket client → serveur (refresh on demand, force sync)

### Tests
- [ ] Tests e2e Playwright (flows complets)
- [ ] Health check endpoint pour watcher
- [ ] Metrics Prometheus (resync frequency, latency)

### Features
- [ ] Notifications UI toast quand données mises à jour (via WebSocket)
- [ ] Support création/suppression dynamique de fichiers sources (file watcher)
- [ ] Export/import configuration complète (agents + projets + skills)

---

## Git Workflow

### Branches
**Default :** `main` (pour `openclaw-config` et `openclaw-ui`)

**Règle :** Toujours push sur `main` sauf demande explicite de Lio.

**Pas de feature branches** (workflow direct).

---

### Commits
**Format libre**, mais préférer :
- Messages clairs et concis
- Grouper les changements logiques
- Éviter les commits "WIP" en production

**Exemple :**
```bash
git commit -m "feat: add project activity timeline"
git commit -m "fix: websocket reconnect on disconnect"
git commit -m "docs: update API.md with new endpoints"
```

---

### Push
```bash
# openclaw-ui
cd ~/Desktop/coding-projects/openclaw-ui
git add .
git commit -m "..."
git push origin main

# openclaw-config
cd ~/.openclaw
git add .
git commit -m "..."
git push origin main
```

---

## Références

- **Architecture :** Voir [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API :** Voir [API.md](./API.md)
- **UI :** Voir [UI.md](./UI.md)
- **Agents :** Voir [AGENTS.md](./AGENTS.md)

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
