## Why

## Roadmap

- Execution phase: P4
- Related phases: none
- Lifecycle status: accepted

Projects Viewer currently presents roadmap state as a dense vertical list hidden behind a secondary tab, so the user cannot understand completed work, the active phase, the current step, or what comes next at a glance. The dashboard redesign needs a trustworthy, compact project timeline that makes lifecycle position visually obvious while preserving the existing dark theme and read-only evidence model.

## What Changes

- Replace the selected project's vertical roadmap list with a horizontally ordered phase timeline that distinguishes completed, active, planned, blocked, pending-acceptance, deferred, cancelled, and superseded phases without relying on color alone.
- Allow exactly one phase to be expanded at a time; the expanded phase reveals a nested horizontal step timeline beneath the phase axis.
- Define deterministic click, repeated-click, keyboard, focus, overflow, responsive, progress, loading, empty, error, and no-steps behavior.
- Keep phase and step source evidence, confidence, lifecycle status, and parser/documentation issues accessible through the existing read-only details workflow.
- Reuse the existing Projects Viewer theme tokens and status vocabulary; the supplied light-theme reference informs only the component composition and interaction model.
- Treat phase and step ordering/status as trusted inputs to the component. Scanner status-derivation cleanup remains a prerequisite workstream in the broader dashboard redesign and is not silently solved by visual styling.
- Add focused component, state-reducer, keyboard, accessibility, responsive-overflow, and browser acceptance coverage before replacing the current roadmap view.

## Capabilities

### New Capabilities

- `dashboard-project-timeline`: Horizontal phase and nested-step timeline behavior, data contract, progress semantics, responsive overflow, accessibility, fallback states, and acceptance requirements.

### Modified Capabilities

None. Existing accepted specs cover AI context/findings rather than dashboard roadmap presentation.

## Impact

- Frontend: `src/components/RoadmapTimeline.tsx` will be replaced or decomposed into focused timeline components; `src/phaseProgress.ts`, `src/statusMeta.ts`, `src/types.ts`, `src/components/SelectedProjectHeader.tsx`, and `src/components/ProjectTabs.tsx` may require contract or integration updates.
- Scanner/data contract: existing `PhaseItem` and `PhaseStep` remain the source shapes initially, but an ordered presentation adapter and explicit trust/confidence handling may be added without modifying scanned project files.
- Tests: new frontend-capable component/state tests and browser acceptance checks are required; existing phase-progress tests remain regression coverage.
- Documentation: dashboard UX audit, redesign plan, roadmap, current audit, documentation map, and OpenSpec change status must reference the same scope and prerequisites.
- Dependencies and boundaries: no cloud, auth, writes to scanned projects, arbitrary paths, task execution, calendar integration, or remote model behavior is introduced.
