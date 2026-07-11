# Phase 1. Discovery And Requirements

Status: closed. Human acceptance was recorded on 2026-07-09.

## Goal

Identify the first real users, workflows, data sources, AI-assisted use cases, constraints, and acceptance criteria for Projects Viewer before adding more product surface. Phase 1 should turn the current local dashboard and AI context implementation into a clear product direction for Phase 2 architecture/data-model work and Phase 3 first usable workflow implementation.

## Inputs To Read

- `AGENTS.md`
- `docs/README.md`
- `docs/00_FILE_STRUCTURE.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_PROJECT_AUDIT.md`
- `docs/AI_STEP_VERIFICATION_CHECKLIST.md`
- `docs/CONTEXT.md`
- `README.md`
- `openspec/specs/ai-context/spec.md`
- `openspec/specs/ai-findings/spec.md`
- `openspec/changes/archive/2026-07-08-add-ai-context-findings-layer/`
- `docs/superpowers/specs/2026-07-08-persistent-project-management-design.md`
- `docs/superpowers/plans/2026-07-08-persistent-project-management.md`

## OpenSpec And Acceptance Mapping

- Affected accepted requirements:
  - `openspec/specs/ai-context/spec.md`
  - `openspec/specs/ai-findings/spec.md`
- Active proposed changes:
  - `openspec/changes/add-project-brief-report/` for the proposed daily/weekly project brief/report workflow.
- Acceptance scenarios:
  - Phase 1 MUST identify at least three prioritized workflows: human dashboard triage, AI agent preflight, and AI monitoring/briefing.
  - Phase 1 MUST record which workflow is selected as the first Phase 3 end-to-end workflow.
  - Phase 1 MUST record which behavior requires new OpenSpec changes before implementation.
  - Phase 1 MUST preserve local-only, read-only scanned-project, saved-config path, and no-agent-control boundaries.
  - Phase 1 MUST document acceptance criteria that can be verified by tests, API calls, or manual dashboard checks.
- Verification evidence expected before completion:
  - `openspec list`
  - `openspec list --specs`
  - `openspec validate --all --strict`
  - `git diff --check`
  - Documentation review showing `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, `docs/00_FILE_STRUCTURE.md`, and this phase plan agree.
  - Any new OpenSpec changes created during the phase validate strictly.

## Current Baseline

- Projects Viewer has a live local dashboard, static fallback mode, persistent tracked project/workspace config, safe workspace discovery, enabled-project scanning, watcher/manual/interval rescans, and local AI context/findings APIs.
- Accepted AI capabilities are now in main OpenSpec specs.
- No cloud, auth, API keys, agent control, arbitrary shell commands, whole-disk scanning, or scanned-project write-back is approved.
- The main open risk is product direction: the implementation can surface many signals, but the first valuable daily workflow and acceptance criteria are not yet chosen.

## Discovery Notes

### 1.1 Primary Users And Daily Decisions

Status: closed on 2026-07-09 after the human owner accepted the Phase 1 gate.

Source evidence:

- `README.md` defines the dashboard as a local project radar that answers status, next action, and needs-attention questions.
- Accepted `ai-context` requirements define compact AI preflight context for all projects and selected projects.
- Accepted `ai-findings` requirements define review-required findings with human review states and no automatic agent action.
- `docs/CONTEXT.md` requires raw documentation, derived dashboard interpretations, review-required proposals, and accepted decisions to stay separate.

Primary users:

| User | Purpose | Product responsibility |
|---|---|---|
| Human owner | Decide what to work on, what needs review, and which project signals are accepted or dismissed. | Owns product, UX, data-source, security, scope, and final acceptance decisions. |
| AI implementation agent | Read compact project context before coding, planning, or reviewing a project. | Uses context as preflight evidence, then verifies against source files before making changes. |
| AI reviewer/checker agent | Inspect risks, blockers, missing verification, stale docs, and contradiction signals. | Produces review-required observations; does not convert findings into accepted decisions. |
| Future brief consumer | Receive a daily or weekly digest of project changes, blockers, and required human decisions. | Reviews a generated summary; does not grant AI authority to act. |

Daily and weekly decisions:

| Decision | Primary user | Inputs | Expected output |
|---|---|---|---|
| Which project needs attention first? | Human owner | Project status, health score, blockers, approval gates, stale docs, findings. | A chosen project or a conscious decision to defer. |
| What is the next safe action for this project? | Human owner with AI agent support | Next action, current phase, accepted specs, blockers, risks, source evidence. | A task to execute, a human review action, or a decision to pause. |
| Can an AI agent start work safely? | AI implementation agent | AI context, OpenSpec specs/changes, phase plan, current blockers, trust boundaries. | Proceed with scoped work, ask for a human decision, or stop because context is insufficient. |
| Which findings require human review? | Human owner with AI reviewer/checker support | AI findings, evidence, confidence, review state, source file/line. | Accepted, dismissed, or left new for later review. |
| What changed since the last check? | Human owner or future brief consumer | AI context changes-since, findings state changes, project status/next-action diffs. | Daily/weekly brief items and follow-up priorities. |

Workflow ranking for Phase 1:

1. Daily/weekly project brief built from AI context and findings.
   Recommended first because it combines human dashboard triage and AI assistance without giving AI control.
2. AI-agent preflight before project work.
   Already backed by accepted `ai-context` specs; useful for future agents and subagents.
3. Human dashboard triage.
   Existing UI already supports much of this; Phase 1 should identify the missing high-value decision points before adding UI.
4. AI findings review surface.
   Useful, but should follow a reviewed policy so findings do not look like accepted truth.

Non-goals for the next usable slice:

- Do not let AI findings create tasks, commits, shell commands, calendar items, Trello cards, or scanned-project edits automatically.
- Do not add remote LLM providers, cloud sync, authentication, or API keys.
- Do not make the dashboard a whole-project file browser or arbitrary path scanner.
- Do not treat health score, status, or finding confidence as a judgment of code quality.

Open questions for human confirmation:

1. Should Phase 1 optimize the next usable workflow for daily/weekly project brief first?
   Recommended default: yes.
   Tradeoff: a brief proves end-to-end value quickly, but it may delay a richer dashboard findings UI.
2. Should the first brief be generated as an API/report artifact before any new UI?
   Recommended default: yes.
   Tradeoff: an API/report validates content and review policy faster, while UI work is more visible but more expensive.
3. Should AI-agent preflight become mandatory project workflow guidance before any future implementation session?
   Recommended default: yes for Projects Viewer phase work and optional for unrelated small fixes.
   Tradeoff: it improves safety but adds ceremony to tiny changes.
4. Should tracked-project configuration remain single-user local-only through Phase 3?
   Recommended default: yes.
   Tradeoff: keeps safety simple, but postpones multi-user or remote access scenarios.

### 1.2 Data Sources, Runtime Files, And Trust Boundaries

Status: closed on 2026-07-09 for the current local-only architecture; reopen through a new change if a data source is proposed.

Source evidence:

- `server/project-config.mjs` stores canonical config under `app-data/` and resolves saved project/workspace paths before use.
- `scan-projects.mjs` reads enabled entries from `app-data/projects.config.json` and writes the generated scan output to `app-data/projects.generated.json`.
- `server.mjs` AI endpoints read generated scan data and saved config; they do not accept request-provided scan paths.
- `server/ai-context.mjs` derives compact AI context from generated scan data and writes only `app-data/ai.context.snapshot.json` for changes-since comparison.
- `server/ai-findings.mjs` derives findings from generated scan data and persists finding review state in `app-data/ai.findings.generated.json`.
- Accepted OpenSpec specs define local-only AI context and review-required findings with no automatic agent action.

Runtime and trust inventory:

| Source or store | File/API | Trust level | Writer | Consumer | Notes |
|---|---|---|---|---|---|
| Saved tracked-project config | `app-data/projects.config.json` | Canonical local input | Project-management API or manual local edit while stopped | Scanner, watcher, AI context APIs, dashboard | Only saved paths may drive scans; browser requests can validate/save paths but not scan arbitrary paths directly. |
| Raw scanned documentation | Saved tracked project paths from config | Trusted raw source data | Human/project repositories outside this dashboard | Scanner and derived dashboard signals | Read-only input; Projects Viewer must not write, move, delete, or reformat scanned project files. |
| Generated scan data | `app-data/projects.generated.json`, `GET /api/projects` | Derived dashboard data | Scanner runs | Dashboard, AI context, AI findings | Regenerable from config plus raw documentation; contains statuses, health, blockers, risks, gaps, summaries, and evidence. |
| AI preflight context | `GET /api/ai-context`, `GET /api/ai-context/projects/:id` | Derived compact context | API response from generated scan and findings | AI agents and future brief/report workflow | Omits raw markdown bodies by default; useful before work, but agents must verify source files before acting. |
| AI context changes | `GET /api/ai-context/changes?since=<iso>` and `app-data/ai.context.snapshot.json` | Derived runtime cache | AI context API | AI agents and future brief/report workflow | Snapshot is only for comparing compact fields across requests; safe to regenerate/reset. |
| AI findings store | `app-data/ai.findings.generated.json`, `GET /api/ai-findings`, `PATCH /api/ai-findings/:id` | Review-required proposal evidence | Findings generator and explicit review-state updates | Human owner, AI reviewer/checker agents | Findings can be `new`, `accepted`, `dismissed`, or `stale`; this does not create accepted project decisions or tasks. |
| Static fallback data | `src/data/projects.json` | Static fallback artifact | Build/prebuild scan path | Browser-only static mode | Not live source of truth when local API is reachable; rescan controls stay disabled in static mode. |
| Accepted behavior and decisions | `openspec/specs/**`, active/archived OpenSpec changes, phase docs, audit/context docs | Durable reviewed project truth | Human-reviewed documentation/spec workflow | Human owner and AI agents | Generated runtime files can provide evidence for updates, but cannot replace accepted specs or docs. |

Forbidden or approval-required data flows:

- Browser/API requests must not provide arbitrary paths to scan, watch, or summarize.
- Scans and watchers must stay limited to enabled saved project paths from `app-data/projects.config.json`.
- Runtime files must not write back into scanned project repositories.
- AI findings, AI context, health scores, and summaries must not create tasks, commits, shell commands, calendar items, Trello cards, or scanned-project edits automatically.
- Remote LLM providers, cloud sync, auth, API keys, databases, external issue trackers, and task/calendar integrations require explicit future design approval and OpenSpec coverage.

Phase 2 readiness decision:

- No additional data source is needed before Phase 2. Phase 2 can start from the current source set: saved local config, raw scanned documentation, generated scan data, AI context snapshot, AI findings store, static fallback data, and accepted OpenSpec/docs records.
- If Phase 2 proposes persistent architecture beyond local JSON files, the proposal must keep this trust split visible: raw inputs, derived interpretations, review-required records, and accepted decisions are separate categories.

### 1.3 AI-Assisted Workflows And Review Policy

Status: closed on 2026-07-09 after the project brief/report behavior was captured in OpenSpec and the Phase 1 gate was accepted.

Source evidence:

- Accepted `ai-context` requirements already support compact all-project and per-project preflight context, source evidence, changes-since, and local-only access.
- Accepted `ai-findings` requirements already support review-required findings, source evidence, local runtime storage, human review states, and no automatic agent action.
- Phase 1 discovery ranked daily/weekly project brief first because it combines human triage and AI assistance without giving AI control.
- The trust inventory keeps raw scanned documentation, derived dashboard interpretations, review-required records, and accepted decisions separate.

Accepted AI-assisted workflow direction:

| Rank | Workflow | Primary user | Input data | Output | Phase 1 policy |
|---|---|---|---|---|---|
| 1 | Daily/weekly project brief | Human owner and future brief consumer | AI context, changes-since categories, unresolved findings, project status, blockers, review gates | A short prioritized report of changed projects, attention items, and recommended human decisions | Accepted as the recommended first Phase 3 value slice; requires a new OpenSpec change before implementation. |
| 2 | AI-agent preflight | AI implementation agent | Per-project AI context, specs, phase plan, blockers, risks, findings summary, trust boundaries | Proceed, ask for a decision, or stop with a blocker before coding/planning | Accepted as workflow guidance for future phase work; agents must verify source files before acting. |
| 3 | AI reviewer/checker pass | AI reviewer/checker agent | AI findings, evidence, audit/doc signals, missing verification, contradictions | Review-required observations with evidence and confidence | Accepted as review support only; findings remain proposals until human handling. |
| 4 | Human dashboard triage | Human owner | Dashboard status, health score, blockers, next action, findings counts | A chosen next project or conscious defer decision | Accepted as existing core dashboard purpose; richer review UI is deferred until brief/report requirements are clear. |

Rejected or deferred AI behaviors:

| Behavior | Decision | Reason |
|---|---|---|
| Automatically create tasks, commits, shell commands, calendar items, Trello cards, or scanned-project edits from findings | Rejected for current roadmap | This would turn proposal evidence into agent control and violates local read-only boundaries. |
| Use remote LLM providers, cloud sync, auth, API keys, or external issue trackers for the first AI workflow | Deferred and approval-required | Current accepted specs are local-only and deterministic; new integrations need explicit design approval and OpenSpec coverage. |
| Treat health score, finding confidence, or AI summary as a code-quality judgment | Rejected | These are triage signals derived from documentation, not authoritative code review or project truth. |
| Build a full findings-review UI before the first brief/report contract | Deferred | A review UI may be useful, but Phase 1 currently needs a minimal end-to-end workflow and acceptance criteria first. |

Finding review policy:

| Review state | Operational meaning | What it may do | What it must not do |
|---|---|---|---|
| `new` | Finding is unresolved and needs human attention. | Appear in unresolved findings, brief candidates, and AI reviewer/checker input. | Block work automatically unless a human or agent verifies the source evidence and records the blocker elsewhere. |
| `accepted` | Human agrees the finding record is useful or true enough to track. | Stay visible as accepted review evidence and inform future planning or docs updates. | Become an accepted project decision, completed verification result, or implementation command by itself. |
| `dismissed` | Human reviewed the finding and decided it is not useful now. | Stay in local review history and disappear from unresolved views unless evidence changes enough to create a new finding identity. | Delete source data or prevent future detection of materially different evidence. |
| `stale` | Latest scan no longer supports the finding evidence. | Remain as history to avoid confusion and keep unresolved views clean. | Be shown as an active blocker or accepted decision. |

Acceptance criteria for the recommended brief/report workflow:

- The brief/report MUST be generated only from saved config, generated scan data, AI context changes, and findings review state.
- It MUST identify changed projects, unresolved review-required findings, likely blockers, approval gates, and recommended human decisions.
- It MUST label derived interpretations as derived and preserve source evidence where available.
- It MUST separate "recommended human decision" from "action taken".
- It MUST NOT run commands, modify scanned projects, create commits, create external tasks/calendar items, or call remote model providers.
- It MUST degrade safely when generated scan data or the previous AI context snapshot is missing.

OpenSpec decision:

- Existing accepted specs are sufficient for the current implemented AI context/findings APIs.
- A new OpenSpec change is required before implementing the brief/report artifact, any user-visible findings review surface, or any behavior that changes the AI data contract.

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

### 1.1 Identify Primary Users And Daily Decisions

Status: closed on 2026-07-09 after the human owner accepted the Phase 1 gate and approved Phase 2 planning.

Objective:

- Define who the dashboard is for in the next usable version and what decisions it should help them make in a normal day or week.
- Separate human-owner workflows from AI-agent workflows so the UI and API do not blur their responsibilities.

Expected files/modules:

- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`
- `docs/CONTEXT.md` if new canonical terms are accepted.
- `openspec/changes/<change-id>/` only if accepted behavior changes need formal requirements.

Verification:

- The phase plan records user roles, daily/weekly decisions, non-goals, and safety boundaries.
- The answer distinguishes dashboard observation, AI preflight context, and AI findings review.

Documentation updates:

- Update this phase plan with accepted decisions and open questions.
- Update `docs/CONTEXT.md` for durable terminology only.

Recommended subagents:

- worker: draft user/workflow discovery notes from existing docs and implementation.
- reviewer: challenge whether workflows are specific enough to drive acceptance.

Exit criteria:

- At least two user roles and three concrete decisions are documented.
- Open questions are batched with recommended defaults and tradeoffs.

OpenSpec and acceptance evidence:

- Existing `ai-context` and `ai-findings` specs are mapped to the relevant AI user workflows.

### 1.2 Inventory Data Sources, Runtime Files, And Trust Boundaries

Status: closed on 2026-07-09 for the current local-only architecture.

Objective:

- Document which data sources are trusted raw inputs, which are derived dashboard interpretations, which are AI review-required records, and which are accepted decisions.
- Confirm whether any additional data source is needed before Phase 2.

Expected files/modules:

- `docs/CONTEXT.md`
- `docs/CURRENT_PROJECT_AUDIT.md`
- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`

Verification:

- Every current runtime file under `app-data/` has a documented role.
- The plan confirms browser/API requests still cannot provide arbitrary scan paths.
- AI findings remain review-required proposal evidence only.

Documentation updates:

- Update canonical terms and audit risks if the trust model changes.

Recommended subagents:

- architecture-checker: verify data-source and trust-boundary language.
- verification-checker: compare docs against `server/`, `scan-projects.mjs`, and accepted OpenSpec specs.

Exit criteria:

- Phase 2 can start with a clear list of raw inputs, derived outputs, runtime stores, and forbidden data flows.

OpenSpec and acceptance evidence:

- `ai-context` requirements for generated scan data and local-only access.
- `ai-findings` requirements for runtime storage and no automatic agent action.

### 1.3 Define AI-Assisted Workflows And Review Policy

Status: closed on 2026-07-09 after the project brief/report OpenSpec change captured the proposed behavior.

Objective:

- Decide how AI should use Projects Viewer data: preflight before work, monitoring/briefing, contradiction detection, or finding review.
- Define when an AI finding becomes useful enough to show to the human and what review states mean operationally.

Expected files/modules:

- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`
- Potential future `openspec/changes/<change-id>/` for user-visible findings UI or brief workflow.

Verification:

- The plan records at least one accepted AI-assisted workflow and at least one rejected or deferred AI behavior.
- The plan states that findings do not create tasks, commits, shell commands, or scanned-project edits automatically.

Documentation updates:

- Update this phase plan and, if behavior is accepted, create or update OpenSpec changes.

Recommended subagents:

- worker: propose candidate AI workflows.
- reviewer: check for privacy, over-automation, and source-of-truth drift.

Exit criteria:

- There is a ranked list of AI workflows with acceptance criteria, risks, and non-goals.

OpenSpec and acceptance evidence:

- Existing `ai-findings` review-state scenarios.
- Existing `ai-context` compact preflight scenarios.

### 1.4 Convert Discovery Into Requirements And Proposed Changes

Status: closed on 2026-07-09 for the project brief/report workflow.

Objective:

- Turn accepted Phase 1 decisions into concrete OpenSpec changes for product behavior, data contracts, UI workflows, or monitoring workflows.
- Avoid implementing features directly from discussion notes.

Expected files/modules:

- `openspec/changes/<change-id>/proposal.md`
- `openspec/changes/<change-id>/design.md`
- `openspec/changes/<change-id>/specs/**/spec.md`
- `openspec/changes/<change-id>/tasks.md`
- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`

Verification:

- Every proposed product behavior change has acceptance scenarios.
- `openspec validate --all --strict` passes.
- This phase plan links accepted or proposed changes.

Documentation updates:

- Update roadmap/audit if scope, risk, or phase status changes.

Recommended subagents:

- architecture-checker: review data contracts and boundaries.
- verification-checker: verify OpenSpec scenarios are testable.

Exit criteria:

- Phase 2 and Phase 3 can start from OpenSpec artifacts rather than prose-only intentions.

OpenSpec and acceptance evidence:

- Created `openspec/changes/add-project-brief-report/` with `proposal.md`, `design.md`, `specs/project-brief-report/spec.md`, and `tasks.md`.
- New OpenSpec requirements cover local derived inputs, human review items, evidence and derived labels, missing-data behavior, and no automatic action.
- Existing `ai-context` and `ai-findings` specs remain unchanged; the new proposed capability composes them rather than changing their accepted contracts.

### 1.5 Select The First Usable Workflow For Phase 3

Status: closed on 2026-07-09 after human acceptance of the Phase 1 gate.

Objective:

- Choose the first end-to-end workflow that proves product value and define why it is first.
- Capture what Phase 2 must design before Phase 3 can implement it.

Expected files/modules:

- `docs/ROADMAP.md`
- `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md`
- `docs/CURRENT_PROJECT_AUDIT.md`
- Relevant OpenSpec changes.

Verification:

- The selected workflow has user, trigger, inputs, outputs, acceptance criteria, verification approach, and explicit non-goals.
- The plan states whether the first workflow is dashboard-first, AI-context-first, AI-findings review, or daily/weekly brief.

Documentation updates:

- Update roadmap Phase 2/3 descriptions if the selected workflow changes their focus.
- Update audit risks with remaining unresolved decisions.

Recommended subagents:

- reviewer: challenge whether the chosen workflow is the smallest value-proving slice.
- architecture-checker: identify Phase 2 architecture decisions needed before implementation.

Exit criteria:

- Phase 1 gate can be closed with a clear Phase 2 architecture target and Phase 3 workflow target.

OpenSpec and acceptance evidence:

- Selected workflow is either covered by accepted specs or has a proposed OpenSpec change ready for implementation planning.

## Selected First Usable Workflow

Selected Phase 3 workflow: daily/weekly project brief as a local API/report workflow first, with dashboard UI deferred until the report contract proves useful.

Why this is first:

- It turns existing scan, AI context, changes-since, and findings data into one concrete human decision aid.
- It supports both human dashboard triage and AI-agent preflight without granting AI authority to act.
- It has an active OpenSpec proposal ready for implementation planning: `openspec/changes/add-project-brief-report/`.
- It is smaller and safer than a full findings-review UI because the first slice can validate content, ranking, evidence labels, and safe missing-data behavior through API/report tests.

Workflow definition:

| Field | Decision |
|---|---|
| Primary user | Human owner, with future AI implementation/reviewer agents as secondary consumers. |
| Trigger | Manual request for a current daily/weekly brief; future scheduled or dashboard trigger is out of scope until approved. |
| Inputs | Saved tracked-project config, generated scan data, AI context changes, AI findings review state, accepted specs/docs as evidence references. |
| Output | Structured local report with changed projects, unresolved findings, likely blockers, approval gates, evidence, derived labels, warnings, and recommended human decisions. |
| First surface | Local API/report JSON. A dashboard panel or Markdown rendering can follow after the data contract is implemented and verified. |
| Acceptance source | `openspec/changes/add-project-brief-report/specs/project-brief-report/spec.md`. |
| Verification approach | Contract tests for report composition, missing data, evidence labels, no arbitrary paths, and no unauthorized side effects; `npm test`, `npm run build`, `openspec validate --all --strict`, and `git diff --check`. |

Explicit non-goals for the first usable workflow:

- No remote LLM provider, cloud sync, auth, API keys, external issue tracker, calendar, or Trello integration.
- No automatic task creation, commits, shell commands, notifications, scanned-project edits, or agent implementation trigger.
- No full findings-review UI before the report contract exists.
- No new persistent report-history store unless Phase 2 explicitly designs and approves it.

Phase 2 architecture target:

- Design the `project-brief-report` data contract and module boundary around a focused report composition module, likely `server/project-brief-report.mjs`.
- Decide the local retrieval surface, likely `GET /api/project-brief` or equivalent, including safe query parameters such as optional `since`.
- Define report item ranking/grouping rules for changed projects, unresolved findings, blockers, approval gates, and changed next actions.
- Confirm whether the first implementation reuses existing AI context snapshot behavior only, or needs a documented report-baseline strategy.
- Map the OpenSpec tasks in `openspec/changes/add-project-brief-report/tasks.md` into a Phase 2 implementation plan before any Phase 3 UI or workflow build.

Phase 3 implementation target:

- Implement the first end-to-end local project brief/report workflow from the proposed OpenSpec change after Phase 2 resolves the contract and module boundaries.
- Deliver API/report output before dashboard UI, then use verified report output to decide whether a dashboard panel, Markdown rendering, or findings review UI is the next useful surface.

## Phase Gate

- Primary users and daily/weekly decisions are documented.
- Data sources, runtime stores, trust boundaries, and forbidden flows are documented.
- AI-assisted workflows are ranked with accepted, deferred, and rejected behaviors.
- First usable workflow selected for Phase 3: daily/weekly project brief as local API/report JSON first, dashboard UI later.
- OpenSpec change exists for the selected behavior: `openspec/changes/add-project-brief-report/`.
- `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, and `docs/00_FILE_STRUCTURE.md` match the resulting plan after work item 1.5 updates.

## Human Decisions

- Decision: Phase 3 should optimize first for a daily/weekly project brief built from AI context and findings.
- Decision: The first surface should be API/report JSON, then dashboard UI or Markdown rendering after the review policy and report contract are validated.
- Decision: Tracked-project configuration remains single-user local-only through Phase 3.
- Decision: Human owner approved moving from Phase 1 discovery into Phase 2 architecture planning for `add-project-brief-report` on 2026-07-09.
