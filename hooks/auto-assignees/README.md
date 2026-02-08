# 🔗 Auto-Assignees Hook

Synchronise automatiquement les `assignees` des projets avec les agents qui participent aux canaux associés.

## Quick Start

```bash
# Test (dry-run)
node ~/.openclaw/hooks/auto-assignees/reconcile.mjs --dry-run

# Exécution réelle
node ~/.openclaw/hooks/auto-assignees/reconcile.mjs
```

## Comment ça marche

1. **Mapping canal → projet** : Le fichier `~/.openclaw/channel-project-mapping.json` associe chaque canal Mattermost à un projet
2. **Scan des sessions** : Le script parcourt les sessions de tous les agents (`~/.openclaw/agents/*/sessions/`)
3. **Détection** : Si un agent a une session sur un canal mappé, il est ajouté aux `assignees` du projet
4. **Idempotent** : Les agents déjà assignés sont ignorés

## Fichiers

| Fichier | Description |
|---------|-------------|
| `reconcile.mjs` | Script principal de réconciliation |
| `handler.ts` | Hook Gateway (attend event `message:sent`) |
| `channel-mapping.json` | Mapping local (backup) |
| `HOOK.md` | Métadonnées du hook |

## Mapping canal → projet

Le mapping est géré par l'API du dashboard :
- `GET /api/channels/mapping` — liste tous les mappings
- `POST /api/channels/mapping` — ajoute un mapping

Fichier : `~/.openclaw/channel-project-mapping.json`

```json
{
  "wu9p7d9w8pnddrdpr1ztxp9a3y": {
    "projectId": "proj-1770572211-dashboard-v3",
    "channelName": "🧠 Dashboard v3"
  }
}
```

## Cron

Un cron job est configuré pour exécuter la réconciliation toutes les 2 heures :

```bash
# Voir le cron
openclaw cron list

# ID: auto-assignees-reconcile
# Schedule: 0 */2 * * * (Europe/Paris)
```

## Exemple de sortie

```
📋 Chargement du mapping canal → projet...
🔍 Récupération des sessions OpenClaw...
   92 sessions trouvées

📁 Canal: 🧠 Dashboard v3
   → Projet: proj-1770572211-dashboard-v3
   ✓ amelia-dev déjà assigné
   ✓ claudio-openclaw déjà assigné
   ➕ orchestrator à ajouter
   ✓ orchestrator ajouté
   ✓ winston-architecte déjà assigné

💾 Projets sauvegardés
✅ Réconciliation terminée
```

## Limitations

- **Event `message:sent`** : Pas encore implémenté dans OpenClaw core. Le hook `handler.ts` est prêt mais inactif.
- **Solution actuelle** : Réconciliation périodique via cron (toutes les 2h) + exécution manuelle possible.

## Auteur

🦞 Claudio (OpenClaw Specialist)
