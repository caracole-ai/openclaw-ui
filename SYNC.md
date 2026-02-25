# Synchronisation Temps Réel JSON → SQLite

## Vue d'ensemble

Le dashboard utilise SQLite (`~/.openclaw/dashboard.db`) comme source de vérité unique. Les fichiers JSON dans `~/.openclaw/sources/` sont seedés une seule fois au démarrage, puis synchronisés automatiquement en temps réel grâce à un file watcher.

## Architecture

```
~/.openclaw/sources/*.json  →  File Watcher  →  Resync DB  →  WebSocket Event  →  Frontend Refresh
```

### Composants

1. **File Watcher** (`server/plugins/source-watcher.ts`)
   - Surveille les 6 fichiers JSON sources : `agents`, `skills`, `projects`, `teams`, `tokens`, `events`
   - Utilise `chokidar` pour détecter les changements
   - Debounce de 1 seconde pour éviter les resyncs multiples
   - Auto-démarre avec le serveur Nuxt

2. **Resync DB** (`server/utils/db.ts`)
   - Fonction `resyncFromJson()` qui réimporte les données JSON dans SQLite
   - Utilise des transactions pour garantir la cohérence
   - Gère les relations (agents ↔ projects, skills ↔ agents, etc.)
   - Nettoie les anciennes relations avant de réinsérer (projects, phases)

3. **WebSocket Server** (`server/api/ws.ts`)
   - Endpoint WebSocket sur `/api/ws`
   - Gère les connexions clients
   - Broadcast l'événement `data:updated` quand les sources changent
   - Compatible avec `crossws` (système WebSocket de Nuxt 3)

4. **WebSocket Client** (`composables/useWebSocket.ts`)
   - Connexion automatique au démarrage de l'app
   - Gère la reconnexion en cas de perte de connexion
   - Pattern singleton pour partager la connexion entre tous les composables

5. **Composables Réactifs**
   - `useAgents`, `useProjects`, `useSkills`, `useTokens`
   - Écoutent l'événement `data:updated` via WebSocket
   - Rafraîchissent automatiquement leurs données quand un fichier JSON change
   - Gardent le polling 10s comme fallback

## Workflow

### Au démarrage du serveur

1. SQLite se connecte à `~/.openclaw/dashboard.db`
2. Si la DB n'a jamais été seedée, elle importe les JSON sources
3. Le file watcher démarre et surveille les fichiers JSON
4. Le WebSocket server écoute sur `/api/ws`

### Quand un fichier JSON change

1. Le file watcher détecte le changement (ex: `agents.json` modifié)
2. Après 1 seconde de debounce, il appelle `resyncFromJson()`
3. La DB est mise à jour en une transaction atomique
4. Un événement `data:updated` est broadcast via WebSocket
5. Les composables frontend reçoivent l'événement et rafraîchissent leurs données
6. L'UI est mise à jour instantanément

## Logs

Le watcher produit des logs utiles pour le debug :

```
[watcher] Watching sources: /Users/caracole/.openclaw/sources
[watcher] Source file changed: /Users/caracole/.openclaw/sources/agents.json
[db] Resynced from JSON sources
[watcher] DB resynced and clients notified
[ws] Client connected: peer-xyz
[ws] Client disconnected: peer-xyz
```

## Tests

Les tests existants (117/147) continuent de passer. Le watcher ne casse pas la logique de seed initial.

### Test manuel

```bash
# Modifier un fichier JSON
touch ~/.openclaw/sources/agents.json

# Vérifier les logs du serveur
# Devrait afficher :
# [watcher] Source file changed: ...
# [db] Resynced from JSON sources
# [watcher] DB resynced and clients notified
```

## Configuration

Le WebSocket est activé par défaut (`WS_ENABLED=true` dans `composables/useWebSocket.ts`).

Si vous voulez désactiver le WebSocket (polling uniquement) :
```ts
// composables/useWebSocket.ts
const WS_ENABLED = false
```

Le watcher reste actif même si le WebSocket est désactivé (la DB sera toujours mise à jour).

## Performance

- **Debounce** : 1 seconde pour éviter les resyncs multiples
- **Transactions** : toutes les écritures sont atomiques
- **Polling fallback** : 10 secondes si WebSocket échoue
- **Singleton** : une seule connexion WebSocket partagée

## Limitations

- Le watcher ne détecte que les modifications des fichiers existants (pas les créations/suppressions)
- Les données live (sessions gateway) restent en polling 10s (pas dans les sources JSON)
- Le WebSocket ne supporte pas encore les commandes du client vers le serveur (one-way pour l'instant)

## Future

- [ ] Réactiver tous les événements WebSocket du PRD (`agent:created`, `project:stateChanged`, etc.)
- [ ] Support des commandes client → serveur (refresh on demand, etc.)
- [ ] Health check endpoint pour monitorer le watcher
- [ ] Metrics sur la fréquence de resync
