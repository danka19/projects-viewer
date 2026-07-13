# 00. File Structure

This document is the repository map for agents and humans. Keep it current whenever files or folders are added, removed, or repurposed.

## Root

| Path | Purpose |
|---|---|
| `AGENTS.md` | Canonical operating guide for Codex and future agents |
| `CLAUDE.md` | Thin Claude entry point: read `AGENTS.md`, then the active handoff if listed |
| `.env.example` | Versioned environment template with placeholders only |
| `.gitignore` | Excludes secrets, local config, generated artifacts, and private data |
| `README.md` | User-facing app overview, setup, commands, live/static mode, and troubleshooting |
| `package.json` / `package-lock.json` | Node scripts and dependency lockfile |
| `app-data/` | Ignored local runtime data folder for canonical config and generated live scan data |
| `projects.config.example.json` | Versioned empty schema reference for manual edits to `app-data/projects.config.json` |
| `scan-projects.mjs` | Read-only scanner CLI and exported `runScan()` API |
| `server.mjs` | Local Express dashboard server, JSON-first `/api/*` endpoints/errors, Vite middleware, built frontend serving, and watcher setup |
| `vite.config.ts` / `tsconfig.json` | Frontend build and TypeScript configuration |
| `docs/` | Product, architecture, operations, roadmap, audit, glossary, and phase documentation |
| `server/` | Server-side helper modules |
| `src/` | React frontend, components, generated data fallback, and TypeScript types |
| `tests/` | Node scanner/server/model tests plus Vitest component, interaction, accessibility, search, and theme tests |

## Application Code

| Path | Purpose |
|---|---|
| `src/App.tsx` | App shell, live/static loading, attention brief, responsive ordering, versioned presentation state, and drawer integration |
| `src/data/projects.json` | Static fallback data for browser-only mode |
| `src/types.ts` | Scanner output, AI context/findings, project brief/report, drawer descriptor, and UI data contracts |
| `src/search.ts` | Pure cross-project search indexing, ranking, deduplication, diagnostic opt-in, totals, and stable hit identity |
| `src/uiState.ts` | Versioned validated local/history UI-state restoration, per-project primary view/canvas state, and safe timeline/drawer descriptor contracts |
| `src/timeline/` | Trusted timeline presentation model/state, phase/step cards, horizontal axes, lifecycle visuals, legend, and fallback states |
| `src/specs/` | Pure specification model, stable layered layout, obstacle-aware connector routing, responsive Canvas Focus cards, controls, and accessibility behavior |
| `src/components/` | Dashboard panels, tabs, status badges, drawer, skeletons, and project views |
| `src/components/GlobalSearch.tsx` | Accessible controlled search combobox/listbox with keyboard navigation and diagnostic disclosure |
| `src/components/ManageProjects.tsx` | Live-mode tracked project/workspace management UI |
| `server/scan-controller.mjs` | Single-flight scan controller with queue, delay, status, trigger, and throttle logic |
| `server/project-config.mjs` | Canonical `app-data/projects.config.json` path helpers, validation, project/workspace CRUD, enabled-project filtering, and compact saved-project identity mapping |
| `server/spec-work.mjs` | Narrow explicit work-frontmatter parser and evidence-backed specification/task/dependency extraction without filesystem writes |
| `server/project-discovery.mjs` | Safe workspace candidate discovery with marker reasons, depth caps, and excluded folders |
| `server/ai-context.mjs` | Compact AI context mapping, source-evidence normalization, and changes-since category comparison |
| `server/ai-findings.mjs` | Deterministic review-required findings generation and local review-state persistence |
| `server/agent-preflight-packet.mjs` | Pure agent preflight packet composition, required reading, acceptance mapping, attention signals, verification plan, safe states, and work-boundary guards |
| `server/project-brief-report.mjs` | Pure advisory project brief/report composition, ranking, safe states, evidence aggregation, and recommendation guards |
| `server/projects-viewer-mcp.mjs` | Read-only MCP adapter for local API context tools, configured-project lookup, response content/type validation, and explicit API error reporting |
| `tests/agent-preflight-packet.test.mjs` | Pure composition and local API tests for agent preflight packet behavior, query validation, contract separation, and read-only side effects |
| `tests/agent-preflight-packet-types.ts` | Type-level contract sample for shared agent preflight packet TypeScript types |
| `tests/project-brief-report.test.mjs` | Pure composition and local API tests for project brief/report behavior and read-only side effects |
| `tests/project-brief-report-types.ts` | Type-level contract sample for shared project brief/report TypeScript types |
| `tests/components/` | Timeline, search, UI state, tab, drawer focus, responsive contract, and dashboard component tests |
| `tests/theme-contrast.test.mjs` | Dark/light semantic-token, composite tint, axis, focus, and interaction contrast checks |
| `tests/spec-work-scan.test.mjs` | OpenSpec/generic specification identity, ownership, lifecycle, dependency, integrity, archive, and non-inference contract tests |
| `tests/components/spec-*.test.tsx` / `specs-canvas.test.tsx` | Pure model, deterministic layout/routing geometry, dense fixture, interaction, responsive, and accessibility checks |

## Local Runtime Data

| Path | Purpose |
|---|---|
| `app-data/projects.config.json` | Only runtime source for local tracked project/workspace config; ignored by git |
| `app-data/projects.generated.json` | Generated live scan output; ignored by git |
| `app-data/ai.context.snapshot.json` | Last compact AI context snapshot used by changes-since comparison; ignored by git |
| `app-data/ai.findings.generated.json` | Generated AI findings plus accepted/dismissed/stale review metadata; ignored by git |

## Documentation

| Path | Purpose |
|---|---|
| `docs/README.md` | Documentation home and product overview |
| `docs/00_FILE_STRUCTURE.md` | Repository and documentation map |
| `docs/ROADMAP.md` | Phase-level roadmap and gates |
| `docs/CURRENT_PROJECT_AUDIT.md` | Current setup/repository audit and known risks |
| `docs/AI_STEP_VERIFICATION_CHECKLIST.md` | Mandatory self-check for AI agents |
| `docs/CONTEXT.md` | Active glossary and domain boundaries |
| `docs/planning/` | Cross-phase planning notes and decision drafts |
| `docs/planning/DASHBOARD_REDESIGN_PLAN.md` | Implemented UX redesign sequence, target information architecture, Project Timeline integration, trust prerequisites, and acceptance matrix |
| `docs/planning/MCP_CONTEXT_API_HARDENING_PLAN.md` | Hardening plan and implementation notes for config source of truth, compact project-id listing, agent preflight API routing, MCP response validation, and HTTP diagnostics |
| `docs/audits/` | Focused audit reports |
| `docs/audits/UX_UI_AUDIT_2026-07-10.md` | Live-browser UX/UI audit of data trust, first-glance status clarity, density, search, responsive layout, accessibility, and test gaps |
| `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md` | Redesign implementation record, verification commands, browser matrix, edge-state evidence, residual risks, and open human gate |
| `docs/audits/LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md` | Source-to-parser-to-API-to-UI audit of lifecycle status and progress semantics for Roadmap and Specs |
| `docs/phases/` | Detailed phase plans and templates |
| `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md` | Closed Phase 1 discovery and requirements plan |
| `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md` | Accepted and closed Phase 2 architecture and data model plan for the project brief/report workflow |
| `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md` | Accepted and closed Phase 3 implementation record for the JSON-first project brief/report API workflow |
| `docs/handoffs/` | Bounded task handoffs to Claude |
| `docs/superpowers/specs/` | Approved design specs produced by the brainstorming workflow |
| `docs/superpowers/plans/` | Implementation plans produced by the writing-plans workflow |
| `openspec/changes/add-persistent-project-management/` | Completed OpenSpec change for persistent project/workspace management |
| `openspec/changes/add-project-brief-report/` | Active proposed OpenSpec change for the local daily/weekly project brief/report workflow |
| `openspec/changes/agent-preflight-packet/` | Implemented proposed OpenSpec change for a separate local AI-agent preflight packet workflow, ready for human acceptance review |
| `openspec/changes/harden-dashboard-state-derivation/` | Implemented dashboard source-trust/current-state filtering change |
| `openspec/changes/redesign-dashboard-project-timeline/` | Accepted horizontal phase/step timeline change; 43/43 tasks complete after explicit owner integration acceptance on 2026-07-13, and intentionally unarchived |
| `openspec/changes/improve-dashboard-search-navigation/` | Implemented ranked search and safe versioned presentation-state persistence change |
| `openspec/changes/archive/2026-07-08-add-ai-context-findings-layer/` | Archived OpenSpec change for AI-readable project context and review-required findings |
| `openspec/changes/archive/2026-07-12-harden-mcp-context-api/` | Archived implementation history for canonical config cleanup, compact project-id listing, API JSON boundary hardening, MCP response validation, and diagnostics |
| `openspec/specs/agent-preflight-packet/spec.md` | Accepted agent preflight retrieval and JSON-boundary requirements |
| `openspec/specs/ai-context/spec.md` | Accepted AI context requirements |
| `openspec/specs/ai-findings/spec.md` | Accepted AI findings requirements |
| `openspec/specs/local-project-config/spec.md` | Accepted canonical local project config requirements |
| `openspec/specs/mcp-context-api/spec.md` | Accepted configured-project listing, API JSON-boundary, MCP validation, and diagnostics requirements |

## Local Runtime

| Command | Purpose |
|---|---|
| `npm run dev` | Start Express plus Vite middleware; performs startup scan and enables watcher |
| `npm run scan` | Run one-time read-only scan into `app-data/projects.generated.json` |
| `npm run build` | Type-check and build static frontend |
| `npm run server` | Serve built frontend with local API |
| `npm test` | Run Node tests, then the Vitest component/accessibility/search suite |

## Skills

Workflow skills are global (`~/.codex/skills`): architecture-planner, phase-planner, phase-step-runner, phase-full-runner, phase-change-intake, openspec-*, handoff-to-claude, session-report, doc-sync-audit. This repository intentionally has no `.codex/skills/` directory.
