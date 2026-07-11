# Phase 3. First Usable Workflow

Status: closed. Human acceptance was recorded on 2026-07-09.

## Goal

Implement the first end-to-end local project brief/report workflow from `openspec/changes/add-project-brief-report/` as API/report JSON first. Phase 3 proves the data contract, report composition, safe local endpoint, deterministic ranking, safe degradation, and no-action boundaries before any dashboard UI or Markdown rendering is added.

## Inputs To Read

- `AGENTS.md`
- `docs/README.md`
- `docs/00_FILE_STRUCTURE.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_PROJECT_AUDIT.md`
- `docs/AI_STEP_VERIFICATION_CHECKLIST.md`
- `docs/CONTEXT.md`
- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`
- `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`
- `openspec/changes/add-project-brief-report/proposal.md`
- `openspec/changes/add-project-brief-report/design.md`
- `openspec/changes/add-project-brief-report/specs/project-brief-report/spec.md`
- `openspec/changes/add-project-brief-report/tasks.md`
- `openspec/specs/ai-context/spec.md`
- `openspec/specs/ai-findings/spec.md`
- Related implementation files: `src/types.ts`, `server.mjs`, `server/ai-context.mjs`, `server/ai-findings.mjs`, `server/project-config.mjs`, and `tests/ai-context.test.mjs`.

## OpenSpec And Acceptance Mapping

- Affected accepted requirements:
  - `openspec/specs/ai-context/spec.md`
  - `openspec/specs/ai-findings/spec.md`
- Active proposed change:
  - `openspec/changes/add-project-brief-report/`
- Proposed capability:
  - `project-brief-report`
- OpenSpec tasks to implement:
  - `openspec/changes/add-project-brief-report/tasks.md` sections 1 through 4.
- Acceptance scenarios to satisfy:
  - Brief uses saved local inputs and rejects arbitrary project paths, workspace paths, file selectors, globs, project selectors, and unknown parameters.
  - Brief does not require remote services.
  - Brief contains ranked review-order project items with attention reasons, changed categories when known, unresolved finding counts, blockers/gates, and recommended human decisions.
  - Brief separates recommendation from action and keeps action-taken and accepted-decision guards false, including rank 1 and high-priority items.
  - Brief preserves source evidence, finding ids, review-state counts, confidence, and derived labels.
  - Brief degrades safely for missing generated scan data, missing/corrupt previous snapshot, missing/empty findings, zero generated projects, and no attention items.
  - Brief retrieval does not write snapshots, findings stores, report history, scanned project files, tasks/calendar records, commits, shell commands, remote calls, or agent work.

Verification evidence expected before completion:

- `npm test`
- `npm run build`
- `openspec list`
- `openspec list --specs`
- `openspec validate --all --strict`
- `git diff --check`
- Documentation review showing `docs/README.md`, `docs/00_FILE_STRUCTURE.md`, `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, this phase plan, and `openspec/changes/add-project-brief-report/` agree.
- Manual API verification against local server after implementation:
  - `GET /api/project-brief-report`
  - `GET /api/project-brief-report?mode=weekly&since=<valid-iso>`
  - Invalid `since`, invalid `mode`, repeated params, and path-like params return `400`.

## Baseline Before Implementation

- `src/types.ts` has shared scan, AI context, and AI finding contracts, but no project brief/report contract yet.
- `server.mjs` owns Express route orchestration and existing local API endpoints.
- `server/ai-context.mjs` builds compact AI context, compares changes, reads/writes AI context snapshots, and normalizes evidence.
- `server/ai-findings.mjs` generates/persists findings, reads findings state through `readFindingsStore()`, and supports review-state updates. Phase 3 report retrieval must use `readFindingsStore()` and must not call `generateFindings()` inside `GET /api/project-brief-report`.
- `tests/ai-context.test.mjs` contains the closest fixture and local server test style for AI context/findings APIs.
- Phase 2 resolved the JSON contract, module boundary, endpoint, safe parameters, ranking, empty-state, and baseline rules.

## Implementation Evidence

- Work item 3.1 completed: `src/types.ts` now exports shared `ProjectBriefReport` contract types, and `tests/project-brief-report-types.ts` provides a type-level contract sample.
- Work items 3.2 and 3.3 completed: `server/project-brief-report.mjs` implements pure deterministic report composition, ranking, evidence aggregation, safe states, baseline state, derived labels, and advisory recommendation guards.
- Work item 3.4 completed: `server.mjs` exposes `GET /api/project-brief-report`, validates only `mode` and `since`, rejects invalid/repeated/unknown/path-like parameters, reads existing findings state and snapshot state, and does not write report side effects.
- `tests/project-brief-report.test.mjs` covers pure composition, ranking, safe states, missing generated data, module purity, API happy paths, invalid queries, missing scan data, no-attention reports, no snapshot write, no findings write, no report-history file, and unchanged scanned project sentinel files.
- Implementation commits on branch `phase-3/first-usable-workflow`: `16af3e2` (shared types), `d119bf8` (composition module), `e43fa6e` (API endpoint), and `0cd3eb5` (post-review strict API validation for malformed generated scan data and ISO `since` parsing).
- Phase gate verification passed on 2026-07-09: `npm test -- tests/project-brief-report.test.mjs` (7/7), `npm test` (38/38), `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict` (4/4), `git diff --check`, static forbidden-hook search, and local API smoke.

## Change Intake

Record new ideas, fixes, scope changes, architecture notes, data contract changes, or verification requests that appear during the phase.

```text
Idea:
Source:
Type:
Decision:
Reason:
Affected specs:
Affected architecture:
Data contract impact:
Verification impact:
Status:
```

## Work Items

### 3.1 Add Shared Report Types

Status: closed on 2026-07-09.

Objective:

- Add TypeScript report contract types to `src/types.ts` for metadata, input state, baseline, safe states, summary, project items, attention reasons, findings summary, derived labels, recommended human decisions, and work boundaries.
- Keep type names aligned with Phase 2 design and avoid adding UI-only display types.

Expected files/modules:

- `src/types.ts`

Verification:

- `npm run build`
- Type names and enums map to `openspec/changes/add-project-brief-report/design.md`.

Documentation updates:

- None unless the contract changes beyond Phase 2 decisions.

Recommended subagents:

- reviewer: check type names against the OpenSpec contract.
- verification-checker: confirm every enum has a planned test.

Exit criteria:

- Phase 3 implementers can type the report module and API response without inventing semantics.

OpenSpec and acceptance evidence:

- `project-brief-report` scenarios for metadata, evidence, derived labels, recommendations, safe states, and no automatic action.

### 3.2 Implement Pure Report Composition Module

Status: closed on 2026-07-09.

Objective:

- Add `server/project-brief-report.mjs` with `buildProjectBriefReport({ scanOutput, config, findings, changes, previousSnapshotAvailable, mode, since, now })`.
- Implement report metadata, generated-from/input-state/baseline fields, item construction, evidence aggregation, derived labels, findings summaries, recommendation guard fields, summary counts, and domain errors for missing/invalid generated scan data.
- Keep the module pure: no Express, no direct filesystem IO, no scanner/watcher calls, no snapshot writes, no findings generation, no review-state writes, no report-history store, and no scanned-project access.

Expected files/modules:

- `server/project-brief-report.mjs`
- `tests/project-brief-report.test.mjs`

Verification:

- Pure composition tests for a full-attention fixture.
- Missing/invalid scan data domain-error test.
- Evidence and derived-label tests.
- Guard field tests for rank 1 and high-priority items.
- `npm test -- tests/project-brief-report.test.mjs`

Documentation updates:

- None unless implementation needs to adjust a Phase 2 design decision.

Recommended subagents:

- worker: implement the module and focused pure tests.
- reviewer: check coupling and no forbidden dependencies.
- verification-checker: verify fixture coverage and side-effect assumptions.

Exit criteria:

- Report composition works from fixture inputs without starting Express or touching the filesystem.

OpenSpec and acceptance evidence:

- Local derived data, prioritized project items, evidence preservation, derived labels, safe degradation, and no automatic action.

### 3.3 Implement Deterministic Ranking And Empty/Baseline States

Status: closed on 2026-07-09.

Objective:

- Implement inclusion reasons, priority mapping, reason severity defaults, deterministic tie-breakers, no-attention states, missing/empty findings states, missing/corrupt baseline behavior, and current-signal-only behavior.
- Preserve the anti-authority language and guardrails from Phase 2.

Expected files/modules:

- `server/project-brief-report.mjs`
- `tests/project-brief-report.test.mjs`

Verification:

- Fixture with blocker, approval gate, unresolved finding, needs-review, changed next action/status/risk, gap-only, and tie-break projects.
- Tests assert high/medium/low priority, reason kind order, unresolved `reviewState: "new"` only, source-backed signal count tie-breaker, lowercase name/path tie-breakers, and advisory guard fields.
- Tests for zero projects, projects with no inclusion reasons, missing findings store, empty findings, missing/corrupt snapshot, omitted `since`, valid `since` with snapshot, and valid `since` without snapshot.
- `npm test -- tests/project-brief-report.test.mjs`

Documentation updates:

- Update Phase 3 plan only if implementation reveals a test gap or accepted adjustment.

Recommended subagents:

- verification-checker: review ranking fixture completeness.
- reviewer: challenge wording that could look like mandatory action.

Exit criteria:

- Deterministic ranking and safe states are fully covered by pure tests.

OpenSpec and acceptance evidence:

- Prioritized project items, recommendation/action separation, missing baseline, no attention items, and no automatic action.

### 3.4 Add Local API Endpoint

Status: closed on 2026-07-09.

Objective:

- Add `GET /api/project-brief-report` in `server.mjs`.
- Validate query parameters: only `since` and `mode`; invalid/repeated scalar params and unknown/path-like params return `400`.
- Read generated scan data, saved project config, existing findings review state, and previous AI context snapshot.
- Compute changes only for valid `since`.
- Call `buildProjectBriefReport`.
- Return `404` for missing/invalid generated scan data with `missing-generated-scan-data`.
- Do not write AI context snapshot, findings store, report history, scanned project files, tasks/calendar records, commits, shell commands, remote calls, or agent work.

Expected files/modules:

- `server.mjs`
- `tests/project-brief-report.test.mjs`

Verification:

- API test style follows `tests/ai-context.test.mjs`: temp `app-data`, `createApp({ skipStartupScan: true, skipWatcher: true, skipFrontend: true })`, ephemeral local server, `fetch`, and filesystem sentinel checks.
- Tests for default daily report, weekly+valid `since`, invalid `since`, invalid `mode`, repeated params, unknown/path-like params, missing generated scan data, missing baseline, no attention items, no snapshot write, no findings write, no report-history file, and unchanged scanned project sentinel file.
- `npm test -- tests/project-brief-report.test.mjs`

Documentation updates:

- None until work item 3.5, unless implementation changes endpoint behavior.

Recommended subagents:

- worker: implement route and API tests after 3.2/3.3 pass.
- architecture-checker: confirm IO stays in route and composition stays pure.
- verification-checker: confirm negative side-effect tests.

Exit criteria:

- The report is retrievable through the local API and preserves all Phase 2 safety boundaries.

OpenSpec and acceptance evidence:

- Saved local inputs, safe parameters, missing generated data, previous snapshot missing, and no automatic action.

### 3.5 Update User And Project Documentation

Status: closed on 2026-07-09.

Objective:

- Document the implemented report endpoint, response purpose, safety boundaries, usage examples, and verification commands.
- Update repository map for new modules/tests.
- Update audit evidence and roadmap status.

Expected files/modules:

- `README.md`
- `docs/README.md`
- `docs/00_FILE_STRUCTURE.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_PROJECT_AUDIT.md`
- `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`

Verification:

- Documentation agrees with implemented endpoint, files, tests, and OpenSpec artifacts.
- `git diff --check`

Recommended subagents:

- reviewer: check docs are self-contained and do not overstate behavior.
- verification-checker: compare docs against implementation and test output.

Exit criteria:

- Another agent or the human can run and inspect the project brief/report without chat history.

OpenSpec and acceptance evidence:

- Documentation and phase follow-through tasks in `openspec/changes/add-project-brief-report/tasks.md`.

### 3.6 Run Phase Gate And Prepare OpenSpec Follow-Through

Status: closed. Human acceptance was recorded on 2026-07-09.

Objective:

- Run full verification and determine whether `add-project-brief-report` is ready for human acceptance and later OpenSpec archival.
- Update OpenSpec task checklist with completed implementation tasks when evidence exists.
- Prepare PR/status handoff for merging Phase 3 work.

Expected files/modules:

- `openspec/changes/add-project-brief-report/tasks.md`
- `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_PROJECT_AUDIT.md`

Verification:

- `npm test`
- `npm test -- tests/project-brief-report.test.mjs`
- `npm run build`
- `openspec list`
- `openspec list --specs`
- `openspec validate --all --strict`
- `git diff --check`
- Static safety search:
  - `rg -n "child_process|exec\\(|spawn\\(|writeAiContextSnapshot|generateFindings|updateFindingReviewState|calendar|trello|report-history" server.mjs server tests`
  - Confirm any hits are outside `GET /api/project-brief-report` or are expected existing routes/tests.
- Manual local API smoke check when the route exists.

Recommended subagents:

- verification-checker: run or review final evidence.
- reviewer: final code-review stance for regressions and missing tests.

Exit criteria:

- Phase 3 implementation is ready for human review.
- `add-project-brief-report` is either ready to archive after human acceptance or explicitly paused with remaining tasks.

OpenSpec and acceptance evidence:

- All `project-brief-report` scenarios and OpenSpec tasks have implementation or a documented deferral.

## Phase Gate

- Completed: Shared report types exist and match Phase 2 contract decisions.
- Completed: Pure report composition module exists and has focused tests.
- Completed: Deterministic ranking, empty-state, baseline, evidence, derived-label, recommendation, and guard-field behavior is tested.
- Completed: `GET /api/project-brief-report` exists and accepts only safe parameters.
- Completed: API tests prove missing data, invalid parameters, no arbitrary paths, no snapshot write, no findings write, no report-history store, and no scanned-project edits.
- Completed: README/docs/audit/file-structure documents the implemented behavior.
- Completed during phase gate: `npm test`, `npm run build`, `openspec validate --all --strict`, and `git diff --check` pass.
- No cloud, auth, API keys, remote model calls, task/calendar integrations, shell commands, commits, scanned-project writes, report-history store, dashboard UI, or Markdown rendering is added without a new approved design decision.

## Human Decisions

- Decision: Phase 3 implements API/report JSON first.
- Decision: Dashboard UI, Markdown rendering, scheduling, notifications, task/calendar integrations, external issue trackers, remote model providers, and findings-review UI remain out of scope.
- Decision: Human owner accepted the Phase 3 implementation gate on 2026-07-09. `add-project-brief-report` is ready for OpenSpec archival after branch review/merge.
- Decision required for the next phase: choose whether the next product slice is dashboard UI, Markdown/rendered brief, or an agent preflight packet follow-up.
