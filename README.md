# 🎛️ OpenClaw UI — Dashboard Multi-Agents

**Dashboard de pilotage** du système multi-agents OpenClaw.

**Stack :** Vue 3 + Nuxt 3 + TypeScript + Tailwind CSS + SQLite  
**Repo :** `caracole-ai/openclaw-ui`  
**Config :** `caracole-ai/openclaw-config`

---

## 🚀 Quick Start

```bash
# Installer les dépendances
npm install

# Lancer le dev server
npm run dev

# Ouvrir dans le navigateur
# http://localhost:3000
```

---

## 📚 Documentation

**Toute la documentation est dans le dossier `docs/` :**

👉 **[docs/INDEX.md](./docs/INDEX.md)** — Point d'entrée, navigation par thématique

### Guides Rapides

| Tâche | Doc à charger |
|-------|---------------|
| Comprendre l'architecture | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Développer sur l'API | [API.md](./docs/API.md) |
| Développer sur l'UI | [UI.md](./docs/UI.md) |
| Créer/gérer des agents | [AGENTS.md](./docs/AGENTS.md) |
| Scripts, tests, pièges | [DEVELOPMENT.md](./docs/DEVELOPMENT.md) |

---

## ✨ Features Principales

- **SQLite source de vérité** — transactions ACID, plus de race conditions
- **Live data** — session stores gateway mergées en temps réel
- **File watcher** — modifications JSON → resync DB automatique
- **WebSocket** — notifications temps réel (+ polling 10s fallback)
- **Multi-agents** — Cloclo, Winston, Amelia, Claudio (+ extensible)
- **Tests complets** — 117/147 unitaires, 9/9 DB, 9/9 endpoints

---

## 🧪 Tests

```bash
# Tests unitaires/intégration
npm run test:unit

# Tests DB (via API)
curl http://localhost:3000/api/tests/suites | jq

# Tests endpoints (via API)
curl http://localhost:3000/api/tests/endpoints | jq
```

---

## 🤝 Contributing

**Workflow :**
1. Identifier la thématique (API, UI, agents, etc.)
2. Charger la doc correspondante dans `docs/`
3. Faire les modifs
4. Mettre à jour la doc si nécessaire
5. Commit + push sur `main`

**Branches :** Toujours sur `main` (pas de feature branches sauf demande explicite).

---

## 📝 License

Projet interne Caracole AI.

---

**Dernière mise à jour :** 2026-03-02 (Cloclo 🔧)
