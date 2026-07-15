## Why

## Roadmap

- Execution phase: P4
- Related phases: none
- Lifecycle status: accepted

The 2026-07-10 UX audit (UX-001) recorded that generated dashboard state promotes agent rules, verification-checklist instructions, TDD plan checkboxes, and ambiguous lifecycle text as primary current phase, next action, and blocker values. The dashboard redesign is gated on trusted state: the timeline and overview must not visually amplify these false signals.

## What Changes

- Next-action signals (checkbox next-tasks, `NEXT:` markers, prose next-action matches) are no longer sourced from agent-rule paths (`AGENTS.md`, `CLAUDE.md`, `.claude/`, prompts/skills folders), process-policy paths, template/example paths, or audit/checklist-category documents.
- An unchecked markdown plan checkbox is treated as a task, not a live blocker, unless its text explicitly says blocked/blocker; "add a failing test" TDD wording no longer matches the hard-blocker pattern.
- `summary.currentPhase` is an explicit trusted identity: it is set only when exactly one phase is `in_progress`. Zero or multiple in-progress phases and pending-acceptance gates keep it `null` instead of fabricating a current phase.
- A frontend timeline presentation model (`src/timeline/model.ts`) exposes stable keys, deterministic sequence, revision, explicit current phase/step IDs or null, progress value/basis, partial state, and structured integrity issues without scanning prose.
- `phaseProgress` follows the dashboard-project-timeline progress semantics: cancelled/superseded steps leave numerator and denominator, blocked/deferred steps stay incomplete, non-resolved phases without eligible steps have unknown progress, and project progress averages only known eligible phases.

## Capabilities

### New Capabilities

- `dashboard-state-derivation`: trusted derivation rules for current phase identity, next-action sourcing, and blocker classification in generated dashboard data.

### Modified Capabilities

None. Accepted specs cover AI context/findings; roadmap presentation behavior is specified by the separate `redesign-dashboard-project-timeline` change.

## Impact

- `scan-projects.mjs`: next-action source gating, checkbox blocker rule, hard-blocker pattern, trusted `summary.currentPhase`.
- `src/phaseProgress.ts`: progress info with basis and project roadmap progress.
- `src/timeline/model.ts`: new pure presentation-model adapter.
- `tests/scan-trust.test.mjs`, `tests/timeline-model.test.mjs`, `tests/phase-progress.test.mjs`, `tests/helpers/load-ts.mjs`: regression coverage for UX-001 fixtures and the model contract.
- Consumers of `summary.currentPhase` and `nextTasks` (AI context, preflight packet, brief report, dashboard UI) receive fewer, more trustworthy values; no API shape changes.
