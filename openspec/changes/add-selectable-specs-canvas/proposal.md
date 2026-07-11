## Why

Projects Viewer promotes roadmap phases as the only primary work visualization, so spec-first projects appear empty or secondary even when OpenSpec changes, accepted specifications, and their tasks are the actual work source of truth. The dashboard needs a selectable, persistent Specs view that preserves the accepted Roadmap while representing only evidenced specification ownership and dependencies inside the existing local-only, read-only boundary.

## What Changes

- Add a per-project primary `Roadmap` / `Specs` view selector with deterministic availability fallback, configured default, versioned persistence, browser-history restoration, and search/deep-link routing.
- Extend saved project configuration with optional `defaultView` and validated project-relative documentation roots for each view; reject traversal, absolute paths, and symlink escapes atomically before scanning.
- Extend the scanner and shared data contract to recognize both `openspec/` and `.openspec/`, configured generic specifications, owned and unassigned tasks, lifecycle/progress evidence, and explicit YAML `work.id`, `work.dependsOn`, and `work.group` metadata.
- Build a pure specification presentation model that keeps lifecycle and dependency state separate, validates missing/self/cyclic dependencies, preserves partial/integrity evidence, and never infers order or ownership.
- Add a responsive Canvas Focus UI with deterministic Trello-like cards, task previews, obstacle-aware directed connectors, zoom/pan/fit/center controls, dense-project handling, mobile dependency groups, keyboard spatial navigation, reduced-motion support, and accessible text equivalents.
- Integrate specification and task results with global search and the existing read-only drawer, including exact focus return after refresh.
- Add scanner, contract, pure-model, state, component, dense-fixture, accessibility, and geometry regression coverage plus a dark/light browser acceptance matrix.

## Capabilities

### New Capabilities

- `documentation-view-sources`: Saved per-view source configuration, safe root validation, mixed-repository classification, and scanner extraction for specification work.
- `selectable-primary-work-view`: Deterministic per-project Roadmap/Specs selection, persistence, history, fallback, loading/error/stale/partial states, and search routing.
- `spec-work-model`: Immutable specification/task/dependency presentation contract, evidenced ownership and dependency semantics, progress, integrity validation, and deterministic dense-project behavior.
- `specs-canvas`: Responsive Canvas Focus cards, task interactions, routed connectors, controls, geometry guarantees, keyboard/touch/screen-reader accessibility, and drawer integration.

### Modified Capabilities

None. Existing accepted `ai-context` and `ai-findings` requirements are not changed.

## Impact

- Scanner and config: `scan-projects.mjs`, `server/project-config.mjs`, `server.mjs`, generated/static project data, and their tests.
- Shared contracts and state: `src/types.ts`, `src/uiState.ts`, search/drawer descriptors, and new pure spec model/layout/routing modules.
- UI: `src/App.tsx`, Manage Projects, Global Search, Detail Drawer integration, new Specs Canvas components, and theme/responsive styles.
- Verification and documentation: new dense fixtures and geometry/component suites; README, repository map, context, audit, operations/verification guidance, and OpenSpec state.
- No new cloud, auth, remote-model, command execution, arbitrary-path, scanned-project write, or persisted card-position capability is introduced.
