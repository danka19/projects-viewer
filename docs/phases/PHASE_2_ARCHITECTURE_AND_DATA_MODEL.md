# Phase 2. Architecture And Data Model

Status: planned; ready for architecture work item execution.

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

### 2.2 Design Report Composition Module Boundary

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

### 2.3 Design Local API Surface And Safe Parameters

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

### 2.4 Define Ranking, Empty-State, And Baseline Rules

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

### 2.5 Prepare Phase 3 Implementation Plan

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

## Phase Gate

- Project brief report JSON contract is defined.
- Report composition module boundary is accepted.
- Local API/retrieval surface and safe parameters are accepted.
- Ranking, empty-state, and baseline/snapshot behavior are accepted.
- No new persistence, cloud, remote model, task/calendar, command, commit, or scanned-project write behavior is introduced without a new approved design decision.
- Phase 3 implementation plan maps to `openspec/changes/add-project-brief-report/tasks.md`.
- `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, `docs/00_FILE_STRUCTURE.md`, this phase plan, and relevant OpenSpec artifacts agree.

## Human Decisions

- Decision: Phase 2 starts from the selected local project brief/report workflow.
- Decision: The first implementation surface remains API/report JSON before dashboard UI.
- Decision: The app remains single-user local-only through Phase 3.
- Open decision: approve the exact endpoint name and safe query parameters after work item 2.3 proposes them.
- Open decision: approve whether Phase 3 implements the whole proposed change or the smallest report-contract slice first.
