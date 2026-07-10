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
| `projects.config.json` | Legacy runtime fallback scheduled for removal; future clean setup should use only `app-data/projects.config.json` and, if needed, an empty `.example` config |
| `scan-projects.mjs` | Read-only scanner CLI and exported `runScan()` API |
| `server.mjs` | Local Express dashboard server, API endpoints, Vite middleware, built frontend serving, and watcher setup |
| `vite.config.ts` / `tsconfig.json` | Frontend build and TypeScript configuration |
| `docs/` | Product, architecture, operations, roadmap, audit, glossary, and phase documentation |
| `server/` | Server-side helper modules |
| `src/` | React frontend, components, generated data fallback, and TypeScript types |
| `tests/` | Node test suite for scanner and server behavior |

## Application Code

| Path | Purpose |
|---|---|
| `src/App.tsx` | App shell, live/static data loading, scan controls, search, layout, and drawer state |
| `src/data/projects.json` | Static fallback data for browser-only mode |
| `src/types.ts` | Scanner output, AI context/findings, project brief/report, and UI data contracts |
| `src/components/` | Dashboard panels, tabs, status badges, drawer, skeletons, and project views |
| `src/components/ManageProjects.tsx` | Live-mode tracked project/workspace management UI |
| `server/scan-controller.mjs` | Single-flight scan controller with queue, delay, status, trigger, and throttle logic |
| `server/project-config.mjs` | Canonical config path helpers, legacy migration, validation, project/workspace CRUD, enabled-project filtering |
| `server/project-discovery.mjs` | Safe workspace candidate discovery with marker reasons, depth caps, and excluded folders |
| `server/ai-context.mjs` | Compact AI context mapping, source-evidence normalization, and changes-since category comparison |
| `server/ai-findings.mjs` | Deterministic review-required findings generation and local review-state persistence |
| `server/agent-preflight-packet.mjs` | Pure agent preflight packet composition, required reading, acceptance mapping, attention signals, verification plan, safe states, and work-boundary guards |
| `server/project-brief-report.mjs` | Pure advisory project brief/report composition, ranking, safe states, evidence aggregation, and recommendation guards |
| `tests/agent-preflight-packet.test.mjs` | Pure composition and local API tests for agent preflight packet behavior, query validation, contract separation, and read-only side effects |
| `tests/agent-preflight-packet-types.ts` | Type-level contract sample for shared agent preflight packet TypeScript types |
| `tests/project-brief-report.test.mjs` | Pure composition and local API tests for project brief/report behavior and read-only side effects |
| `tests/project-brief-report-types.ts` | Type-level contract sample for shared project brief/report TypeScript types |

## Local Runtime Data

| Path | Purpose |
|---|---|
| `app-data/projects.config.json` | Canonical local tracked project/workspace config; ignored by git |
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
| `docs/planning/DASHBOARD_REDESIGN_PLAN.md` | Proposed UX redesign sequence, target information architecture, Project Timeline integration, trust prerequisites, and acceptance matrix |
| `docs/planning/MCP_CONTEXT_API_HARDENING_PLAN.md` | Planned cleanup for config source of truth, compact project-id listing, agent preflight API routing, MCP response validation, and HTTP diagnostics |
| `docs/audits/` | Focused audit reports |
| `docs/audits/UX_UI_AUDIT_2026-07-10.md` | Live-browser UX/UI audit of data trust, first-glance status clarity, density, search, responsive layout, accessibility, and test gaps |
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
| `openspec/changes/harden-mcp-context-api/` | Proposed OpenSpec change for canonical config cleanup, compact project-id listing, API JSON boundary hardening, MCP response validation, and diagnostics |
| `openspec/changes/redesign-dashboard-project-timeline/` | Proposed OpenSpec change for the horizontal phase timeline, exclusive expansion, nested step timeline, responsive overflow, accessibility, and acceptance evidence |
| `openspec/changes/archive/2026-07-08-add-ai-context-findings-layer/` | Archived OpenSpec change for AI-readable project context and review-required findings |
| `openspec/specs/ai-context/spec.md` | Accepted AI context requirements |
| `openspec/specs/ai-findings/spec.md` | Accepted AI findings requirements |

## Local Runtime

| Command | Purpose |
|---|---|
| `npm run dev` | Start Express plus Vite middleware; performs startup scan and enables watcher |
| `npm run scan` | Run one-time read-only scan into `app-data/projects.generated.json` |
| `npm run build` | Type-check and build static frontend |
| `npm run server` | Serve built frontend with local API |
| `npm test` | Run Node tests |

## Skills

Workflow skills are global (`~/.codex/skills`): architecture-planner, phase-planner, phase-step-runner, phase-full-runner, phase-change-intake, openspec-*, handoff-to-claude, session-report, doc-sync-audit. This repository intentionally has no `.codex/skills/` directory.
