# Roadmap

This roadmap is the working development plan for Projects Viewer. It is phase-level; detailed implementation plans belong in `docs/phases/`.

## Current Roadmap Validation

- Current phase: Phase 0 Project Foundation.
- Planning from this roadmap alone is forbidden. Detailed phase plans must reconcile roadmap intent, current docs, current implementation, environment evidence, audit findings, and human decisions.
- Product behavior, requirements, proposed changes, and acceptance criteria belong in OpenSpec artifacts under `openspec/` when SDD applies.
- New ideas during active phase work must go through change intake before they alter scope or plans.
- Update this file when phase status, gates, or scope changes.

## Phase 0. Project Foundation

Status: completed pending approval.

Goal: prepare repository rules, documentation, environment notes, baseline product decisions, and verification habits.

Quality gate:

- `AGENTS.md`, docs map, roadmap, audit, verification checklist, and phase template exist.
- Secrets and private-data rules are clear.
- OpenSpec expectations and phase change-intake routing are documented.
- Another agent can continue without chat history.

Evidence:

- `AGENTS.md`, `CLAUDE.md`, documentation map, roadmap, current audit, context, verification checklist, and phase template exist.
- README records setup, commands, live/static mode, manual rescan, watcher behavior, interval rescan, and watcher disablement.
- Current audit records git, runtime, tests, build, live server, production server, and watcher evidence.
- Remaining approval: human owner review of this project-foundation documentation.

## Phase 1. Discovery And Requirements

Status: planned next.

Goal: identify users, workflows, data sources, constraints, and first acceptance criteria.

## Phase 2. Architecture And Data Model

Status: not planned in detail yet.

Goal: define the first stable architecture, core entities, storage boundaries, and integration contracts.

## Phase 3. First Usable Workflow

Status: not planned in detail yet.

Goal: implement the first end-to-end workflow that proves project value.

## Phase 4. Hardening And Pilot Readiness

Status: not planned in detail yet.

Goal: improve reliability, safety, UX, operations, and acceptance evidence.

## Phase Planning Rule

When a phase is too large for one iteration, create or update a detailed plan under `docs/phases/` before implementation starts. Follow `docs/phases/PHASE_PLAN_TEMPLATE.md`.
