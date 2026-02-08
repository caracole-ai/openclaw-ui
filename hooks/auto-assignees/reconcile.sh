#!/bin/bash
# Auto-Assignees Reconciliation Script
# Synchronise les assignees des projets avec les participants réels des canaux
#
# Usage: ./reconcile.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_FILE="$HOME/.openclaw/projects/projects.json"
MAPPING_FILE="$SCRIPT_DIR/channel-mapping.json"
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
  echo "⚠️ Fichier channel-mapping.json non trouvé, création..."
  echo "{}" > "$MAPPING_FILE"
fi

# Charger le mapping canal -> projet
echo "📋 Chargement du mapping canal → projet..."

# Récupérer les variables Mattermost depuis la config OpenClaw
MM_URL=$(jq -r '.channels.mattermost.baseUrl // empty' ~/.openclaw/openclaw.json 2>/dev/null)
MM_TOKEN=$(jq -r '.channels.mattermost.botToken // empty' ~/.openclaw/openclaw.json 2>/dev/null)

if [[ -z "$MM_URL" || -z "$MM_TOKEN" ]]; then
  echo "❌ Configuration Mattermost manquante dans openclaw.json"
  exit 1
fi

echo "🔍 Scan des canaux projet..."

# Pour chaque canal mappé
jq -r 'to_entries[] | "\(.key)|\(.value)"' "$MAPPING_FILE" | while IFS='|' read -r CHANNEL_ID PROJECT_ID; do
  echo ""
  echo "📁 Canal: $CHANNEL_ID → Projet: $PROJECT_ID"
  
  # Récupérer les membres du canal Mattermost
  RESPONSE=$(curl -s -H "Authorization: Bearer $MM_TOKEN" \
    "$MM_URL/api/v4/channels/$CHANNEL_ID/members?per_page=200" 2>/dev/null)
  
  # Vérifier si la réponse est valide
  if ! echo "$RESPONSE" | jq -e '.' >/dev/null 2>&1; then
    echo "  ⚠️ Réponse API invalide"
    continue
  fi
  
  # Extraire les user_ids
  USER_IDS=$(echo "$RESPONSE" | jq -r '.[].user_id // empty' 2>/dev/null)
  
  if [[ -z "$USER_IDS" ]]; then
    echo "  ⚠️ Aucun membre trouvé ou canal inaccessible"
    continue
  fi
  
  # Pour chaque membre
  for USER_ID in $USER_IDS; do
    # Récupérer le username
    USER_RESPONSE=$(curl -s -H "Authorization: Bearer $MM_TOKEN" \
      "$MM_URL/api/v4/users/$USER_ID" 2>/dev/null)
    
    USERNAME=$(echo "$USER_RESPONSE" | jq -r '.username // empty' 2>/dev/null)
    
    if [[ -z "$USERNAME" ]]; then
      continue
    fi
    
    # Vérifier si c'est un agent (existe dans la config OpenClaw)
    AGENT_EXISTS=$(jq -r --arg name "$USERNAME" '.agents[$name] // empty' ~/.openclaw/openclaw.json 2>/dev/null)
    
    if [[ -n "$AGENT_EXISTS" ]]; then
      # Vérifier si déjà dans les assignees du projet
      CURRENT_ASSIGNEES=$(jq -r --arg pid "$PROJECT_ID" \
        '.projects[] | select(.id == $pid) | .assignees // []' \
        "$PROJECTS_FILE" 2>/dev/null)
      
      IS_ASSIGNED=$(echo "$CURRENT_ASSIGNEES" | jq -r --arg agent "$USERNAME" 'index($agent)')
      
      if [[ "$IS_ASSIGNED" == "null" ]]; then
        echo "  ➕ Agent $USERNAME à ajouter"
        
        if [[ "$DRY_RUN" == "false" ]]; then
          # Ajouter l'agent aux assignees
          TMP_FILE=$(mktemp)
          jq --arg pid "$PROJECT_ID" --arg agent "$USERNAME" \
            '(.projects[] | select(.id == $pid) | .assignees) += [$agent]' \
            "$PROJECTS_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$PROJECTS_FILE"
          echo "  ✓ Agent $USERNAME ajouté"
        fi
      else
        echo "  ✓ Agent $USERNAME déjà assigné"
      fi
    fi
  done
done

echo ""
echo "✅ Réconciliation terminée"
