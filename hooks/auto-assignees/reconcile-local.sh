#!/bin/bash
# Auto-Assignees Local Reconciliation
# Scanne les sessions OpenClaw pour détecter les participations aux canaux projets
#
# Usage: ./reconcile-local.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_FILE="$HOME/.openclaw/projects/projects.json"
# Utilise le mapping centralisé d'Amelia, fallback sur le local
MAPPING_FILE="$HOME/.openclaw/channel-project-mapping.json"
MAPPING_FILE_LOCAL="$SCRIPT_DIR/channel-mapping.json"

if [[ ! -f "$MAPPING_FILE" ]]; then
  MAPPING_FILE="$MAPPING_FILE_LOCAL"
fi
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🧪 Mode dry-run activé"
fi

# Vérifier les fichiers requis
if [[ ! -f "$PROJECTS_FILE" ]]; then
  echo "❌ Fichier projects.json non trouvé: $PROJECTS_FILE"
  exit 1
fi

if [[ ! -f "$MAPPING_FILE" ]]; then
  echo "⚠️ Fichier channel-mapping.json non trouvé"
  exit 1
fi

echo "📋 Chargement du mapping canal → projet..."
echo "🔍 Scan des sessions OpenClaw..."

# Pour chaque canal mappé (supporte les deux formats)
jq -r 'to_entries[] | "\(.key)|\(.value.projectId // .value)"' "$MAPPING_FILE" | while IFS='|' read -r CHANNEL_ID PROJECT_ID; do
  echo ""
  echo "📁 Canal: $CHANNEL_ID → Projet: $PROJECT_ID"
  
  # Récupérer le nom du projet pour affichage
  PROJECT_NAME=$(jq -r --arg pid "$PROJECT_ID" \
    '.projects[] | select(.id == $pid) | .name // $pid' \
    "$PROJECTS_FILE" 2>/dev/null)
  echo "   Projet: $PROJECT_NAME"
  
  # Trouver les agents qui ont des sessions sur ce canal
  # Pattern de sessionKey: agent:{agentId}:mattermost:channel:{channelId}
  AGENTS_IN_CHANNEL=$(jq -r --arg cid "$CHANNEL_ID" '
    .agents | keys[] as $agent | 
    select(.[$agent]) | 
    $agent
  ' ~/.openclaw/openclaw.json 2>/dev/null)
  
  # Vérifier les sessions actives via la structure des clés
  for AGENT in $AGENTS_IN_CHANNEL; do
    # Vérifier si l'agent a une session dans ce canal (pattern dans les transcripts)
    TRANSCRIPT_EXISTS=$(ls ~/.openclaw/transcripts/*.jsonl 2>/dev/null | \
      xargs grep -l "\"channel\":\"$CHANNEL_ID\"" 2>/dev/null | \
      xargs grep -l "\"agentId\":\"$AGENT\"" 2>/dev/null | head -1)
    
    if [[ -n "$TRANSCRIPT_EXISTS" ]]; then
      # Vérifier si déjà assigné
      CURRENT_ASSIGNEES=$(jq -r --arg pid "$PROJECT_ID" \
        '.projects[] | select(.id == $pid) | .assignees // []' \
        "$PROJECTS_FILE" 2>/dev/null)
      
      IS_ASSIGNED=$(echo "$CURRENT_ASSIGNEES" | jq -r --arg agent "$AGENT" 'index($agent)')
      
      if [[ "$IS_ASSIGNED" == "null" ]]; then
        echo "  ➕ Agent $AGENT a participé, à ajouter"
        
        if [[ "$DRY_RUN" == "false" ]]; then
          TMP_FILE=$(mktemp)
          jq --arg pid "$PROJECT_ID" --arg agent "$AGENT" \
            '(.projects[] | select(.id == $pid) | .assignees) += [$agent]' \
            "$PROJECTS_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$PROJECTS_FILE"
          echo "  ✓ Agent $AGENT ajouté"
        fi
      else
        echo "  ✓ Agent $AGENT déjà assigné"
      fi
    fi
  done
done

echo ""
echo "✅ Réconciliation terminée"
