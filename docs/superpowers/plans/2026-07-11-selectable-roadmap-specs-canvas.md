# Selectable Roadmap And Specs Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent per-project Roadmap/Specs selector and a safe, evidence-backed, responsive Specs Canvas without changing scanned projects or the accepted Roadmap.

**Architecture:** The scanner emits source-backed specification work; pure frontend modules normalize graph truth, deterministic layout, and obstacle-aware routes; UI-state stores only stable ids and presentation values; one Specs surface renders spatial desktop/tablet cards and dependency-aware mobile groups. Existing timeline and drawer infrastructure remain separate and are integrated through stable descriptors.

**Tech Stack:** Node.js filesystem scanner/config, TypeScript, React 19, Tailwind CSS 4, Node test runner, Vitest/Testing Library, SVG.

## Global Constraints

- Work only on the current branch `dashboard-redesign/ui-rebuild` as explicitly requested.
- Use only canonical saved project configuration; scanned projects remain local read-only inputs.
- Dependencies and task ownership require explicit supported evidence; never infer them.
- Connector endpoints tolerate at most 2 CSS px deviation and paths/labels require 4 CSS px clearance from non-endpoint cards.
- Mobile below 768 px uses dependency-aware vertical groups without two-dimensional essential navigation.
- Do not merge, push, or archive the OpenSpec change.

---

### Task 1: Saved documentation-view configuration

**Files:**
- Modify: `server/project-config.mjs`
- Modify: `server.mjs`
- Modify: `src/types.ts`
- Modify: `src/components/ManageProjects.tsx`
- Test: `tests/project-config.test.mjs`
- Test: `tests/server-api.test.mjs`

**Interfaces:**
- Produces: `defaultView?: 'roadmap' | 'specs'`, `documentationViews?: { roadmap?: { roots: string[] }; specs?: { roots: string[] } }` on tracked projects.
- Enforces: `validateDocumentationViews(projectRoot, input)` before atomic config writes.

- [ ] Write config/API tests for normalization, compatibility, and traversal/absolute/missing/file/symlink rejection.
- [ ] Run `npm test -- tests/project-config.test.mjs tests/server-api.test.mjs`; expect assertion failures for missing fields/validation.
- [ ] Implement the minimal config normalization, async safe-root validation, PATCH persistence, and editor fields.
- [ ] Re-run the focused tests; expect pass.
- [ ] Commit with the scanner-contract work after Task 2 is green.

### Task 2: Scanner specification-work contract

**Files:**
- Create: `server/spec-work.mjs`
- Modify: `scan-projects.mjs`
- Modify: `src/types.ts`
- Test: `tests/spec-work-scan.test.mjs`

**Interfaces:**
- Consumes: collected Markdown `{ file, category, content, modified }` plus saved per-view roots.
- Produces: `buildSpecWork({ projectId, docs, truncated }) -> RawSpecWorkModel` with `specifications`, `dependencies`, `unassignedTasks`, `integrityIssues`, and `isPartial`.

- [ ] Write fixtures covering roadmap/spec/mixed/scoped sources, both OpenSpec spellings, generic/task-only work, explicit dependencies, invalid edges, cycles, contradictions, and non-inference.
- [ ] Run `node --test tests/spec-work-scan.test.mjs`; expect module-not-found or missing-model failure.
- [ ] Implement narrow frontmatter parsing, identity/task extraction, saved-root classification, and scanner integration.
- [ ] Re-run scanner tests and existing `tests/run-scan.test.mjs`; expect pass and unchanged sentinels.
- [ ] Commit `feat: extract specification work from saved docs`.

### Task 3: Pure model, state, layout, and geometry

**Files:**
- Create: `src/specs/model.ts`
- Create: `src/specs/state.ts`
- Create: `src/specs/layout.ts`
- Create: `src/specs/routing.ts`
- Modify: `src/uiState.ts`
- Test: `tests/spec-model.test.mjs`
- Test: `tests/spec-layout.test.mjs`
- Test: `tests/spec-routing.test.mjs`
- Test: `tests/components/ui-state-pure.test.tsx`

**Interfaces:**
- Produces: `buildSpecCanvasModel(project)`, `resolvePrimaryView(...)`, `layoutSpecCards(...)`, `routeDependencies(...)`, `reconcileSpecCanvasState(...)`.
- Keeps lifecycle truth separate from selected/expanded/pan/zoom/filter state.

- [ ] Write failing tests for stable keys/revision, progress/current identity, invalid dependencies, previews, selection priority, persistence migration, deterministic layers, expansion, and geometry tolerances.
- [ ] Run the four focused suites; expect missing exports/failing behavior.
- [ ] Implement minimal pure modules and UI-state v2 migration.
- [ ] Re-run focused suites; expect pass.
- [ ] Commit `feat: add deterministic specs graph model`.

### Task 4: Search, drawer, and Canvas Focus UI

**Files:**
- Create: `src/specs/SpecsCanvas.tsx`
- Create: `src/specs/SpecCard.tsx`
- Create: `src/specs/PrimaryWorkView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/search.ts`
- Modify: `src/drawer.ts`
- Modify: `src/components/DetailDrawer.tsx`
- Modify: `src/index.css`
- Test: `tests/components/specs-canvas.test.tsx`
- Test: `tests/components/search-integration.test.tsx`
- Test: `tests/components/navigation-accessibility.test.tsx`

**Interfaces:**
- `PrimaryWorkView` chooses Roadmap/Specs but delegates existing Roadmap unchanged.
- `SpecsCanvas` receives model/state callbacks and opens `DrawerItem` with stable origin ids.

- [ ] Write failing component/search/focus tests for selector priority, expansion, controls, dependency text/highlighting, routing into Specs, spatial keys, focus return, responsive/mobile semantics, and all truth states.
- [ ] Run `npm run test:components -- --run ...`; expect missing component/behavior failures.
- [ ] Implement selector, canvas cards/SVG, controls, keyboard/touch/accessibility, mobile groups, drawer/search descriptors, and styles.
- [ ] Re-run focused component tests; expect pass with no warnings.
- [ ] Commit `feat: add accessible specs canvas`.

### Task 5: Dense fixture, docs, and completion gates

**Files:**
- Modify: `tests/components/fixtures.ts`
- Modify: `src/data/projects.json`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/00_FILE_STRUCTURE.md`
- Modify: `docs/CONTEXT.md`
- Modify: `docs/CURRENT_PROJECT_AUDIT.md`
- Modify: `docs/AI_STEP_VERIFICATION_CHECKLIST.md`
- Modify: `docs/AGENTS_USAGE.md`
- Modify: `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md`
- Modify: `openspec/changes/add-selectable-specs-canvas/tasks.md`

**Interfaces:**
- Dense fixture contains at least 30 specs, three chains, multiple scopes, independent/archived/cyclic work, unassigned tasks, and partial state.

- [ ] Add the dense fixture and automated assertions for counts, compact mode, grouping, geometry, and overflow.
- [ ] Run all targeted suites, then `npm test` and `npm run build`; expect zero failures/warnings attributable to the feature.
- [ ] Run `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`; expect success.
- [ ] Run dark/light 1280×720, 1024×768, and 390×844 browser checks, including dense fixture, keyboard/drawer return, geometry, overflow, and console.
- [ ] Update docs and OpenSpec checkboxes only where verification evidence exists; perform requirement-by-requirement self-review.
- [ ] Commit `docs: verify selectable specs canvas` and leave the change unarchived/unpushed.
