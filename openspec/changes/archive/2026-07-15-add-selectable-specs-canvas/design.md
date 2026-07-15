## Context

Projects Viewer currently derives roadmap phases in `scan-projects.mjs`, maps them into a dedicated pure timeline model, and restores versioned project/tab/drawer state in `src/uiState.ts`. Specification documents are scanned only as a supporting list and the scanner enters `.openspec/` but not `openspec/`. Project configuration has safe canonical saved roots and CRUD validation, but it has no per-view documentation source contract.

The approved product design is `docs/superpowers/specs/2026-07-11-selectable-roadmap-specs-canvas-design.md`. The implementation must preserve the existing Roadmap timeline, use configured saved projects only, treat scanned trees as read-only, and support dense spatial layouts without making dependency claims absent explicit evidence.

## Goals / Non-Goals

**Goals:**

- Extract an immutable, evidence-backed Specs work model from configured local documentation.
- Select and persist Roadmap or Specs independently per stable project id with safe fallbacks.
- Render a deterministic desktop/tablet canvas and mobile dependency-aware list with complete keyboard and screen-reader equivalents.
- Route directed dependency lines through free canvas space with measurable port and obstacle-clearance guarantees.
- Keep scanner, normalization, layout/routing, interaction state, and rendering independently testable.

**Non-Goals:**

- Editing scanned projects, specification/task state, dependency metadata, or card positions.
- Inferred dependencies, ownership, ordering, dates, groups, or people.
- Collaborative whiteboard behavior, cloud services, remote models, auth, arbitrary path scanning, or command execution.
- Replacing or altering the accepted Roadmap timeline semantics.
- Solving the separate Manage Projects dirty-dismissal change.

## Decisions

### 1. Extend the generated project contract, then normalize in a pure frontend module

`scan-projects.mjs` will emit `specWork` with source-backed specification identities, owned tasks, explicit dependency ids, unassigned tasks, integrity issues, and partial-state evidence. `src/specs/model.ts` will convert this scanner contract into stable render keys, progress, lifecycle/dependency separation, validated edges, current identity, and deterministic display groups.

This keeps Markdown/frontmatter parsing and filesystem policy on the server side while keeping visual semantics pure and unit-testable. Reusing `ProjectTimelineModel` was rejected because graph dependency state and unassigned work are not roadmap concepts.

### 2. Parse a deliberately small YAML frontmatter subset without adding a general YAML dependency

The scanner will parse only the approved `work.id`, `work.dependsOn` string list, and optional `work.group` from the identity document frontmatter. Unsupported or malformed shapes produce integrity evidence and no dependency rather than permissive coercion. A general YAML package was rejected because this feature needs a narrow contract, unknown keys are ignored, and avoiding a parser dependency reduces attack and maintenance surface.

### 3. Validate configured documentation roots during canonical config mutation

Optional `defaultView` and `documentationViews.<view>.roots` are normalized as forward-slash, project-relative paths. Validation rejects empty path segments, absolute paths, traversal, non-directories, and realpath/symlink escape before atomically saving the project. Scanner requests never accept roots; `runScan()` receives them only through `readProjectConfig()`.

Per-view roots filter the already safe Markdown scan for that view. An empty/missing roots list uses mixed classification. This extends the canonical config boundary instead of creating an ad hoc scan endpoint.

### 4. Store presentation state by stable project id in UI-state schema version 2

The UI state will store per-project selected view, selected spec key, zoom, pan, filters, and collapsed completed/groups; history snapshots include the active project's view and focus. Deserialization migrates version 1 safely. Resolution order is saved valid choice, configured valid default, only available view, Roadmap tie-breaker, then shared empty state.

Invalid/stale identities are reconciled deterministically and generate a transient notice. Persisted state contains no paths.

### 5. Use deterministic layered layout plus rectilinear obstacle routing

`src/specs/layout.ts` assigns topological columns, stable lanes, and independent regions from graph depth, explicit group/source scope, card size, and stable key. The selected/current card is translated into the focus region without changing relative topology. Cyclic nodes are excluded from topological ordering and placed in an explicit integrity lane.

`src/specs/routing.ts` creates horizontal edge-port routes on a rectilinear visibility grid built from card bounds inflated by 4 CSS pixels. Dijkstra/A* chooses the shortest deterministic route with bend penalties; endpoint ports are exempt only for their own cards. Labels occupy a verified free segment or move to a dedicated gap. SVG renders behind cards and is `aria-hidden`.

Straight Bézier connectors were rejected because they cannot guarantee obstacle clearance. Persisted manual positions were rejected because they would turn the read-only surface into a graph editor and make rescans unstable.

### 6. One semantic component model with desktop canvas and mobile list renderers

`SpecsCanvas` owns selection/expansion, roving focus, controls, notices, and drawer actions. Desktop/tablet uses positioned cards and SVG routes inside a locally pannable viewport. Below 768 px it renders the same model as dependency chains plus an independent section; essential content never requires two-dimensional pan.

Cards use buttons for their primary action, task/detail controls remain separately focusable, dependencies are repeated in visible/accessible text, and live announcements report expansion. DOM order is deterministic and keyboard arrow navigation uses nearest geometry on canvas and ordered neighbors on mobile.

### 7. Search and drawer use stable descriptors rather than DOM references

Search hits add `specification` and `spec-task` descriptors with project id, owner key, task key, and source evidence. Navigation first resolves project/view/model state, then focuses the stable control id. Drawer close resolves the current DOM node by stable id, so refresh replacement does not lose return focus.

### 8. Dense fixtures and geometry helpers are first-class verification inputs

Pure geometry assertions will test port deviation, inflated-rectangle intersections, label clearance, card overlap, deterministic re-layout, and page overflow. A 30+ card fixture covers multiple groups, chains, independent/archived/cyclic work, unassigned tasks, task expansion, and partial data. Browser verification runs dark/light at 1280×720, 1024×768, and 390×844.

## Risks / Trade-offs

- [Narrow frontmatter parser rejects valid-but-complex YAML] → Document the supported subset, emit an integrity notice, and never infer a fallback dependency.
- [Obstacle routing becomes expensive for dense graphs] → Route only visible edges, use deterministic bounded grids, collapse accepted/archived regions, and disclose partial/collapsed counts.
- [Card measurement changes after fonts or expansion] → Measure after layout, recompute positions/routes in a layout effect, and publish the final frame only after geometry is coherent.
- [Versioned persistence can restore removed data] → Validate every restored id against the new model and fall back with a concise notice.
- [Configured roots can expand filesystem access] → Require canonical saved config, realpath containment, no symlink following, atomic rejection, and negative side-effect tests.
- [Canvas accessibility diverges from visual layout] → Use deterministic DOM order, accessible dependency text, roving focus tests, and a mobile list that shares the same semantic model.

## Migration Plan

1. Add optional config and generated-contract fields so existing config and static fixtures remain valid.
2. Add scanner extraction and pure model behind the unavailable Specs selector until tests pass.
3. Upgrade UI-state deserialization with v1 migration and introduce the selector/fallback behavior.
4. Add Canvas Focus, search/drawer integration, dense behavior, responsive renderer, and geometry checks.
5. Regenerate the checked-in static fallback, update documentation, and run the full automated/browser matrix.

Rollback removes the optional fields and Specs renderer while versioned state deserialization ignores unknown v2 fields. Scanned projects require no migration because they are never written.

## Open Questions

None. The approved design fixes the dependency syntax, selection priority, responsive behavior, accessibility contract, geometry tolerances, and safety boundaries required for implementation.
