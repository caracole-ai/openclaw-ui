# OpenClaw UI — Project Instructions

## Project Overview

OpenClaw UI is an internal dashboard for monitoring and managing a multi-agent AI system. Built with **Nuxt 3 + Vue 3**, it uses **TailwindCSS** for styling, **better-sqlite3** for server-side persistence, **Chart.js** (via vue-chartjs) for data visualization, and **Vitest + Playwright** for testing. SSR is disabled (`ssr: false`) — this is a client-side SPA served by Nitro.

### Quick Reference

- `npm run dev` — start dev server on port 8080
- `npm run test:unit` — run unit + integration tests (Vitest)
- `npm run test:e2e` — run E2E tests (Playwright, Chromium/Firefox/WebKit + mobile)
- `npm run test:coverage` — run tests with V8 coverage (components + composables)
- `npm run build` — production build

## Coding Principles

These are non-negotiable reflexes. Apply them systematically, without being asked.

### 1. Coherence first — follow existing Nuxt/Vue patterns

Before writing new code, study how the codebase already solves similar problems. This project has clear conventions:

- **Components** (`components/`): PascalCase `.vue` files, auto-imported by Nuxt. Use `<script setup lang="ts">` exclusively. Props via `defineProps<{}>()`, emits via `defineEmits<{}>()`. No Options API.
- **Pages** (`pages/`): File-based routing. Dynamic params use `[id].vue`. Each page is self-contained with its own data fetching logic.
- **Composables** (`composables/`): `useXxx.ts` naming. Singleton pattern with module-level `ref()` for shared state (see `useAgents.ts`, `useProjects.ts`). Export a single `useXxx()` function that returns reactive state + methods. Auto-imported by Nuxt.
- **Server API** (`server/api/`): Nitro file-based routing with method suffix (`index.get.ts`, `index.post.ts`, `[id].patch.ts`). Use `defineEventHandler`, `getQuery`, `getRouterParam`, `readBody`, `createError` from Nitro. Import DB utilities from `~/server/utils/`.
- **Server utils** (`server/utils/`): Auto-imported in server context. `db.ts` manages SQLite, `serializers.ts` transforms DB rows to API responses, `mattermost.ts` handles external API calls.
- **Types** (`types/`): Client-side types. `server/types/` for DB row types (prefixed `Db*`). Client types use camelCase, DB types mirror snake_case columns.
- **Utils** (`utils/`): Shared formatting functions, auto-imported by Nuxt on both client and server. `format.ts` is the single source for all display formatting (`formatTokens`, `formatCost`, `formatDate`, `formatModel`, etc.).

Match these patterns. Never invent a new pattern when one already exists.

### 2. No hardcoded values — use the source of truth

- **Runtime config**: All environment-dependent values go in `nuxt.config.ts` → `runtimeConfig`. Access via `useRuntimeConfig()` in server code (private keys) or `useRuntimeConfig().public` in client code.
- **Environment variables**: Defined in `.env`, documented in `.env.example`. Key vars: `VAULT_PATH`, `PROJECTS_DIR`, `GITHUB_OWNER`, `MATTERMOST_URL`, `MATTERMOST_TOKEN`, `MATTERMOST_TEAM_ID`.
- **Constants**: Polling intervals, default context windows, and similar values are defined as module-level `const` in the relevant file (e.g., `POLL_INTERVAL = 10_000` in composables). If a constant is needed in multiple places, extract it.
- **DB schema**: The single source of truth for the data model is `server/utils/db.ts` (the `SCHEMA` constant). DB row types in `server/types/db.ts` must mirror it exactly.
- **Status/state enums**: Defined as TypeScript union types in `types/` (e.g., `AgentStatus`, `ProjectState`, `DocumentStatus`). Always import from there.

### 3. Verify types at the source

Before using a type or interface, read its actual definition in `types/` or `server/types/`. Key type files:
- `types/agent.ts` — `Agent`, `AgentDetail`, `AgentStatus`, `AgentTeam`, `AgentRole`
- `types/project.ts` — `ProjectState`, `ProjectType`, `DocumentStatus`
- `types/skill.ts` — `Skill`, `SkillManifest`
- `types/token.ts` — `TokenEvent`, `TokenSummary`, `TimelinePoint`
- `types/websocket.ts` — `WSEventType`, `WSEvent`
- `server/types/db.ts` — `DbAgent`, `DbProject`, `DbProjectAgent`, etc.

Nuxt auto-generates types in `.nuxt/`. Run `nuxt prepare` (or `npm run postinstall`) to regenerate them after structural changes.

### 4. Edit over create

Prefer modifying an existing file over creating a new one. New files are justified only when they represent a genuinely new responsibility (new page, new composable for a new domain, new API endpoint). This prevents file sprawl and keeps related logic together.

### 5. SOLID — especially Single Responsibility

Each file has a clear role. Examples of the existing separation:
- `server/utils/serializers.ts` — all response shaping (DB row to JSON API format)
- `server/utils/db.ts` — all database access, schema, migrations, seeding
- `utils/format.ts` — all display formatting functions
- Each composable owns one domain (agents, projects, tokens, skills, toast, websocket)

When a function starts doing two things, split it. When a module accumulates unrelated concerns, extract.

### 6. Think smart, build to last

The goal is functional, stable, robust, maintainable. Write code that is simple enough to understand at a glance, but structured well enough to evolve. This is an internal tool — pragmatism over perfection, but never at the cost of maintainability.

## Nuxt Conventions

### Auto-imports

Nuxt auto-imports Vue APIs (`ref`, `computed`, `watch`, `onMounted`...), composables from `composables/`, utilities from `utils/`, and components from `components/`. Do NOT add explicit imports for these — they are available globally. The test setup (`tests/setup.ts`) manually provides these as globals for Vitest.

### Server-side patterns

- Server API routes use Nitro's `defineEventHandler` — auto-imported, no explicit import needed.
- Use `getQuery(event)` for query params, `getRouterParam(event, 'id')` for URL params, `readBody(event)` for POST/PATCH bodies.
- Errors: `throw createError({ statusCode: 404, statusMessage: '...' })`.
- Database: always go through `getDb()` from `server/utils/db.ts`. The DB is SQLite (better-sqlite3), synchronous — no `await` needed for queries.
- Response serialization: use `serializeProject()` / `serializeAgent()` from `server/utils/serializers.ts` to ensure consistent API shape.

### WebSocket

Real-time updates use a custom WebSocket layer (`composables/useWebSocket.ts` + `server/api/ws.ts` + `server/plugins/source-watcher.ts`). The source watcher monitors JSON files via chokidar and broadcasts `data:updated` events. Composables listen for these events to trigger re-fetches.

### Styling

- TailwindCSS via `@nuxtjs/tailwindcss` module (no custom tailwind config file — uses module defaults).
- Custom CSS in `assets/css/animations.css` and `app.vue` `<style>` block.
- Inter font loaded from Google Fonts.
- Consistent patterns: cards use `bg-white rounded-lg shadow-sm border p-4`, status colors follow a green/yellow/red/gray scheme.

## Testing

### Unit tests (`tests/unit/`)

- Framework: Vitest + `@vue/test-utils` + happy-dom
- Setup file: `tests/setup.ts` — mocks `#app`, `#imports`, provides auto-imported utils as globals, stubs `NuxtLink` and `ClientOnly`
- Pattern: `describe` blocks in French, test names describe expected behavior
- Component tests: `mount()` with `global.stubs` for child Nuxt components
- Run: `npm run test:unit`

### Integration tests (`tests/integration/`)

- Same Vitest setup, but test server-side logic (API calculations, data transformations)
- Extract logic from API handlers into testable functions when needed
- Run together with unit tests: `npm run test:unit`

### E2E tests (`tests/e2e/`)

- Framework: Playwright
- Config: `playwright.config.ts` — tests against `http://localhost:3333`, runs dev server automatically
- Browsers: Chromium, Firefox, WebKit + Mobile Chrome + Mobile Safari
- Run: `npm run test:e2e`

## Documentation & Memory

After every task that changes behavior, architecture, dependencies, or configuration, update the documentation **in the same commit**. This is not optional — undocumented changes are unfinished changes.

### 10. Keep docs in sync with code

When a task changes behavior, configuration, architecture, or tooling, identify which existing documentation describes that area and update it. If no doc exists and the change is significant enough to need one, create it. Documentation lives in `CLAUDE.md` and Claude memory — check both.

### 11. Update memory proactively

After completing a task, update Claude memory with any new facts that would help in future conversations: stack changes, new tools, config decisions, known limitations. Remove or correct stale information.

### 12. Clean the obsolete

When updating documentation, don't just append — read what's already there and remove or correct anything that no longer reflects the project's state. The goal is a single source of truth, not a changelog.

## Debugging & DevTools

### 14. Chrome DevTools for the frontend

This is a web application. When investigating UI issues:
- Use the browser Console for runtime errors and `console.log` output
- Use the Network tab to inspect API calls (`/api/*` routes)
- Use Vue DevTools browser extension for component state inspection
- WebSocket messages are visible in the Network tab (WS frames)
- Nuxt DevTools are disabled in config (EBADF bug workaround)

## Autonomous Decision-Making

These principles govern how Claude evaluates incoming tasks and decides when to self-organize.

### 7. Evaluate complexity before acting

For every request, assess its scope and complexity before writing code. Consider: how many files are impacted? How many subsystems are involved? Is there ambiguity in the requirements? Are there dependencies between subtasks?

- **Simple** (1-3 files, single concern, clear path): execute directly.
- **Medium** (4-10 files, 2-3 concerns, some ambiguity): enter plan mode, draft a brief plan, then execute.
- **Complex** (10+ files, cross-cutting concerns, multiple subsystems, parallelizable work): enter plan mode, design a structured plan with phases, then recruit a feature team of agents with precise briefs.

### 8. Trigger planning autonomously

Do not wait for the user to ask for a plan. When complexity is medium or above, **enter plan mode on your own**: outline the approach, identify the files and concerns involved, flag risks, and present the plan before executing. The user should see what you intend to do and have the chance to adjust — but the initiative to plan is yours.

### 9. Recruit agents strategically

When a task is parallelizable (independent subtasks across different files or subsystems), recruit specialized agents. Each agent must receive:
- A **clear mission scope** (which files, which changes)
- **Full context** (imports, patterns, conventions, constraints)
- **Explicit rules** (what to do, what NOT to do)
- **Autonomy to read** the code they need before editing

Distribute work to maximize parallelism. Never give an agent a vague brief — a well-briefed agent is a force multiplier, a poorly-briefed one creates rework.
