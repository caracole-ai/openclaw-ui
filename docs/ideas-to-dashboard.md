# IDEAS to DASHBOARD — Automation

## Vue d'ensemble

Automatisation de la création de projets depuis le canal Mattermost **"IDEAS to DASHBOARD"**.

Lorsque Lio poste une idée dans ce canal, le système :
1. Crée automatiquement un projet (statut: backlog)
2. Associe les agents pertinents (basé sur expertise)
3. Crée un canal Mattermost dédié
4. Invite les agents au canal
5. Poste un brief demandant aux agents de collaborer sur un document MD

## Workflow

```
Lio poste dans "IDEAS to DASHBOARD"
         ↓
Webhook Mattermost → POST /api/webhooks/mattermost/ideas
         ↓
1. Parse message → titre + description
2. Match agents (expertise keywords)
3. Créer projet en DB (status: backlog, document_status: pending)
4. Créer canal Mattermost "#proj-<id>-<slug>"
5. Inviter agents au canal
6. Envoyer brief aux agents
         ↓
Agents collaborent → produisent doc MD
         ↓
Doc complété → mention @orchestrator
         ↓
Orchestrator met à jour document_status → 'completed'
```

## Transitions manuelles

- **backlog → planning** : validation Lio uniquement
- **planning → build** : validation Lio uniquement

## Architecture

### Stack

- **Backend**: Nuxt 3 server routes
- **DB**: SQLite (better-sqlite3)
- **Integration**: Mattermost API v4 (REST)

### Fichiers

```
openclaw-ui/
├── server/
│   ├── api/
│   │   └── webhooks/
│   │       └── mattermost/
│   │           └── ideas.post.ts          # Webhook endpoint
│   ├── utils/
│   │   ├── db.ts                          # DB schema (modified)
│   │   └── mattermost.ts                  # Mattermost client (new)
│   └── types/
│       └── db.ts                          # TypeScript types (modified)
├── .env                                    # Config Mattermost
└── docs/
    └── ideas-to-dashboard.md              # Cette doc
```

### Schema DB

**Table `projects`** — nouveaux champs :
```sql
idea_channel_id TEXT,           -- ID du canal Mattermost créé
document_status TEXT DEFAULT 'pending'  -- pending | in_progress | completed
```

### Endpoint

```
POST /api/webhooks/mattermost/ideas
Content-Type: application/json

{
  "channel_name": "IDEAS to DASHBOARD",
  "user_name": "lio",
  "text": "Titre du projet\n\nDescription détaillée...",
  "token": "webhook_secret"
}
```

### Agent Matching

**Version actuelle (v1)** : Keyword-based

1. Charge `~/.openclaw/sources/agents.json`
2. Extrait `expertise[]` pour chaque agent
3. Compte les keywords présents dans la description
4. Retourne top 3 agents (score > 0)
5. Fallback : si aucun match → orchestrator (id: `main`)

**Exemple** :
```json
{
  "id": "winston",
  "expertise": ["architecture", "backend", "nestjs", "api"]
}
```

Description contenant "backend" et "api" → winston score = 2

### Brief Template

Le brief posté dans le canal projet contient :
- Titre + description
- Liste agents assignés
- Mission (analyser, collaborer, produire doc MD)
- Format attendu
- Note sur transitions manuelles

## Configuration

### 1. Variables d'environnement

Ajouter à `openclaw-ui/.env` :

```bash
MATTERMOST_URL=https://your-mattermost-instance.com
MATTERMOST_TOKEN=your_admin_personal_access_token
MATTERMOST_TEAM_ID=your_team_id
MATTERMOST_WEBHOOK_SECRET=random_secret_for_webhook_verification
```

**Comment obtenir ces valeurs** :

1. **MATTERMOST_URL** : URL de votre instance Mattermost
2. **MATTERMOST_TOKEN** : 
   - System Admin → Profile → Personal Access Tokens → Create Token
3. **MATTERMOST_TEAM_ID** :
   - Main Menu → Team Settings → View Team ID
4. **MATTERMOST_WEBHOOK_SECRET** :
   - Générer avec : `openssl rand -hex 32`

### 2. Webhook Mattermost

1. System Console → Integrations → Enable Outgoing Webhooks (ON)
2. Main Menu → Integrations → Outgoing Webhooks → Add Outgoing Webhook
3. Configuration :
   - **Title**: IDEAS to DASHBOARD Automation
   - **Channel**: IDEAS to DASHBOARD
   - **Trigger Words**: (laisser vide = tout message)
   - **Callback URL**: `https://your-backend.com/api/webhooks/mattermost/ideas`
   - **Content Type**: application/json
   - **Token**: Copier → utiliser comme `MATTERMOST_WEBHOOK_SECRET`

4. Save

### 3. Agents expertise

Vérifier que `~/.openclaw/sources/agents.json` contient le champ `expertise` :

```json
{
  "agents": [
    {
      "id": "winston",
      "expertise": ["architecture", "backend", "nestjs", "api"],
      "mattermost": {
        "userId": "yhn8knyczfrjzfthp9kro8hzor"
      }
    }
  ]
}
```

## Tests

### Test local (webhook simulation)

```bash
# Démarrer le serveur
cd ~/Desktop/coding-projects/openclaw-ui
npm run dev

# Dans un autre terminal
curl -X POST http://localhost:8080/api/webhooks/mattermost/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "channel_name": "IDEAS to DASHBOARD",
    "user_name": "lio",
    "text": "Migration SQLite → PostgreSQL\n\nOn arrive aux limites de SQLite pour la scalabilité. Besoin de migrer vers Postgres avec zero downtime.",
    "token": "your_webhook_secret"
  }'
```

**Réponse attendue** :
```json
{
  "status": "success",
  "projectId": "migration-sqlite-postgresql-123456",
  "channelId": "abc123xyz",
  "channelName": "proj-migration-sqlite-postgresql-123456-migration-sqli",
  "assignedAgents": ["Winston", "Claudio"]
}
```

### Test end-to-end

1. Aller dans Mattermost → canal "IDEAS to DASHBOARD"
2. Poster un message :
   ```
   Nouveau système de notifications
   
   Besoin d'un système de notifications en temps réel pour le dashboard. 
   Push notifications + WebSockets + UI components.
   ```
3. Vérifier :
   - [ ] Projet créé dans le dashboard (statut: backlog)
   - [ ] Nouveau canal `#proj-nouveau-systeme-notif-...` créé
   - [ ] Agents pertinents invités (Amelia pour UI, Winston pour backend, etc.)
   - [ ] Brief posté dans le canal

### Logs serveur

```bash
# Logs Nuxt
tail -f .output/server.log

# Chercher :
# [webhook] Received from IDEAS to DASHBOARD
# [mattermost] Matched agents: winston, amelia
# [mattermost] Created channel: proj-...
```

## Troubleshooting

### Webhook ne se déclenche pas

- Vérifier que le webhook token dans `.env` correspond à celui de Mattermost
- Vérifier que le webhook est activé pour le bon canal
- Consulter Mattermost logs : System Console → Logs

### Channel creation échoue

- Vérifier que `MATTERMOST_TOKEN` a les permissions admin
- Vérifier que `MATTERMOST_TEAM_ID` est correct
- S'assurer que le nom du canal est unique et < 64 caractères

### Aucun agent assigné

- Vérifier que `~/.openclaw/sources/agents.json` existe
- Vérifier que les agents ont le champ `expertise`
- Ajouter des keywords pertinents dans `expertise`
- Fallback : orchestrator (id: `main`) sera assigné

### DB schema mismatch

Si erreur au runtime :
```bash
# Supprimer la DB (⚠️ perte de données)
rm ~/.openclaw/dashboard.db

# Redémarrer le serveur (recrée la DB avec nouveau schema)
npm run dev
```

Ou migrer manuellement :
```bash
sqlite3 ~/.openclaw/dashboard.db
> ALTER TABLE projects ADD COLUMN idea_channel_id TEXT;
> ALTER TABLE projects ADD COLUMN document_status TEXT DEFAULT 'pending';
> .quit
```

## Évolutions futures (v2)

### Agent matching LLM-based

Remplacer matching par keywords par analyse LLM :
- Passer description + liste agents à un LLM
- Demander de sélectionner les 3 agents les plus pertinents
- Plus flexible, comprend le contexte sémantique

### Auto-extraction titre/description

Si message non structuré (pas de ligne de titre claire) :
- LLM extrait titre + description
- Plus robuste pour messages informels

### Notification Lio

Quand agents postent le document final :
- Détecter mention @orchestrator
- Mettre à jour `document_status` → 'completed'
- Notifier Lio via Mattermost DM

### UI Dashboard

- Display `idea_channel_id` comme lien cliquable vers canal Mattermost
- Badge `document_status` (pending/in_progress/completed)
- Boutons "Transition → planning/build" visibles uniquement pour Lio

### Multi-template briefs

Différents templates selon le type de projet :
- Feature (backend + frontend)
- Bug fix (simple)
- Research (documentation focus)

### Rate limiting

Protection DoS si volume élevé :
- Throttle webhook : max 10 ideas/minute par user
- Redis ou in-memory store pour tracking
- Réponse HTTP 429 si limite dépassée

### Validation renforcée

- Max length description (5000 chars)
- Validation format message (reject messages vides/invalides)
- Sanitization titre/description (XSS prevention)

## Contact

- **Winston** 🏗️ : Architecture & backend
- **Orchestrator** 🔧 : Coordination & workflow
