# Task 11 Search Deduplication Fix Report

## Phase 1 — Reproduction And Root Cause

The browser acceptance report reproduces the defect with query `preflight packet`: the exact evidence at `openspec/changes/improve-dashboard-evidence-trust/tasks.md:19` is returned once as `Spec task` and once as `Task`, with identical project path, file, line, and text.

The candidate trace shows that `searchProjects` stores matches in `byKey`, keyed by the `dedupeKey` passed to `addMatching`. Next actions, open tasks, and decisions all pass the shared source-aware `evidenceKey(project, { file, line, text })`; the recent `b4fc4fe` change completed that contract for those representations. The spec-work task candidate does not pass a dedupe key, so `addMatching` falls back to its kind-specific stable result key (`spec-task`, source, and parser task key). The ordinary task uses the source-aware evidence key. Consequently the two identical representations occupy different `Map` entries and both survive ranking and presentation.

This is a candidate-construction gap, not a fragment-identity defect: match fragments are computed only after deduplication, and neither the query nor fragment is part of the evidence key.

## Phase 2 — Working Pattern Comparison

The working next-action/decision/task path gives every representation of the same source evidence the same dedupe key, while retaining each representation's own stable navigation key. `add` then keeps the higher-scored representation; query-fragment selection happens afterward and cannot alter identity, ranking, or navigation.

## Phase 3 — Single Hypothesis

If the spec-work task candidate uses the same source-aware evidence key derived from project path, task source file, task source line, and task name, then identical spec-task/open-task representations will collapse to one higher-ranked `Spec task`, while distinct source lines or different text remain separate and different queries only change presentation fragments.

## Phase 4 — TDD And Verification

### RED

Added the pure regression test `deduplicates identical spec-work and open-task evidence before selecting query fragments`. Before the production change:

- Command: `npx vitest run tests/components/search-pure.test.tsx`
- Result: expected `total` 1, received 2 for the identical representations.
- Test summary: 1 failed, 15 passed. The failure was the intended missing-dedup behavior rather than a setup or syntax error.

### GREEN And Collision Boundaries

Changed only the spec-work task candidate construction in `src/search.ts`. A spec task with a known source line now passes `evidenceKey(project, { file, line, text: task.name })` to `addMatching`; a task without a source line keeps its prior kind-specific stable key.

The retained representation is the higher-ranked `Spec task` (score 68 versus ordinary `Task` score 58). Its own stable result key, `primaryView: specs`, `specKey`, `taskKey`, source drawer, and navigation target survive because the shared evidence key is used only as the `Map` dedupe key. Two queries select different visible fragments from the retained source while producing the same stable identity and navigation contract.

Added a separate pure boundary test proving the key does not merge same-text evidence on different lines or different-text evidence on the same line. Those three evidence records remain three uniquely keyed results.

### Verification Evidence

- GREEN regression: `npx vitest run tests/components/search-pure.test.tsx` — 16/16 passed immediately after the production fix.
- Combined focused search tests: `npx vitest run tests/components/search-pure.test.tsx tests/components/search-integration.test.tsx` — 25/25 passed after adding the collision-boundary coverage.
- Full suite: `npm test` — 133/133 Node tests and 104/104 Vitest tests passed. The run printed existing Vite WebSocket port-in-use messages for port 24678 during API tests, but no test failed.
- Production build: `npm run build` — TypeScript check and Vite production build completed successfully; 65 modules transformed.
- Patch hygiene: `git diff --check` — exit 0. Git printed only LF-to-CRLF working-copy warnings for the two edited source/test files.

### Scope And Remaining Acceptance

- No OpenSpec task checkbox was changed.
- The generated scan written by the build did not remain modified.
- The original live browser matrix, including the Vite HMR console concern, still requires a fresh rerun at the new commit before Task 3.4 can be accepted.
