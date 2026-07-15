## 1. Trusted state derivation

- [x] 1.1 Add failing UX-001 fixtures: rule-derived next actions, done-project counts, TDD checkbox blocker, ambiguous current phase (`tests/scan-trust.test.mjs`).
- [x] 1.2 Gate next-action sources by path bias and audit category in `scan-projects.mjs`.
- [x] 1.3 Exclude plan checkboxes without explicit blocked wording from real blockers and fix the failing-test hard-block pattern.
- [x] 1.4 Derive `summary.currentPhase` only from a single explicit `in_progress` phase.
- [x] 1.5 Implement spec-compliant `phaseProgressInfo`/`projectRoadmapProgress` and update progress regression tests.
- [x] 1.6 Implement the pure timeline presentation model (`src/timeline/model.ts`) with stable keys, revision, explicit current IDs, integrity issues, and partial state; cover with `tests/timeline-model.test.mjs`.
- [x] 1.7 Run `npm test` (86/86 on 2026-07-11) and `npm run build`; verify real-project scan output no longer promotes rule text or TDD checkboxes as primary state.
