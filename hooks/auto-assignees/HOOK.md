---
name: auto-assignees
description: "Auto-ajoute les agents aux assignees d'un projet quand ils participent dans un canal associé"
metadata:
  openclaw:
    emoji: "🔗"
    events: ["message:sent"]
    requires:
      config: ["workspace.dir"]
    homepage: "https://docs.openclaw.ai/hooks#auto-assignees"
---

# Auto-Assignees Hook

Synchronise automatiquement les `assignees` des projets avec les agents qui y participent réellement.

## ⚠️ Status

**L'event `message:sent` n'est pas encore implémenté dans OpenClaw core.**

En attendant, utilisez le script de réconciliation via cron :
```bash
~/.openclaw/hooks/auto-assignees/reconcile.sh
```

## Fonctionnement (cible)

1. **Détection** — Hook écoute `message:sent` pour les canaux `#delib-*` ou `#proj-*`
2. **Mapping** — Récupère le `projectId` depuis les métadonnées du canal Mattermost
3. **Event** — Émet `agent:joined-project { agentId, projectId }`
4. **Consumer** — Le module projets ajoute l'agent aux assignees si absent

## Flow

```
Agent répond dans #delib-xxx
    ↓
Hook message:sent détecte pattern canal
    ↓
Récupère projectId depuis métadonnées canal
    ↓
Émet event agent:joined-project {agentId, projectId}
    ↓
Consumer (projets) ajoute agent aux assignees
```

## Configuration

Le hook utilise un fichier de mapping canal → projet :

```json
// ~/.openclaw/hooks/auto-assignees/channel-mapping.json
{
  "wu9p7d9w8pnddrdpr1ztxp9a3y": "proj-1770572211-dashboard-v3",
  "channel-id-2": "proj-xxx-autre-projet"
}
```

## Réconciliation (solution immédiate)

Le script `reconcile.sh` peut être appelé manuellement ou via cron :

```bash
# Manuel
./reconcile.sh

# Via cron OpenClaw (recommandé)
# Ajouter un cron job qui appelle le script toutes les heures
```

## Logs

- `[auto-assignees] Agent {agent} joined project {project}`
- `[auto-assignees] Channel {channel} not mapped to any project`
