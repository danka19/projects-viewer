# Phase 1. Discovery And Requirements

Status: planned and ready to execute.

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
  - None at phase start.
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

- New OpenSpec changes created only for accepted behavior, not speculative ideas.

### 1.5 Select The First Usable Workflow For Phase 3

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

## Phase Gate

- Primary users and daily/weekly decisions are documented.
- Data sources, runtime stores, trust boundaries, and forbidden flows are documented.
- AI-assisted workflows are ranked with accepted, deferred, and rejected behaviors.
- At least one first usable workflow is selected for Phase 3.
- OpenSpec changes exist for any accepted behavior that is not already covered by main specs.
- `docs/ROADMAP.md`, `docs/CURRENT_PROJECT_AUDIT.md`, and `docs/00_FILE_STRUCTURE.md` match the resulting plan.

## Human Decisions

- Required: confirm whether Phase 1 should optimize first for human dashboard triage, AI-agent preflight, AI findings review, or daily/weekly project brief.
- Recommended default: daily/weekly project brief built from AI context and findings, because it connects the human dashboard and AI use case without granting AI control.
- Required: confirm whether the first user-visible AI findings surface belongs in the dashboard UI, an API-only workflow, or a generated report.
- Recommended default: start with API/report workflow first, then add UI after the review policy is validated.
- Required: confirm whether tracked-project configuration remains single-user local-only for the next usable workflow.
- Recommended default: keep single-user local-only through Phase 3.
