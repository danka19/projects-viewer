## 1. Scanner And Saved Configuration Contract

- [x] 1.1 Add failing config tests for optional default view, normalized per-view roots, atomic invalid/outside/symlink rejection, and backward compatibility.
- [x] 1.2 Implement canonical saved documentation-view configuration and PATCH API/UI support without request-time arbitrary scanning.
- [x] 1.3 Add failing scanner fixtures for roadmap-only, spec-only, mixed, separately scoped, partially scoped, `openspec/`, `.openspec/`, generic spec, and task-only projects.
- [x] 1.4 Implement safe source collection/classification, narrow work frontmatter parsing, specification identity, task ownership, unassigned work, and immutable generated contract types.
- [x] 1.5 Add failing dependency fixtures for chain/branch, missing target, self-edge, duplicate declaration, cycle, contradictory metadata, and non-inference signals; implement evidence-preserving extraction.

## 2. Pure Spec Model, Layout, And Routing

- [x] 2.1 Add failing pure-model tests for stable keys/revision, lifecycle/dependency separation, progress/unknown progress, current/null identity, groups, archived counts, partial data, integrity issues, and stale reconciliation.
- [x] 2.2 Implement the immutable `SpecCanvasModel`, deterministic task previews, dependency validation/blocking, dense grouping, and reconciliation helpers.
- [x] 2.3 Add failing deterministic layout tests for focus, ancestors/descendants, independent/group/invalid lanes, expansion, scan-order shuffling, and card non-overlap.
- [x] 2.4 Implement stable layered layout and mobile dependency grouping.
- [x] 2.5 Add failing geometry tests for 2 px ports, 4 px obstacle clearance, label/card exclusion, mixed-height expansion, branching dependencies, and no page overflow.
- [x] 2.6 Implement deterministic rectilinear obstacle routing and geometry verification helpers.

## 3. View State, Search, And Drawer Navigation

- [x] 3.1 Add failing tests for view resolution priority, per-project persistence, v1 migration, history restoration, stale-view fallback, and no cross-project leakage.
- [x] 3.2 Implement versioned primary-view/spec-canvas state and integrate it with project selection and browser history.
- [x] 3.3 Add failing search/drawer tests for specification/task indexing, correct view activation, card/task focus, details, and exact refresh-safe focus return.
- [x] 3.4 Implement stable specification/task descriptors and search/drawer navigation.

## 4. Specs Canvas Presentation

- [x] 4.1 Add failing component tests for semantic view tabs, counts/disabled reasons, card select-expand-collapse-switch behavior, task preview, dependency highlighting/text, and canvas controls.
- [x] 4.2 Implement the Roadmap/Specs selector and desktop/tablet Canvas Focus card/connector/control presentation while preserving the existing Roadmap.
- [x] 4.3 Add failing accessibility/responsive tests for roving spatial focus, Home/End, Enter/Space, reduced motion, graph summary/live announcements, screen-reader dependency text, touch targets, and mobile vertical groups.
- [x] 4.4 Implement keyboard/touch/accessibility behavior, mobile below-768 fallback, loading/empty/error/stale/partial/integrity states, and dense/archived/group controls.
- [x] 4.5 Add and verify a 30+ specification fixture with multiple scopes, three chains, independent/archived/cyclic work, unassigned tasks, mixed task counts, and partial data.

## 5. Documentation And Completion Gates

- [x] 5.1 Update static data plus README, file structure, context, audit, agent verification/runbook, and OpenSpec task evidence without changing scanned projects.
- [x] 5.2 Run targeted scanner/config/model/state/component/geometry suites, `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.
- [x] 5.3 Run and record the dark/light browser matrix at 1280×720, 1024×768, and 390×844, including dense fixture, keyboard/focus, drawer return, connector geometry, overflow, and console checks.
- [x] 5.4 Perform a spec-compliance and code-quality self-review, resolve findings through failing regression tests, and leave the complete unarchived change ready for human acceptance.
