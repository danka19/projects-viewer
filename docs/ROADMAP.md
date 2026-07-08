# Roadmap

This roadmap is the working development plan for Projects Viewer. It is phase-level; detailed implementation plans belong in `docs/phases/`.

## Current Roadmap Validation

- Current phase: Phase 2 Architecture And Data Model.
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

Status: in progress; work item 2.1 completed on 2026-07-09.

Goal: define the first stable architecture, data contract, report composition module boundary, local API surface, ranking rules, storage boundaries, and integration contracts for the selected project brief/report workflow.

Detailed plan: `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`.

## Phase 3. First Usable Workflow

Status: not planned in detail yet.

Goal: implement the first end-to-end local project brief/report workflow from `openspec/changes/add-project-brief-report/`, starting with verified API/report output before dashboard UI.

## Phase 4. Hardening And Pilot Readiness

Status: not planned in detail yet.

Goal: improve reliability, safety, UX, operations, and acceptance evidence.

## Phase Planning Rule

When a phase is too large for one iteration, create or update a detailed plan under `docs/phases/` before implementation starts. Follow `docs/phases/PHASE_PLAN_TEMPLATE.md`.
