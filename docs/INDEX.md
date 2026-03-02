# 📚 OpenClaw UI — Documentation Index

**Projet :** Dashboard multi-agents OpenClaw  
**Stack :** Vue 3 + Nuxt 3 + TypeScript + Tailwind + SQLite  
**Repo :** `caracole-ai/openclaw-ui`  
**Date :** 2026-03-02

---

## 🗺️ Navigation Rapide

### Pour Commencer
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Vision, data layer, SQLite schema, règles fondamentales
- **[AGENTS.md](./AGENTS.md)** — Agents, teams, communication inter-agents, Mattermost

### Développement
- **[API.md](./API.md)** — Endpoints API complets (agents, projets, skills, tokens, tests)
- **[UI.md](./UI.md)** — Pages, composables, types, session timer
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Scripts, pièges documentés, tests, TODO

### Archives
- **[archive/sync-implementation.md](./archive/sync-implementation.md)** — Rapport d'implémentation sync JSON/SQLite (2026-02-25)

---

## 🎯 Guides par Tâche

### Je travaille sur l'API backend
→ Charger : **API.md** + **ARCHITECTURE.md** (section "SQLite Schema")

### Je travaille sur l'UI/frontend
→ Charger : **UI.md** + **API.md** (section "Endpoints utilisés")

### Je crée/modifie un agent
→ Charger : **AGENTS.md** + **DEVELOPMENT.md** (section "Scripts")

### Je debug un problème
→ Charger : **DEVELOPMENT.md** (section "Pièges documentés")

### Je dois comprendre l'architecture globale
→ Charger : **ARCHITECTURE.md** uniquement

---

## 📏 Taille des Fichiers

| Fichier | Taille estimée | Tokens approx. |
|---------|---------------|----------------|
| INDEX.md | 1 KB | ~300 |
| ARCHITECTURE.md | 3 KB | ~900 |
| AGENTS.md | 2 KB | ~600 |
| API.md | 4 KB | ~1200 |
| UI.md | 3 KB | ~900 |
| DEVELOPMENT.md | 2 KB | ~600 |

**Total :** ~15 KB (vs 18 KB avant découpage)  
**Économie de tokens :** ~50% en moyenne (charge seulement ce qui est nécessaire)

---

## 🧠 Principes de Cette Doc

1. **Modularité** — Un fichier = une thématique
2. **Pas de redondance** — Chaque info à un seul endroit
3. **Cross-references** — Les liens entre docs sont explicites
4. **Tokens-efficient** — Charge uniquement ce dont tu as besoin
5. **Toujours à jour** — Supprime l'obsolète, ne garde que le courant

---

## 🔄 Maintenance

Quand tu modifies le code :
1. Identifie la thématique (API ? UI ? Architecture ?)
2. Ouvre le fichier correspondant
3. Mets à jour la section concernée
4. Si nouvelle feature → ajoute une entrée dans INDEX.md

Ne laisse JAMAIS de doc obsolète. Supprime ou archive.

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
