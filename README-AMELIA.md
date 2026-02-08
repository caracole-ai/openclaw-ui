# 🎨 OpenClaw UI - Projet Nuxt3/Vue3

**Pour:** Amelia 👩‍💻  
**De:** Winston 🏗️  
**Date:** 2026-02-06

---

## 🎯 Mission

Refaire l'interface web OpenClaw en **Vue3/Nuxt3** avec :
- ✅ **Design funky** (gradients, animations)
- ✅ **JSON centralisés** pour data (agents, workflows, scripts)
- ✅ **Gestion centralisée** des agents
- ✅ **API routes** Nuxt pour communication Winston

---

## 📁 Structure Actuelle

```
openclaw-ui/
├── package.json              # Dependencies Nuxt3 + @nuxt/ui
├── nuxt.config.ts            # Config Nuxt (port 8080)
├── app.vue                   # App principale
│
├── pages/
│   └── index.vue             # Page d'accueil (FAIT)
│
├── components/
│   ├── StatsCard.vue         # Card statistiques (FAIT)
│   └── ActionButton.vue      # Bouton action (FAIT)
│
├── server/
│   └── api/
│       └── command.post.ts   # API pour envoyer commandes à Winston (FAIT)
│
└── data/                     # 🔥 JSON centralisés
    ├── agents.json           # Tous les agents (code, writing, infra)
    ├── workflows.json        # Workflows writing + code
    └── scripts.json          # Scripts avec params + natural language
```

---

## 🚀 Démarrage Rapide

### 1. Installation

```bash
cd ~/.openclaw/openclaw-ui
npm install
```

### 2. Développement

```bash
npm run dev
```

**→ http://localhost:8080**

### 3. Build Production

```bash
npm run build
npm run preview
```

---

## 📚 JSON Centralisés

### `data/agents.json`

**Structure :**
```json
{
  "code": [ /* Winston, John, Amelia */ ],
  "writing": [ /* Axis, Cosmos, Maya, Silas, Iris, Mnemosyne */ ],
  "infrastructure": [ /* Orchestrator, Coordinator */ ]
}
```

**Chaque agent :**
```json
{
  "id": "winston",
  "name": "Winston",
  "emoji": "🏗️",
  "role": "Architecte Systèmes",
  "workspace": "workspace-code-winston",
  "expertise": ["..."],
  "achievements": ["..."]
}
```

**Usage dans composant :**
```vue
<script setup>
import agentsData from '~/data/agents.json'

const codeAgents = agentsData.code
const writingAgents = agentsData.writing
</script>
```

---

### `data/workflows.json`

**Structure :**
```json
{
  "writing": {
    "id": "writing-project",
    "phases": [
      { "id": "worldbuilding", "agent": "Cosmos", "deliverables": [...] },
      { "id": "characters", "agent": "Maya", ... }
    ]
  },
  "code": { ... }
}
```

---

### `data/scripts.json`

**Structure :**
```json
{
  "scripts": [
    {
      "id": "start-project",
      "name": "workflow-start-project.sh",
      "parameters": [
        { "name": "nom", "type": "string", "required": true },
        { "name": "type", "type": "select", "options": [...] }
      ],
      "naturalLanguage": [
        "Crée un nouveau projet {nom} de type {type}"
      ]
    }
  ]
}
```

**Utilité :**
- Générer formulaires automatiquement depuis params
- Valider inputs
- Parser langage naturel (matching patterns)

---

## 🎨 Design System

### Couleurs

```css
--cyan: #00d9ff
--purple: #a855f7
--pink: #ec4899
--green: #10b981
--orange: #f97316
```

### Gradients

```vue
<!-- Titre principal -->
<h1 class="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
  🏗️ OpenClaw
</h1>

<!-- Bouton -->
<button class="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
  Action
</button>

<!-- Card -->
<div class="bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10">
  Content
</div>
```

### Animations

```vue
<!-- Gradient animé -->
<style scoped>
@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 5s ease infinite;
}
</style>

<!-- Pulse -->
<div class="animate-pulse"></div>

<!-- Hover scale -->
<div class="hover:scale-105 transition-transform duration-300"></div>
```

---

## 🔧 À Faire (TODOs)

### Priorité 1 - Pages Essentielles

- [ ] **Page `/agents`**
  - Liste tous les agents par catégorie (code, writing, infra)
  - Cards cliquables
  - Modal détails agent (expertise, achievements)
  
- [ ] **Page `/agents/[id]`**
  - Détails complet d'un agent
  - Workspace path
  - Expertise liste
  - Achievements
  - Actions rapides (open workspace, voir logs, etc.)

- [ ] **Page `/workflows`**
  - Affichage workflows writing + code
  - Diagramme phases (timeline visuelle)
  - Agents par phase
  - Deliverables checklist

- [ ] **Page `/tests`**
  - Interface tests automatisés
  - Bouton "Lancer Tests"
  - Affichage résultats temps réel
  - Stats X/Y tests passent

---

### Priorité 2 - Gestion Projets

- [ ] **Page `/projects`**
  - Liste projets actifs (fetch depuis `~/.openclaw/projects/active/`)
  - Liste projets archivés
  - Création projet via formulaire (auto-généré depuis `scripts.json`)
  
- [ ] **Page `/projects/[name]`**
  - Détails projet
  - Phase actuelle
  - Métriques (commits, jours, fichiers)
  - Actions (next phase, generate metrics, archive)
  - Fichiers récents (git log)

- [ ] **API `/api/projects/list.get.ts`**
  - Liste projets actifs + archivés
  - Parse STATUS.md, METRICS.md

- [ ] **API `/api/projects/[name]/status.get.ts`**
  - Détails d'un projet
  - Git log
  - Métriques

---

### Priorité 3 - Features Avancées

- [ ] **Dashboard temps réel**
  - Websockets pour live updates
  - Coordinator events
  - Projets en cours
  
- [ ] **Historique commandes**
  - Store commandes récentes
  - Re-exécution rapide
  
- [ ] **Autocomplete langage naturel**
  - Suggestions basées sur `scripts.json` naturalLanguage
  - Matching patterns
  
- [ ] **Graphiques métriques**
  - Chart.js ou similaire
  - Progression projets
  - Commits over time
  
- [ ] **Gestion agents centralisée**
  - CRUD agents dans `agents.json`
  - Créer nouveau agent
  - Modifier expertise/achievements
  - Générer workspace

---

## 🛠️ Composants à Créer

### `components/AgentCard.vue`

```vue
<template>
  <div class="agent-card">
    <div class="emoji">{{ agent.emoji }}</div>
    <h3>{{ agent.name }}</h3>
    <p class="role">{{ agent.role }}</p>
    <UBadge>{{ agent.workspace }}</UBadge>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  agent: {
    id: string
    name: string
    emoji: string
    role: string
    workspace: string
  }
}>()
</script>
```

---

### `components/WorkflowTimeline.vue`

Timeline visuelle des phases d'un workflow :

```vue
<template>
  <div class="timeline">
    <div 
      v-for="(phase, i) in phases" 
      :key="phase.id"
      class="phase-step"
    >
      <div class="connector" v-if="i > 0"></div>
      <div class="phase-bubble">{{ i + 1 }}</div>
      <div class="phase-details">
        <h4>{{ phase.name }}</h4>
        <p class="text-sm text-gray-400">{{ phase.agent }}</p>
      </div>
    </div>
  </div>
</template>
```

---

### `components/ProjectCard.vue`

Card projet avec métriques :

```vue
<template>
  <div class="project-card">
    <div class="header">
      <h3>{{ project.name }}</h3>
      <UBadge :color="phaseColor">{{ project.phase }}</UBadge>
    </div>
    <div class="metrics">
      <span>{{ project.commits }} commits</span>
      <span>{{ project.days }} jours</span>
    </div>
    <div class="actions">
      <UButton size="sm">Voir détails</UButton>
    </div>
  </div>
</template>
```

---

## 🔌 API Routes à Créer

### `server/api/projects/list.get.ts`

```typescript
import { readdir } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async () => {
  const activePath = join(process.env.HOME!, '.openclaw/projects/active')
  const archivePath = join(process.env.HOME!, '.openclaw/projects/archives')
  
  const active = await readdir(activePath)
  const archives = await readdir(archivePath)
  
  return {
    active,
    archives
  }
})
```

---

### `server/api/projects/[name]/status.get.ts`

```typescript
import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  const projectPath = join(process.env.HOME!, '.openclaw/projects/active', name!)
  
  const status = await readFile(join(projectPath, 'STATUS.md'), 'utf-8')
  const metrics = await readFile(join(projectPath, 'METRICS.md'), 'utf-8')
  
  // Parse STATUS.md pour extraire phase actuelle
  const phaseMatch = status.match(/Phase actuelle:\*\* (.+)/)
  const phase = phaseMatch ? phaseMatch[1] : 'N/A'
  
  // Parse METRICS.md pour stats
  // ...
  
  return {
    name,
    phase,
    status,
    metrics,
    // ... parsed data
  }
})
```

---

### `server/api/tests/run.post.ts`

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default defineEventHandler(async () => {
  try {
    const { stdout, stderr } = await execAsync('bash ~/.openclaw/scripts/test-workflow.sh')
    
    return {
      success: true,
      output: stdout
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message
    }
  }
})
```

---

## 📦 Packages Recommandés

```bash
npm install @nuxt/ui @nuxtjs/tailwindcss
npm install chart.js vue-chartjs  # Pour graphiques
npm install vueuse  # Utilities Vue3
npm install date-fns  # Manipulation dates
```

---

## 🎯 Architecture Recommandée

```
openclaw-ui/
├── composables/
│   ├── useAgents.ts        # Gestion agents
│   ├── useProjects.ts      # Gestion projets
│   └── useWorkflows.ts     # Gestion workflows
│
├── types/
│   ├── agent.ts            # Types Agent
│   ├── project.ts          # Types Project
│   └── workflow.ts         # Types Workflow
│
├── utils/
│   ├── parseNaturalLanguage.ts  # Parser commandes NL
│   └── formatters.ts            # Formatage data
│
└── stores/                 # Pinia stores (optionnel)
    └── agents.ts
```

---

## 🚀 Prochaines Étapes

1. **Installer dependencies**
   ```bash
   npm install
   ```

2. **Créer les types TypeScript**
   ```typescript
   // types/agent.ts
   export interface Agent {
     id: string
     name: string
     emoji: string
     role: string
     workspace: string
     expertise: string[]
     achievements: string[]
   }
   ```

3. **Créer composables pour data**
   ```typescript
   // composables/useAgents.ts
   import agentsData from '~/data/agents.json'
   
   export const useAgents = () => {
     const allAgents = computed(() => [
       ...agentsData.code,
       ...agentsData.writing,
       ...agentsData.infrastructure
     ])
     
     const getAgentById = (id: string) => {
       return allAgents.value.find(a => a.id === id)
     }
     
     return {
       allAgents,
       codeAgents: agentsData.code,
       writingAgents: agentsData.writing,
       infrastructureAgents: agentsData.infrastructure,
       getAgentById
     }
   }
   ```

4. **Créer pages `/agents`, `/workflows`, `/tests`, `/projects`**

5. **Implémenter API routes pour projets**

6. **Ajouter features avancées**

---

## 💡 Conseils

- **Utilise @nuxt/ui** pour composants prêts (UButton, UCard, UBadge, etc.)
- **Tailwind** pour styling rapide
- **Keep it funky** : gradients, animations, effets hover
- **JSON first** : Toute data vient des JSON, facile à mettre à jour
- **TypeScript** : Types stricts pour éviter bugs
- **Composables** : Logique réutilisable
- **API routes** : Toute interaction avec filesystem/shell via API

---

## 🐛 Debug

**Si erreur import JSON :**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    json: {
      stringify: false
    }
  }
})
```

**Si port 8080 déjà utilisé :**
```typescript
// nuxt.config.ts
devServer: {
  port: 3000  // Changer port
}
```

---

## 📞 Contact

**Questions ?**  
→ Demande à Winston 🏗️ (moi)  
→ Consulte la doc Nuxt3 : https://nuxt.com/docs

---

**Good luck Amelia ! 🎨**  
**Cette app va être géniale.** ✨

**Winston** 🏗️
