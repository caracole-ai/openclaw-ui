# IDEAS to DASHBOARD — Summary

**Winston** 🏗️ — 2026-03-07

## Ce qui a été implémenté

Automatisation complète de la création de projets depuis le canal Mattermost "IDEAS to DASHBOARD".

### Workflow

1. Lio poste une idée dans "IDEAS to DASHBOARD"
2. Webhook Mattermost → Backend Nuxt
3. Système crée projet + canal + brief agents automatiquement
4. Agents collaborent → document MD
5. Transitions backlog→planning et planning→build restent manuelles (Lio)

### Fichiers modifiés/créés

#### Nouveaux fichiers

```
server/api/webhooks/mattermost/ideas.post.ts    (5.1 KB)
server/utils/mattermost.ts                      (3.3 KB)
docs/ideas-to-dashboard.md                      (8.1 KB)
.env.example                                    (0.6 KB)
```

#### Fichiers modifiés

```
server/utils/db.ts          # Schema: + idea_channel_id, document_status
server/types/db.ts          # Type DbProject: + 2 champs
server/utils/mattermost.ts  # Ajout fonctions matchAgents(), createProjectChannel(), etc.
                            # (préserve fonctions existantes pour ceremonies)
```

### Base de données

**Table `projects`** — nouveaux champs :

```sql
idea_channel_id TEXT,                    -- ID canal Mattermost créé
document_status TEXT DEFAULT 'pending'   -- pending | in_progress | completed
```

Migration automatique au prochain `npm run dev` (schema in-memory avec WAL mode).

### Configuration requise

Ajouter à `.env` :

```bash
MATTERMOST_URL=https://your-instance.com
MATTERMOST_TOKEN=your_admin_token
MATTERMOST_TEAM_ID=your_team_id
MATTERMOST_WEBHOOK_SECRET=random_secret
```

**Puis** : configurer outgoing webhook dans Mattermost (voir docs/ideas-to-dashboard.md).

### Tests

```bash
# Test local
npm run dev

curl -X POST http://localhost:8080/api/webhooks/mattermost/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "channel_name": "IDEAS to DASHBOARD",
    "user_name": "lio",
    "text": "Titre\n\nDescription avec keywords backend et frontend",
    "token": "your_secret"
  }'
```

**Expected** :
```json
{
  "status": "success",
  "projectId": "titre-123456",
  "channelId": "abc123",
  "assignedAgents": ["Winston", "Amelia"]
}
```

### Agent Matching

**Stratégie v1** : Keyword-based

- Lit `~/.openclaw/sources/agents.json`
- Extrait `expertise[]` pour chaque agent
- Compte keywords dans description
- Retourne top 3 agents
- Fallback : orchestrator (id: `main`)

**Exemple** : description contenant "backend" + "api" → Winston (expertise: ["architecture", "backend", "api"]) = score 2

### Architecture

- **Stack** : Nuxt 3 server routes + SQLite
- **No external deps** : Nuxt `$fetch` pour HTTP
- **Security** : Webhook token verification
- **Fallback** : Orchestrator si aucun match

### Documentation

**Docs complète** : `docs/ideas-to-dashboard.md`

Contient :
- Workflow détaillé
- Configuration step-by-step
- Tests (local + end-to-end)
- Troubleshooting
- Évolutions futures (LLM matching, UI, notifications)

### État actuel

✅ **Backend** : Prêt  
⏸️ **Config** : Attente credentials Mattermost (Orchestrator)  
⏸️ **Test** : Attente configuration webhook  
❌ **Frontend** : Pas encore implémenté (afficher idea_channel_id + document_status)

### Actions requises (Orchestrator)

1. **Créer canal** "IDEAS to DASHBOARD" dans Mattermost (si n'existe pas)
2. **Obtenir credentials** :
   - Personal access token (admin)
   - Team ID
   - Générer webhook secret
3. **Ajouter à `.env`**
4. **Configurer outgoing webhook** Mattermost (voir doc section Configuration)
5. **Tester** avec curl (voir section Tests)
6. **Tester end-to-end** en postant dans le canal

### Limites connues

- Agent matching = keywords simples (pas de LLM)
- Nom canal = max 64 chars (tronqué automatiquement)
- Document status manuel (agents doivent notifier @orchestrator quand doc complété)
- Pas d'UI frontend pour afficher statut document

### Évolutions futures

- LLM-based agent matching (v2)
- Auto-extraction titre/description si message non structuré
- Notification Lio quand doc complété
- UI dashboard : lien canal + badge status
- Multi-template briefs selon type projet

### Contact

- **Winston** 🏗️ : Architecture, backend implementation
- **Orchestrator** 🔧 : Configuration, workflow coordination

---

**Next** : Orchestrator configure Mattermost + teste le webhook.
