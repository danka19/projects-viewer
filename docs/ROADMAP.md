# Roadmap

This roadmap is the working development plan for Projects Viewer. It is phase-level; detailed implementation plans belong in `docs/phases/`.

## Current Roadmap Validation

- Current phase: no active implementation phase. Phase 3 is accepted and closed; Phase 4 is not planned in detail yet. Proposed first hardening slice: `openspec/changes/harden-mcp-context-api/`.
- Planning from this roadmap alone is forbidden. Detailed phase plans must reconcile roadmap intent, current docs, current implementation, environment evidence, audit findings, and human decisions.
- Product behavior, requirements, proposed changes, and acceptance criteria belong in OpenSpec artifacts under `openspec/` when SDD applies.
- New ideas during active phase work must go through change intake before they alter scope or plans.
- Update this file when phase status, gates, or scope changes.

## Phase 0. Project Foundation

Status: accepted and closed on 2026-07-08.

Goal: prepare repository rules, documentation, environment notes, baseline product decisions, and verification habits.

Quality gate:

- `AGENTS.md`, docs map, roadmap, audit, verification checklist, and phase template exist.
- Secrets and private-data rules are clear.
- OpenSpec expectations and phase change-intake routing are documented.
- Another agent can continue without chat history.

Evidence:

- `AGENTS.md`, `CLAUDE.md`, documentation map, roadmap, current audit, context, verification checklist, and phase template exist.
- README records setup, commands, live/static mode, manual rescan, watcher behavior, interval rescan, and watcher disablement.
- Current audit records git, runtime, tests, build, live server, production server, watcher, project-management, and AI context evidence.
- Human owner accepted the foundation and approved starting Phase 1 on 2026-07-08.

## Phase 1. Discovery And Requirements

Status: accepted and closed on 2026-07-09.

Goal: identify users, workflows, data sources, constraints, and first acceptance criteria.

Detailed plan: `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`.

Selected first workflow: local daily/weekly project brief as API/report JSON first, dashboard UI later. Proposed OpenSpec change: `openspec/changes/add-project-brief-report/`.

Evidence:

- Phase 1 plan records primary users, data/trust boundaries, AI workflow/review policy, OpenSpec conversion, and first workflow selection.
- Human owner approved moving into Phase 2 on 2026-07-09.

## Phase 2. Architecture And Data Model

Status: accepted and closed on 2026-07-09.

Goal: define the first stable architecture, data contract, report composition module boundary, local API surface, ranking rules, storage boundaries, and integration contracts for the selected project brief/report workflow.

Detailed plan: `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`.

Evidence:

- Phase 2 resolved the project brief/report JSON contract, pure composition module boundary, local API surface, safe parameters, deterministic ranking, empty-state behavior, baseline/snapshot rules, and Phase 3 implementation plan.
- Phase 3 plan created: `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`.
- Human owner approved starting Phase 3 on 2026-07-09.

## Phase 3. First Usable Workflow

Status: accepted and closed on 2026-07-09.

Goal: implement the first end-to-end local project brief/report workflow from `openspec/changes/add-project-brief-report/`, starting with verified API/report output before dashboard UI.

Detailed plan: `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`.

Evidence:

- Shared project brief/report types exist in `src/types.ts`.
- Pure report composition exists in `server/project-brief-report.mjs`.
- Local endpoint `GET /api/project-brief-report` exists in `server.mjs`, accepts only `mode` and `since`, and returns advisory JSON.
- `tests/project-brief-report.test.mjs` covers ranking, evidence, derived labels, safe states, invalid parameters, missing scan data, no arbitrary paths, no snapshot/finding/report-history writes, and unchanged scanned project sentinel files.
- Verification passed during implementation: `npm test`, `npm run build`, `openspec validate --all --strict`, and `git diff --check`.

Decision required:

- `add-project-brief-report` is ready for OpenSpec archival after the phase branch is reviewed/merged. The separate `agent-preflight-packet` follow-up has been implemented as a proposed OpenSpec change and is ready for human acceptance review after final verification; a future product slice should decide whether to add dashboard UI or Markdown/rendered brief output.

## Phase 4. Hardening And Pilot Readiness

Status: not planned in detail yet.

Goal: improve reliability, safety, UX, operations, and acceptance evidence.

Proposed first slice:

- `openspec/changes/harden-mcp-context-api/` defines canonical config cleanup, compact saved project-id listing, JSON-only API boundaries, MCP response validation, agent preflight packet retrieval hardening, and local HTTP diagnostics.
- This slice should be implemented before relying on Projects Viewer MCP preflight packets for everyday agent startup, because it addresses the observed HTML fallback, legacy config ambiguity, and project-id lookup friction.

## Phase Planning Rule

When a phase is too large for one iteration, create or update a detailed plan under `docs/phases/` before implementation starts. Follow `docs/phases/PHASE_PLAN_TEMPLATE.md`.
