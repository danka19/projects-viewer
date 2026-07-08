# Phase 2. Architecture And Data Model

Status: accepted and closed on 2026-07-09; Phase 3 implementation plan was executed after human approval to proceed.

## Goal

Define the stable architecture, data contract, module boundaries, local API surface, ranking rules, storage/baseline behavior, and verification strategy for the selected daily/weekly project brief/report workflow before Phase 3 implementation.

## Inputs To Read

- `AGENTS.md`
- `docs/README.md`
- `docs/00_FILE_STRUCTURE.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_PROJECT_AUDIT.md`
- `docs/AI_STEP_VERIFICATION_CHECKLIST.md`
- `docs/CONTEXT.md`
- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`
- `openspec/changes/add-project-brief-report/proposal.md`
- `openspec/changes/add-project-brief-report/design.md`
- `openspec/changes/add-project-brief-report/specs/project-brief-report/spec.md`
- `openspec/changes/add-project-brief-report/tasks.md`
- `openspec/specs/ai-context/spec.md`
- `openspec/specs/ai-findings/spec.md`
- Related implementation files: `server.mjs`, `server/ai-context.mjs`, `server/ai-findings.mjs`, `src/types.ts`, and `tests/ai-context.test.mjs`.

## OpenSpec And Acceptance Mapping

- Affected accepted requirements:
  - `openspec/specs/ai-context/spec.md`
  - `openspec/specs/ai-findings/spec.md`
- Active proposed change:
  - `openspec/changes/add-project-brief-report/`
- Proposed capability:
  - `project-brief-report`
- Acceptance scenarios to preserve:
  - Brief uses saved local inputs and does not accept arbitrary project paths.
  - Brief does not require remote services.
  - Brief contains prioritized project items and recommended human decisions.
  - Brief separates recommendation from action.
  - Brief preserves source evidence and labels derived summaries.
  - Brief degrades safely for missing generated data, missing previous snapshot, and no attention items.
  - Brief does not trigger commands, commits, task/calendar records, scanned-project edits, or agent work.
- Verification evidence expected before Phase 2 completion:
  - `openspec list`
  - `openspec list --specs`
  - `openspec validate --all --strict`
  - `git diff --check`
  - Documentation review showing `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, `docs/00_FILE_STRUCTURE.md`, this phase plan, and `openspec/changes/add-project-brief-report/` agree.

## Current Baseline

- Existing local server APIs already read saved config and generated scan data from `app-data/`.
- `server/ai-context.mjs` builds compact all-project and per-project AI context and compares changes-since categories.
- `server/ai-findings.mjs` generates deterministic review-required findings and persists review state under `app-data/`.
- `server.mjs` currently owns route orchestration for `/api/projects`, `/api/ai-context`, `/api/ai-context/changes`, and `/api/ai-findings`.
- `src/types.ts` contains accepted AI context and finding types, but no project brief/report contract yet.
- `tests/ai-context.test.mjs` already covers local-only AI context/findings behavior and is the closest test home for the first report-contract tests.

## Architecture Decisions To Resolve

| Decision | Recommended default | Reason |
|---|---|---|
| Report contract shape | Structured JSON first, optional Markdown/UI later. | JSON is testable, stable for API consumers, and safe for future UI rendering. |
| Module boundary | Add `server/project-brief-report.mjs`. | Keeps report ranking/composition separate from routes and from AI context helpers. |
| API surface | Add a local read endpoint such as `GET /api/project-brief`. | Matches existing local Express API style and keeps the first surface API/report-first. |
| Query parameters | Allow only safe parameters, likely optional `since`; reject/ignore arbitrary paths. | Preserves saved-config-only scan boundaries. |
| Baseline behavior | Reuse AI context snapshot behavior initially; no report-history store in the first architecture. | Avoids creating a second persistence layer before value is proven. |
| Ranking rules | Deterministic grouping by unresolved findings, blockers, approval gates, changed next actions, and changed status/risk/gaps. | Keeps behavior testable without requiring an LLM. |
| Type location | Extend `src/types.ts` with report types if the frontend/API contract needs shared typing. | Follows existing shared contract pattern. |

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

### 2.1 Define Project Brief Data Contract

Status: completed on 2026-07-09 for architecture/design; implementation types remain a Phase 3/OpenSpec task.

Objective:

- Define the structured JSON contract for project brief reports before implementation.
- Decide report metadata, safe-state warnings, project item fields, attention reasons, finding summaries, evidence references, derived labels, and recommended human decision fields.

Expected files/modules:

- `openspec/changes/add-project-brief-report/design.md`
- `openspec/changes/add-project-brief-report/specs/project-brief-report/spec.md` if scenario detail changes.
- `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`
- Future implementation target: `src/types.ts`

Verification:

- Contract maps to every `project-brief-report` requirement and scenario.
- Contract distinguishes source evidence, derived interpretation, and recommended human decision.
- `openspec validate --all --strict` passes if OpenSpec artifacts change.

Documentation updates:

- Update this phase plan with the chosen contract.
- Update OpenSpec design/spec only if the proposed behavior changes or needs sharper acceptance scenarios.

Recommended subagents:

- architecture-checker: verify contract boundaries and source-of-truth separation.
- verification-checker: verify every contract field has a testable scenario or documented rationale.

Exit criteria:

- Phase 3 can implement report types without inventing new semantics during coding.

OpenSpec and acceptance evidence:

- `project-brief-report` requirements for local derived data, human review items, evidence labels, safe degradation, and no automatic action.

Accepted contract:

| Contract area | Decision |
|---|---|
| Top-level report | `kind`, `schemaVersion`, `generatedAt`, `mode`, `since`, `generatedFrom`, `inputState`, `baseline`, `safeStates`, `summary`, `items`, `noAttentionMessage`, and `workBoundaries`. |
| Local input metadata | `generatedFrom` identifies saved config, generated scan data, AI context changes, AI findings state, and `remoteServicesUsed: false`. |
| Input state | `inputState` records generated scan availability, tracked project count, previous baseline availability, findings availability, and changes availability. |
| Baseline state | `baseline` records requested `since`, whether the previous AI context snapshot was available, whether comparison was available, and a message for first-run/missing-baseline/current-signals-only behavior. |
| Safe states | Stable codes: `missing-generated-scan-data`, `missing-previous-baseline`, `missing-findings-store`, `empty-findings`, and `no-attention-items`; each has severity, message, and `blocksReport`. |
| Summary | Stable counts: project count, item count, high-priority count, unresolved finding count, blocker count, approval gate count, changed project count, and safe-state count. |
| Project item identity | Each item includes `{ id, name, path }`, deterministic `priority`, 1-based `rank`, `attentionReasons`, `changedCategories`, `findingsSummary`, `blockers`, `currentState`, `evidence`, `derivedLabels`, and `recommendedHumanDecision`. |
| Attention reasons | Stable kinds include unresolved finding, blocker, approval gate, needs review, changed next action, changed status, changed risk, documentation gap, and first-run current signal. |
| Findings summary | Counts by review state plus unresolved finding ids and compact unresolved finding summaries with evidence. |
| Evidence and derived labels | Reuse `AiEvidenceItem` semantics: `source` evidence for file/line-backed facts and `derived-summary` for summaries, health/status interpretation, and recommendations without direct source lines. `derivedLabels` use `{ field, reason, evidenceKind }`. |
| Recommended human decision | Stable decision kind, prompt, rationale, `actionTaken: false`, and `acceptedDecision: false`. |
| Safety boundaries | Machine-readable `workBoundaries` keeps local-only, generated-scan-derived, scanned-project-read-only, no-model-provider, review-required-only, and no automatic action rules explicit. |

Rejected fields for this contract:

- No raw markdown body fields.
- No request-provided project paths.
- No report-history or report persistence identifiers.
- No fields that imply a command, commit, task/calendar write, external notification, scanned-project edit, or agent work was triggered.
- No field that marks a recommendation as accepted project truth.

Verification mapping:

- Local-only inputs: `generatedFrom`, `workBoundaries`, and no path-bearing request contract beyond saved project identity.
- Human review items: `items`, `attentionReasons`, `findingsSummary`, `blockers`, and `recommendedHumanDecision`.
- Evidence and derived labels: `evidence` plus `derivedLabels`.
- Safe degradation: `baseline`, `safeStates`, `noAttentionMessage`, and empty `items`.
- No automatic action: `workBoundaries`, `actionTaken: false`, and `acceptedDecision: false`.

Notes deferred to later Phase 2 work items:

- Work item 2.3 must decide whether `mode` and `since` are accepted as query parameters and how invalid `since` is reported at the API layer.
- Work item 2.4 must define deterministic ranking tie-breakers for items with the same priority and attention reason severity.
- Ordinary report retrieval should not update the AI context snapshot unless work item 2.4 explicitly accepts that baseline side effect.

### 2.2 Design Report Composition Module Boundary

Status: completed on 2026-07-09 for architecture/design; implementation remains a Phase 3/OpenSpec task.

Objective:

- Define the responsibilities and inputs/outputs for a focused report composition module, likely `server/project-brief-report.mjs`.
- Decide which existing helpers it may call and which responsibilities stay in `server.mjs`, `server/ai-context.mjs`, and `server/ai-findings.mjs`.

Expected files/modules:

- `openspec/changes/add-project-brief-report/design.md`
- `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`
- Future implementation target: `server/project-brief-report.mjs`

Verification:

- Boundary avoids route-only logic inside the composition module.
- Boundary avoids report-specific presentation/ranking logic inside `server/ai-context.mjs`.
- Boundary preserves read-only scanned-project and local-only constraints.

Documentation updates:

- Record accepted module boundaries and rejected alternatives in this phase plan or OpenSpec design.

Recommended subagents:

- architecture-checker: review coupling, module ownership, and evolution risk.
- reviewer: challenge whether the module is small enough for one implementation slice.

Exit criteria:

- A future implementer can add the module and tests without guessing where ranking, shaping, and API orchestration belong.

OpenSpec and acceptance evidence:

- `add-project-brief-report/design.md` decision to add a dedicated report composition module.

Accepted boundary:

| Area | Decision |
|---|---|
| Module name | Future implementation target: `server/project-brief-report.mjs`. |
| Primary API | `buildProjectBriefReport({ scanOutput, config, findings, changes, previousSnapshotAvailable, mode, since, now })`. |
| Module style | Pure deterministic composition over provided inputs; no Express, no direct filesystem access, no scanner/watcher/rescan control, no remote services. |
| Inputs | `server.mjs` or a route orchestration helper reads saved config, generated scan data, current findings, and baseline/snapshot state before calling the report module. |
| Outputs | A `project-brief-report` object matching the work item 2.1 contract, or a domain error with a status-like code for missing/invalid generated scan data. |
| Allowed helper reuse | Pure helpers from `server/ai-context.mjs`, especially compact context mapping, changes comparison, and evidence normalization, when useful. |
| Forbidden helper calls | No `writeAiContextSnapshot`, no `generateFindings`, no `updateFindingReviewState`, and no direct app-data reads/writes from the report module. |
| `server.mjs` responsibility | Route orchestration, safe query validation, HTTP status serialization, config/generated scan reads, findings generation if accepted by API design, snapshot reads, and any future snapshot write decision. |
| `server/ai-context.mjs` responsibility | Compact context construction, changes-since comparison, snapshot helpers, and evidence normalization; no brief-specific recommendation text or ranking. |
| `server/ai-findings.mjs` responsibility | Findings generation, persistence, stale handling, review-state updates, and filtering; no report ranking or recommendation shaping. |
| Tests | Future `tests/project-brief-report.test.mjs` should cover pure composition first; API tests wait for work item 2.3 endpoint decisions. |

Rejected alternatives:

- Building the report directly inside the Express route, because ranking, safe states, and recommendation guards need focused unit tests.
- Placing report ranking inside `server/ai-context.mjs`, because AI context should remain reusable preflight context rather than brief presentation logic.
- Placing report ranking inside `server/ai-findings.mjs`, because findings are review-required records, not report items.
- Letting report retrieval update the AI context snapshot by default; baseline write behavior remains deferred to work item 2.4.
- Adding a report-history store during this boundary step.

Verification mapping:

- Route-only logic stays out of the composition module through the no-Express/no-query-parsing boundary.
- Report-specific ranking and recommendations stay out of `server/ai-context.mjs` and `server/ai-findings.mjs`.
- Local-only and read-only constraints are preserved by passing already loaded generated/local data into a pure module.
- Future tests can instantiate the module with fixture scan/config/findings/changes objects without starting Express or touching scanned project folders.

### 2.3 Design Local API Surface And Safe Parameters

Status: completed on 2026-07-09 for architecture/design; implementation remains a Phase 3/OpenSpec task.

Objective:

- Decide the retrieval surface for the first report, including endpoint name, response shape, HTTP status behavior, and allowed query parameters.
- Preserve saved-config-only and no-arbitrary-path guarantees.

Expected files/modules:

- `openspec/changes/add-project-brief-report/design.md`
- `openspec/changes/add-project-brief-report/specs/project-brief-report/spec.md` if API behavior changes requirements.
- `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`
- Future implementation target: `server.mjs`

Verification:

- API design allows no arbitrary project path input.
- Missing generated scan data behavior is explicit.
- Optional `since` behavior is explicit and does not create a new persistence source.

Documentation updates:

- Record selected endpoint and parameters before implementation.

Recommended subagents:

- architecture-checker: verify API boundary and local-only behavior.
- verification-checker: derive focused API tests from the design.

Exit criteria:

- Future route implementation can be test-driven from the selected API contract.

OpenSpec and acceptance evidence:

- Brief uses saved local inputs.
- Generated scan data is missing.
- Previous context snapshot is missing.

Accepted API surface:

| Area | Decision |
|---|---|
| Endpoint | `GET /api/project-brief-report`. |
| First surface | Local API/report JSON only; no dashboard UI, Markdown rendering, schedule, notification, or external action in this work item. |
| Response shape | `200` returns the `project-brief-report` JSON contract defined in work item 2.1. |
| Allowed query parameters | `since` and `mode` only. |
| `since` | Optional ISO timestamp. If omitted, report uses current signals only and comparison is unavailable. If present and invalid, return `400`. |
| `mode` | Optional `"daily"` or `"weekly"`, default `"daily"`. Metadata-only in the first API design; it does not alter ranking, filtering, data sources, or persistence. |
| Unknown query parameters | Return `400` with a clear allowed-parameters error. This includes path-like parameters instead of silently ignoring them. Repeated scalar params also return `400`. |
| Rejected selectors | No `path`, `projectPath`, `workspacePath`, `rootPath`, `scanPath`, `file`, `files`, `glob`, `include`, `exclude`, `projectId`, or arbitrary selectors. |
| Request body | Not used. This is a `GET` retrieval surface. |
| Missing generated scan data | Return `404` with a clear `missing-generated-scan-data` error; never scan request-provided paths as fallback. |
| Missing previous snapshot | Return `200` with `missing-previous-baseline` safe state when `since` is valid and current generated data exists. |
| Findings store missing | Return `200` when generated scan data exists with `missing-findings-store` or `empty-findings` safe state; ordinary report retrieval does not generate or persist findings. |
| Snapshot writes | Deferred to work item 2.4. Work item 2.3 does not approve report retrieval updating the AI context snapshot. |
| Findings writes | Not approved for report retrieval. If fresh findings generation becomes necessary, it needs a later explicit design decision because it makes a `GET` report retrieval mutate local runtime data. |

Route orchestration sequence:

1. Validate query parameter names.
2. Validate `since` and `mode` values.
3. Read generated scan data through existing app-data config-path helpers.
4. Read saved project config.
5. Read previous AI context snapshot before composition.
6. Read findings review state without generating or persisting new findings.
7. Compute AI context changes only when a valid `since` is present.
8. Call `buildProjectBriefReport(...)`.
9. Serialize domain errors to HTTP errors.

Verification mapping:

- Safe parameters: API tests should assert `since` and `mode` are accepted, invalid/repeated values return `400`, and unknown/path-like parameters return `400`.
- Saved-config-only boundary: API tests should prove no request path can select scan roots or files.
- Missing generated data: API tests should assert `404` with `missing-generated-scan-data` without a fallback scan.
- Previous baseline missing: API tests should assert `200` with a missing-baseline safe state when generated data exists.
- No attention items: API tests should assert `200`, `items: []`, and `noAttentionMessage` or `no-attention-items`, without invented recommendations.
- Side effects: negative tests should prove no scanned project files change, no AI context snapshot is written by report retrieval, no findings store is created or rewritten by report retrieval, and no report-history store is created.

### 2.4 Define Ranking, Empty-State, And Baseline Rules

Status: completed on 2026-07-09 for architecture/design; implementation remains a Phase 3/OpenSpec task.

Objective:

- Define deterministic report ranking/grouping rules and safe empty-state behavior.
- Decide how current report generation uses or updates the existing AI context snapshot.

Expected files/modules:

- `openspec/changes/add-project-brief-report/design.md`
- `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`
- Future implementation targets: `server/project-brief-report.mjs`, `server/ai-context.mjs` only if existing helper behavior must be reused or exposed.

Verification:

- Ranking rules are deterministic and testable without an LLM.
- No-attention state is explicit.
- Missing previous snapshot state is explicit.
- The design does not introduce a report-history store unless explicitly approved.

Documentation updates:

- Record ranking order, empty-state wording categories, and baseline behavior.

Recommended subagents:

- reviewer: challenge whether ranking could look like mandatory action.
- verification-checker: map ranking and empty states to tests.

Exit criteria:

- Phase 3 can implement report composition with deterministic expected outputs.

OpenSpec and acceptance evidence:

- Brief contains prioritized project items.
- Brief separates recommendation from action.
- Brief degrades safely when data is missing.

Accepted ranking rules:

| Area | Decision |
|---|---|
| Inclusion | A project appears in `items` only when it has at least one inclusion reason: unresolved finding, blocker, approval gate, needs-review signal, changed next action/status/risk, documentation gap, or first-run current signal when no previous baseline exists. |
| Priority | `high` for blockers, approval gates, or unresolved findings; `medium` for needs-review, changed next action/status/risk, or first-run current signal; `low` for documentation gaps without stronger reasons. |
| Tie-breakers | Sort by priority, highest reason severity, reason kind order, unresolved finding count, blocker/gate/review signal count, lowercase project name, then lowercase project path. |
| Reason kind order | `blocker`, `approval-gate`, `unresolved-finding`, `needs-review`, `changed-next-action`, `changed-status`, `changed-risk`, `first-run-current-signal`, `documentation-gap`. |
| Reason severity | `blocker`, `approval-gate`, and `unresolved-finding` are high; `needs-review`, changed reasons, and `first-run-current-signal` are medium; `documentation-gap` is low. |
| Unresolved findings | Only findings with `reviewState: "new"` create unresolved-finding attention reasons. Accepted, dismissed, and stale findings can be counted but do not create unresolved attention reasons. |
| Source-backed signal count | Tie-breaker count means distinct blocker, approval-gate, and needs-review signal objects, not evidence item count. |
| Documentation gaps | Include review-relevant gaps such as missing specs/design, missing audit/review/verification evidence, stale handoff pointers, or other dashboard gaps; do not promote purely informational coverage notes unless Phase 3 proves they are dashboard gaps. |
| First-run current signal | Additional reason when valid `since` was requested, baseline is unavailable, and current signals exist. It does not replace blocker, gate, review, unresolved finding, or gap reasons. |
| Rank meaning | `rank` is review order only. It is not a task order, implementation order, accepted decision, SLA, or command. |
| Recommendation wording | Use advisory verbs such as review, decide, inspect, confirm, or choose. Do not say the system resolved, accepted, executed, assigned, or scheduled anything. |
| Guard fields | Every item keeps `recommendedHumanDecision.actionTaken: false` and `recommendedHumanDecision.acceptedDecision: false`, including rank 1 and high-priority items. |
| No-attention wording | Express no-attention through top-level `noAttentionMessage` and `no-attention-items`, conditional on available generated local inputs. Do not create a `no-action-needed` item. |

Accepted empty-state rules:

| State | Decision |
|---|---|
| Missing/invalid generated scan data | API returns `404` with `missing-generated-scan-data`; report composition is blocked. |
| Generated scan data has zero projects | Return `200`, `items: []`, `summary.projectCount: 0`, `safeStates` includes `no-attention-items`, and `noAttentionMessage` explains that no tracked generated projects were available. |
| Projects exist but no inclusion reasons exist | Return `200`, `items: []`, `safeStates` includes `no-attention-items`, and no recommendation item is invented. |
| Findings store missing/unreadable | Return `200` with `missing-findings-store` safe state when scan data exists; blockers, gates, changes, and gaps can still produce items. |
| Findings data exists but no unresolved findings exist | Return `200` with `empty-findings` safe state when there are no finding records or no unresolved finding records to summarize; this does not block other item types. |
| Safe-state combinations | `missing-findings-store` or `empty-findings` may appear with ranked items. `no-attention-items` appears only when `items` is empty. `missing-previous-baseline` may appear with current-signal items and has `blocksReport: false`. |

Accepted baseline/snapshot rules:

| Case | Decision |
|---|---|
| `since` omitted | Current-signal-only report. `baseline.requestedSince: null`, `comparisonAvailable: false`, and no missing-baseline warning is required. |
| Valid `since` and previous snapshot exists | Changed categories can be included from snapshot comparison; `comparisonAvailable: true`. |
| Valid `since` and previous snapshot missing | Return `200` if generated scan data exists; include non-blocking `missing-previous-baseline`; current blockers, gates, unresolved findings, and gaps can still produce items. |
| Valid `since` and previous snapshot unreadable/corrupt | Treat as baseline unavailable for the first implementation: return `200` with non-blocking `missing-previous-baseline` when generated scan data exists and do not overwrite the snapshot from report retrieval. |
| Invalid `since` | API returns `400` before composition, per work item 2.3. |
| Snapshot write | `GET /api/project-brief-report` does not write `app-data/ai.context.snapshot.json`. A future explicit "mark baseline seen" behavior needs a separate design decision and endpoint/action. |
| Report history | No report-history store is introduced. Reports are regenerated from saved config, generated scan data, existing findings review state, and existing baseline state. |

Rejected alternatives:

- Treating rank 1 as a mandatory next task.
- Allowing a report recommendation to become an accepted project decision.
- Updating the AI context snapshot as a side effect of ordinary report retrieval.
- Creating a persistent report-history store during the first report architecture.
- Suppressing current blockers/gates just because the previous baseline is missing.
- Labeling report output as "source of truth", "resolved", "approved", "assigned", "scheduled", "implemented", "all clear", or equivalent accepted/action-taken wording.
- Triggering rank-based automation such as starting rank 1 work, creating tasks for high-priority items, accepting blockers, or marking findings handled.

Verification mapping:

- Ranking tests should use a fixture with blocker, approval gate, unresolved finding, needs-review, changed next action/status/risk, and gap-only projects, then assert priority and tie-breaker order.
- Recommendation tests should assert advisory wording categories and `actionTaken: false` / `acceptedDecision: false`.
- Empty-state tests should cover missing scan data, zero generated projects, projects with no inclusion reasons, missing findings store, and empty/unresolved-free findings.
- Baseline tests should cover omitted `since`, valid `since` with snapshot, valid `since` without snapshot, and no snapshot write after report retrieval.
- Gap tests should distinguish review-relevant gaps from informational coverage notes.
- Safe-state tests should assert allowed combinations, especially `missing-findings-store` with blocker/gate items and `no-attention-items` only with empty `items`.
- Side-effect tests should prove no report history store, scanned-project edit, command, task/calendar write, or agent trigger occurs.

### 2.5 Prepare Phase 3 Implementation Plan

Status: completed on 2026-07-09.

Objective:

- Convert the resolved Phase 2 architecture into an implementation-ready plan for `openspec/changes/add-project-brief-report/tasks.md`.
- Decide whether Phase 3 should implement all tasks or a smaller first slice.

Expected files/modules:

- `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md` or an implementation plan under `docs/phases/`.
- `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_PROJECT_AUDIT.md`

Verification:

- Implementation plan maps directly to OpenSpec tasks and requirements.
- Required tests and docs updates are listed before coding begins.
- `openspec validate --all --strict` and `git diff --check` pass.

Documentation updates:

- Update roadmap and audit with Phase 2 gate outcome and Phase 3 readiness.

Recommended subagents:

- architecture-checker: verify Phase 2 decisions are complete enough.
- verification-checker: verify implementation plan has concrete checks.

Exit criteria:

- Phase 2 can close with a clear, testable Phase 3 implementation path.

OpenSpec and acceptance evidence:

- `openspec/changes/add-project-brief-report/tasks.md` remains the implementation checklist source.

Phase 3 plan:

- Created `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`.
- Selected smallest useful Phase 3 slice: JSON-only local report API with shared types, pure composition module, local endpoint, tests, and documentation.
- Deferred dashboard UI, Markdown rendering, report history, scheduling, notifications, "mark baseline seen", findings/snapshot refresh behavior, remote providers, and external task/calendar integrations.
- Phase 3 must use `readFindingsStore()` for report retrieval rather than `generateFindings()` so `GET /api/project-brief-report` remains read-only for findings data.
- Phase 3 verification must include focused report tests, full tests/build, OpenSpec validation, diff check, and a static safety search for forbidden side-effect hooks.

## Phase Gate

- Completed: Project brief report JSON contract is defined.
- Completed: Report composition module boundary is accepted for implementation planning.
- Completed: Local API/retrieval surface and safe parameters are accepted for implementation planning.
- Completed: Ranking, empty-state, and baseline/snapshot behavior are accepted for implementation planning.
- Completed: No new persistence, cloud, remote model, task/calendar, command, commit, or scanned-project write behavior is introduced without a new approved design decision.
- Completed: Phase 3 implementation plan maps to `openspec/changes/add-project-brief-report/tasks.md`.
- Completed: `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, `docs/00_FILE_STRUCTURE.md`, this phase plan, and relevant OpenSpec artifacts agree after this session's updates.

## Human Decisions

- Decision: Phase 2 starts from the selected local project brief/report workflow.
- Decision: The first implementation surface remains API/report JSON before dashboard UI.
- Decision: The app remains single-user local-only through Phase 3.
- Decision: Phase 3 should implement the smallest useful API/report JSON slice first.
- Decision: Future endpoint name is `GET /api/project-brief-report`, with only `since` and metadata-only `mode` accepted as query parameters.
- Decision: human owner accepted the Phase 2 architecture/planning gate by explicitly approving the start of Phase 3 on 2026-07-09.
