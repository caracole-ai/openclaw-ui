# OpenClaw Dashboard — Multi-Agent Management

Dashboard de pilotage pour l'architecture multi-agents OpenClaw.

## 🎯 Fonctionnalités

### 📊 Boards & Graphiques
- **Stats Overview** : KPIs globaux (total agents, actifs, messages, coûts)
- **Répartition par Rôle** : Doughnut chart des agents par type
- **Activité** : Bar chart combiné (messages + taux de succès)
- **Coûts & Tokens** : Line chart dual-axis
- **Table Agents** : Vue détaillée de tous les agents
- **Workflows** : Progression des workflows actifs avec nombre d'agents impliqués

### 🔄 Refresh Dynamique
Bouton **"Refresh Agent Data"** qui :
1. Exécute le script Python `scripts/extract-agents.py`
2. Parse les fichiers MD des agents (`IDENTITY.md`, `SOUL.md`)
3. Détecte automatiquement les capacités (skills, tools, memory)
4. Génère `data/agents.json` conforme aux types TypeScript
5. Recharge l'interface avec les nouvelles données

## 🏗️ Architecture

```
openclaw-ui/
├── types/
│   └── agent.ts              # Types TypeScript stricts pour agents
├── data/
│   ├── agents.json           # Données agents (généré)
│   └── workflows.json        # Workflows actifs
├── scripts/
│   └── extract-agents.py     # Extraction depuis MD → JSON
├── components/
│   ├── AgentRoleChart.vue    # Graphique répartition rôles
│   ├── AgentActivityChart.vue # Graphique activité
│   ├── CostChart.vue         # Graphique coûts/tokens
│   ├── StatsOverview.vue     # KPIs globaux
│   └── StatCard.vue          # Card de statistique
├── pages/
│   └── index.vue             # Page principale
└── server/api/
    └── command.post.ts       # API endpoint pour exécuter scripts

```

## 🚀 Utilisation

### Développement
```bash
cd ~/.openclaw/openclaw-ui
npm run dev
```

### Production (recommandé pour éviter problèmes esbuild)
```bash
# Build
npm run build

# Run
PORT=8080 node .output/server/index.mjs
```

### Refresh manuel des données
```bash
python3 scripts/extract-agents.py
```

## 📝 Types d'Agents

### Rôles disponibles
- **orchestrator** : Orchestre les délibérations
- **specialist** : Expert dans un domaine
- **reviewer** : Revoit et critique
- **executor** : Exécute des tâches
- **monitor** : Surveille et observe
- **bridge** : Connecte différents systèmes

### Structure Agent
```typescript
{
  id: string;
  name: string;
  role: AgentRole;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  description: string;
  model: { provider, name, alias, thinking };
  capabilities: [{ name, description, enabled }];
  metrics: { totalMessages, successRate, avgResponseTime, ... };
  config: { autoStart, timeout, retryAttempts, ... };
  createdAt, updatedAt, tags, linkedAgents, ...
}
```

## 🎨 Personnalisation

### Ajout de nouveaux graphiques
1. Créer un composant Vue dans `components/`
2. Importer Chart.js elements nécessaires
3. L'ajouter dans `pages/index.vue`

### Modification des couleurs
Les couleurs par rôle sont dans les fonctions `getRoleBadgeClass()` et dans les graphiques.

## 🔗 Lien avec les Agents Réels

Le script `extract-agents.py` scanne :
- `~/.openclaw/workspace-agents/*/IDENTITY.md` → nom, emoji, avatar
- `~/.openclaw/workspace-agents/*/SOUL.md` → description, rôle
- `~/.openclaw/workspace-agents/*/skills/` → capacités
- `~/.openclaw/workspace-agents/*/memory/` → métriques d'activité

**Le dashboard reflète la réalité du système** — pas de données fictives une fois les agents créés.

## 💡 Idées d'Évolution

- [ ] Timeline interactive des actions
- [ ] Graphique de réseau (relations entre agents)
- [ ] Logs en temps réel (WebSocket)
- [ ] Création d'agents via interface
- [ ] Éditeur de workflows visuels
- [ ] Notifications push sur événements critiques
- [ ] Export de rapports (PDF/CSV)

---

**Built with ❤️ by Amelia** — Frontend Specialist Agent
