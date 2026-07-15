# Roadmap

This roadmap is the working development plan for Projects Viewer. It is phase-level; detailed implementation plans belong in `docs/phases/`.

## Current Roadmap Validation

- Current phase: no active roadmap implementation phase. Phase 3 is accepted and closed; Phase 4 remains draft and is not planned in detail. Its first MCP/API hardening slice is implemented, accepted into main specs, and archived at `openspec/changes/archive/2026-07-12-harden-mcp-context-api/`. Roadmap specification cards were accepted on 2026-07-15, synced into `openspec/specs/roadmap-spec-cards/`, and archived at `openspec/changes/archive/2026-07-15-add-roadmap-spec-cards/`. The follow-on `improve-dashboard-evidence-trust` scanner/search slice has completed all 13/13 implementation tasks and its strict OpenSpec CLI gate. The owner authorized integration of the complete dashboard branch on 2026-07-13, accepting the 43/43 timeline and finished Specs Canvas; their active changes remain unsynced/unarchived pending separate lifecycle actions. These bounded workstreams do not by themselves activate or close Phase 4.
- Planning from this roadmap alone is forbidden. Detailed phase plans must reconcile roadmap intent, current docs, current implementation, environment evidence, audit findings, and human decisions.
- Product behavior, requirements, proposed changes, and acceptance criteria belong in OpenSpec artifacts under `openspec/` when SDD applies.
- New ideas during active phase work must go through change intake before they alter scope or plans.
- Update this file when phase status, gates, or scope changes.

## Phase 0. Project Foundation

Status: closed.
Human acceptance was recorded on 2026-07-08.

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

Status: closed.
Human acceptance was recorded on 2026-07-09.

Goal: identify users, workflows, data sources, constraints, and first acceptance criteria.

Detailed plan: `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`.

Selected first workflow: local daily/weekly project brief as API/report JSON first, dashboard UI later. Proposed OpenSpec change: `openspec/changes/add-project-brief-report/`.

Evidence:

- Phase 1 plan records primary users, data/trust boundaries, AI workflow/review policy, OpenSpec conversion, and first workflow selection.
- Human owner approved moving into Phase 2 on 2026-07-09.

## Phase 2. Architecture And Data Model

Status: closed.
Human acceptance was recorded on 2026-07-09.

Goal: define the first stable architecture, data contract, report composition module boundary, local API surface, ranking rules, storage boundaries, and integration contracts for the selected project brief/report workflow.

Detailed plan: `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`.

Evidence:

- Phase 2 resolved the project brief/report JSON contract, pure composition module boundary, local API surface, safe parameters, deterministic ranking, empty-state behavior, baseline/snapshot rules, and Phase 3 implementation plan.
- Phase 3 plan created: `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`.
- Human owner approved starting Phase 3 on 2026-07-09.

## Phase 3. First Usable Workflow

Status: closed.
Human acceptance was recorded on 2026-07-09.

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

Status: draft.

Planning state: detailed planning has not started.

Goal: improve reliability, safety, UX, operations, and acceptance evidence.

Completed first slice:

- `openspec/changes/archive/2026-07-12-harden-mcp-context-api/` records canonical config cleanup, compact saved project-id listing, JSON-only API boundaries, MCP response validation, agent preflight packet retrieval hardening, and local HTTP diagnostics.
- Accepted requirements now live in `openspec/specs/agent-preflight-packet/`, `openspec/specs/local-project-config/`, and `openspec/specs/mcp-context-api/`.
- The slice removes the observed HTML fallback, legacy config ambiguity, and project-id lookup friction before Projects Viewer MCP preflight packets are used for everyday agent startup.

Implemented follow-on and parallel bounded workstreams:

- `openspec/changes/archive/2026-07-15-add-roadmap-spec-cards/` records the accepted exact phase/step ownership contract, nested Roadmap specification cards, explicit unassigned/integrity handling, and navigation to the matching Specs Canvas identity. The accepted behavior lives in `openspec/specs/roadmap-spec-cards/`.
- [`improve-dashboard-evidence-trust`](../openspec/changes/improve-dashboard-evidence-trust/) restores scanner and search evidence trust after the completed MCP/API hardening slice. Implementation, focused/full gates, real configured-project rescan, corrected desktop/mobile browser acceptance, documentation/task-state reconciliation, and the strict OpenSpec CLI gate are complete at 13/13 tasks. The change remains active/open, unsynced, and unarchived, ready for a separate explicit sync/archive workflow. [`API_UX_TRUST_AUDIT_2026-07-12.md`](audits/API_UX_TRUST_AUDIT_2026-07-12.md) is the canonical evidence source.
- `docs/audits/UX_UI_AUDIT_2026-07-10.md` is the redesign baseline; `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md` records implementation and browser evidence.
- `docs/planning/DASHBOARD_REDESIGN_PLAN.md` records the bounded sequence: trusted state derivation, Project Timeline, overview integration, search/navigation state, then responsive/accessibility acceptance.
- `openspec/changes/redesign-dashboard-project-timeline/` is `accepted` with 43/43 tasks complete. Commit `9cfb550` fixed the mixed-height axis and fresh dark/light desktop, tablet, and mobile checks measured 0 px axis deviation with no clipping or page overflow. The owner explicitly authorized integration on 2026-07-13, closing task 7.6.
- `openspec/changes/improve-dashboard-search-navigation/` records ranked diagnostic-aware search and safe versioned local/history presentation state. It preserves configured-path, read-only, and local-only boundaries.

Decision required before Phase 4 planning:

- Perform OpenSpec sync/archive for the accepted dashboard changes only when separately authorized; integration acceptance does not silently archive active changes.
- Decide the detailed Phase 4 scope independently of the timeline and other bounded workstreams. Completing or archiving an individual OpenSpec change does not silently activate Phase 4.

## Phase Planning Rule

When a phase is too large for one iteration, create or update a detailed plan under `docs/phases/` before implementation starts. Follow `docs/phases/PHASE_PLAN_TEMPLATE.md`.

## Capability Spec Ownership

| Capability spec | Roadmap phase | Related phases |
|---|---|---|
| `agent-preflight-packet` | P4 | P3 |
| `ai-context` | P1 | none |
| `ai-findings` | P1 | none |
| `local-project-config` | P0 | P4 |
| `mcp-context-api` | P4 | P0 |
| `roadmap-spec-cards` | P4 | none |

## Active Change Execution

| Active change | Execution phase | Related phases | Lifecycle status |
|---|---|---|---|
| `add-persistent-project-management` | P0 | none | accepted |
| `add-project-brief-report` | P3 | P1,P2 | accepted |
| `add-selectable-specs-canvas` | P4 | none | accepted |
| `agent-preflight-packet` | P4 | P3 | pending_acceptance |
| `fix-lifecycle-status-progress-semantics` | P4 | none | accepted |
| `harden-dashboard-state-derivation` | P4 | none | accepted |
| `improve-dashboard-evidence-trust` | P4 | none | accepted |
| `improve-dashboard-search-navigation` | P4 | none | accepted |
| `redesign-dashboard-project-timeline` | P4 | none | accepted |

## Capability Spec Step Ownership

| Capability spec | Roadmap phase | Roadmap step |
|---|---|---|
| `agent-preflight-packet` | P4 | none |
| `ai-context` | P1 | none |
| `ai-findings` | P1 | none |
| `local-project-config` | P0 | none |
| `mcp-context-api` | P4 | none |
| `roadmap-spec-cards` | P4 | none |

## Active Change Step Execution

| Active change | Execution phase | Execution step |
|---|---|---|
| `add-persistent-project-management` | P0 | none |
| `add-project-brief-report` | P3 | none |
| `add-selectable-specs-canvas` | P4 | none |
| `agent-preflight-packet` | P4 | none |
| `fix-lifecycle-status-progress-semantics` | P4 | none |
| `harden-dashboard-state-derivation` | P4 | none |
| `improve-dashboard-evidence-trust` | P4 | none |
| `improve-dashboard-search-navigation` | P4 | none |
| `redesign-dashboard-project-timeline` | P4 | none |
