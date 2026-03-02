# 🤖 Agents & Teams — OpenClaw UI

**Date :** 2026-03-02  
**Contexte :** Système multi-agents OpenClaw

---

## Agents Actuels

| Agent | ID | Emoji | Team | Rôle | Modèle |
|-------|----|----|------|------|--------|
| Cloclo | `main` | 🔧 | system | orchestrator | claude-opus-4-6 |
| Winston | `winston` | 🏗️ | code | architect | claude-opus-4-6 |
| Amelia | `amelia` | 💻 | code | developer | claude-opus-4-6 |
| Claudio | `claudio` | ⚙️ | code | config | claude-opus-4-6 |

---

## Teams

### System Team
- **Leader :** Cloclo (main)
- **Rôle :** Orchestration, coordination globale, interface avec Lio
- **Skills par défaut :** Tous

### Code Team
- **Membres :** Winston (architect), Amelia (developer), Claudio (config)
- **Rôle :** Développement, architecture, configuration technique
- **Skills par défaut :** coding-agent, github, gh-issues, skill-creator

---

## Communication Inter-Agents

### Mattermost (localhost:8065)
- **Team :** OpenClaw (id: `kwhwcabzet8rmpguc79ttxwrsy`)
- **Channels :**
  - `général` — discussions générales
  - `architecture` — décisions architecture
  - `dev` — développement
  - `config` — configuration
  - `logs` — logs système
  - `review-*` — review de projets (créés dynamiquement)

### OpenClaw Tools
- **`sessions_send`** — Envoyer un message à un autre agent
- **`sessions_spawn`** — Spawn un sous-agent isolé pour une tâche
- **`sessions_list`** — Lister les sessions actives

**Prérequis config :**
```json
{
  "tools": {
    "agentToAgent": { "enabled": true }
  }
}
```

### Chatmode
**`chatmode: "onmessage"`** → Tous les bots connectés au canal répondent (pas seulement celui mentionné).

Pour cibler un seul bot : utiliser DM ou `sessions_send`/`sessions_spawn`.

---

## Création d'Agents

### Checklist Complète

#### 1. Workspace Isolé
```
~/.openclaw/workspace-<agent-id>/
  ├── SOUL.md        # Personnalité, expertise, limites, langue, collaboration
  ├── IDENTITY.md    # Nom, emoji, vibe
  └── USER.md        # Copie du USER.md principal (infos Lio)
```

#### 2. Bot Mattermost

**⚠️ Authentification Admin Obligatoire**

```bash
# 1. Se connecter en admin pour obtenir un Bearer token
TOKEN=$(curl -s -X POST http://localhost:8065/api/v4/users/login \
  -H 'Content-Type: application/json' \
  -d '{"login_id":"lio","password":"nby805Th"}' \
  -D - 2>/dev/null | grep -i "^token:" | awk '{print $2}' | tr -d '\r')

# 2. Créer le bot
curl -X POST http://localhost:8065/api/v4/bots \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"username":"<id>","display_name":"<Nom> <emoji>","description":"..."}'

# 3. Récupérer le user_id du bot
USER_ID=$(curl -s http://localhost:8065/api/v4/users/username/<id> \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')

# 4. Générer un token
curl -X POST http://localhost:8065/api/v4/users/$USER_ID/tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"description":"api-access"}' | jq -r '.token'

# 5. Ajouter à la team OpenClaw
curl -X POST http://localhost:8065/api/v4/teams/kwhwcabzet8rmpguc79ttxwrsy/members \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"team_id":"kwhwcabzet8rmpguc79ttxwrsy","user_id":"'$USER_ID'"}'
```

**⚠️ Piège connu :** `mmctl --local bot create` NE MARCHE PAS en local mode. Toujours utiliser l'API REST.

#### 3. Config OpenClaw (via `gateway config.patch`)

**⚠️ IMPORTANT :** Les arrays (`agents.list`, `bindings`) sont REMPLACÉS, pas mergés. Il faut TOUJOURS renvoyer la liste complète.

**Ajouter dans `agents.list[]` :**
```json
{
  "id": "<agent-id>",
  "name": "<Nom>",
  "workspace": "/Users/caracole/.openclaw/workspace-<agent-id>",
  "model": "anthropic/claude-opus-4-6",
  "identity": { "name": "<Nom>", "emoji": "<emoji>" }
}
```

**Ajouter dans `channels.mattermost.accounts` :**
```json
"<agent-id>": {
  "name": "<Nom> <emoji>",
  "botToken": "<token>"
}
```

**Ajouter dans `bindings[]` :**
```json
{
  "match": { "channel": "mattermost", "accountId": "<agent-id>" },
  "agentId": "<agent-id>"
}
```

**Redémarrer le gateway :** `config.patch` le fait automatiquement.

#### 4. Mettre à Jour `sources/agents.json`

Ajouter l'agent avec `userId` + `token` Mattermost :
```json
{
  "id": "<agent-id>",
  "name": "<Nom>",
  "emoji": "<emoji>",
  "team": "code",
  "role": "developer",
  "status": "active",
  "model": "anthropic/claude-opus-4-6",
  "workspace": "/Users/caracole/.openclaw/workspace-<agent-id>",
  "mattermostUserId": "<user_id>",
  "mattermostToken": "<token>"
}
```

**Note :** Le file watcher détectera la modification et resyncer la DB automatiquement.

#### 5. Vérification Post-Création

```bash
# Logs
tail ~/.openclaw/logs/gateway.log | grep "<agent-id>"

# Devrait afficher :
# [mattermost] [<agent-id>] starting channel
# [mattermost] [<agent-id>] connected as @<agent-id>

# Test DM sur Mattermost
# Envoyer un message au bot → il doit répondre
```

---

## Pièges Connus

### Plugin Mattermost
❌ **Ne PAS installer de copie locale** (`~/.openclaw/extensions/mattermost`)  
✅ Utiliser uniquement le plugin bundled OpenClaw

**Raison :** La copie locale n'a pas accès au `node_modules` parent → erreur `Cannot find module 'zod'`.

### plugins.installs
❌ **Ne pas ajouter** `plugins.installs.mattermost`  
✅ Le plugin bundled est auto-détecté via `plugins.entries.mattermost.enabled: true`

### Session Isolation
**Config actuelle :** `session.dmScope: "per-account-channel-peer"`  
→ Chaque bot a ses sessions isolées par interlocuteur.

### config.patch Arrays
**⚠️ Les arrays sont REMPLACÉS, pas mergés.**  
Toujours inclure l'intégralité de `agents.list` et `bindings`.

---

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `~/.openclaw/scripts/create-agent.sh` | Crée workspace + bot Mattermost (appelé par POST /api/agents) |
| `~/.openclaw/scripts/assign-skill.sh` | Assigne un skill à un agent |
| `~/.openclaw/scripts/add-agent-to-project.sh` | Ajoute un agent à un projet |
| `~/.openclaw/scripts/validate-sources.sh` | Vérifie la cohérence des sources |

---

## Références

- **Architecture :** Voir [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Agents :** Voir [API.md](./API.md#agents)
- **Scripts :** Voir [DEVELOPMENT.md](./DEVELOPMENT.md#scripts)

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
