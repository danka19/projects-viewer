# Selectable Roadmap And Specs Canvas Design

Status: approved by the human owner on 2026-07-11 for OpenSpec proposal and implementation.

Date: 2026-07-11.

## 1. Problem

Projects Viewer currently promotes only roadmap phases into the primary project visualization. Specifications are available only as a secondary Knowledge list, even when a project has no canonical roadmap and specifications or tasks are its main source of work truth.

This produces three failures:

- spec-first projects appear empty or less useful despite having active and completed work;
- local developer roadmaps can be mistaken for the canonical analytics plan when both documentation types exist;
- specifications, their tasks, and explicit prerequisites cannot be understood spatially at a glance.

`teamSsdCli` is the representative spec-first analytics case. The application must also support repositories where roadmap and specification documentation live together.

## 2. Confirmed Product Decisions

The human owner has confirmed the following decisions:

1. The primary project visualization supports both `Roadmap` and `Specs` views.
2. A specification or OpenSpec change is the top-level work unit analogous to a roadmap phase.
3. Tasks owned by that specification are its nested steps.
4. Specifications are independent by default and must not be placed on one implied sequential timeline.
5. A specification dependency exists only when source documentation explicitly declares it.
6. An unsatisfied prerequisite blocks dependent work.
7. The application supports both configured per-view documentation roots and mixed repositories classified by document type.
8. The selected primary view is remembered separately for each project.
9. On first visit, a configured valid `defaultView` wins. Without configuration or saved state, a project containing both views opens `Roadmap` for backward compatibility.
10. `Specs` uses a polished `Canvas Focus` presentation: Trello-like work cards on a mindboard canvas.
11. Dependency connectors are dedicated directed lines rendered behind cards. They attach to visible edge ports, route through free space, and never pass through cards.

## 3. Goals

- Make projects useful when they contain specifications but no roadmap.
- Let the user switch the promoted primary visualization between Roadmap and Specs.
- Preserve the accepted roadmap timeline without forcing specification work into roadmap semantics.
- Present specification status, progress, tasks, evidence, and dependencies at a glance.
- Support separate analytics/developer documentation roots and mixed repositories.
- Preserve read-only, local-only, configured-project safety boundaries.
- Scale from a few specifications to dense analytics repositories.
- Keep the experience keyboard-, touch-, and screen-reader-operable.

## 4. Non-Goals

- No editing, moving, completing, or reordering specifications or tasks.
- No persisted free-form card positioning or collaborative whiteboard behavior.
- No inferred dependency from file order, numbering, dates, names, semantic similarity, or agent judgment.
- No automatic conversion of every open task into a fabricated specification.
- No cloud sync, remote model call, auth, arbitrary path request, shell command, or write into scanned projects.
- No replacement of the accepted Roadmap timeline behavior.
- No implementation of the separate Manage Projects backdrop/dirty-confirmation change in this feature.

## 5. Primary View Selection

### 5.1 View control

The primary visualization header contains a semantic `View` selector with:

- `Roadmap` and its detected phase count;
- `Specs` and its detected specification count.

Both choices remain visible so the user understands what the project contains. An unavailable choice is disabled and exposes a concise reason such as `No roadmap detected` rather than disappearing silently.

### 5.2 Selection priority

For each selected project, resolve the initial view in this order:

1. a valid explicit per-project user choice restored from versioned UI state;
2. a valid configured `defaultView`;
3. the only view that contains structured data;
4. `Roadmap` when both views contain data and neither prior choice exists;
5. a shared primary-work empty state when neither view contains structured data.

If a saved choice becomes unavailable after a rescan, fall back to the available view and disclose the reason. Never render a false empty state merely because stale UI state selected a removed source.

### 5.3 Persistence and navigation

- Persist the selected view by stable project id, never globally.
- Include the selected view in versioned history/UI state so Back and Forward restore it.
- Switching projects restores that project's valid choice without leaking another project's state.
- Search/deep-link navigation to a roadmap phase or specification selects the matching view before focusing the item.

## 6. Documentation Source Configuration

### 6.1 Supported source strategies

Each project view may optionally declare project-relative source roots:

```json
{
  "defaultView": "roadmap",
  "documentationViews": {
    "roadmap": {
      "roots": ["docs/roadmap", "docs/phases"]
    },
    "specs": {
      "roots": ["analytics", "openspec"]
    }
  }
}
```

Rules:

- A view with configured roots reads only matching documentation under those roots.
- A view without configured roots uses mixed-repository classification over the project's already allowed documentation scan.
- Roadmap and Specs may use different strategies in the same project.
- Roots are normalized project-relative paths. Absolute paths, `..` traversal, symlink escape, and paths outside the saved project root are invalid.
- Browser requests cannot submit source roots for ad hoc scanning. Roots enter runtime only through validated saved project configuration.

### 6.2 Classification precedence

1. Explicit configured view root.
2. Exact supported structure.
3. Existing safe document classifier.
4. Ambiguous documents stay in Knowledge and produce an integrity notice; they are not promoted into either primary model.

Supported exact specification structures include:

- `openspec/changes/<change-id>/`;
- `.openspec/changes/<change-id>/`;
- `openspec/specs/<capability>/`;
- `.openspec/specs/<capability>/`;
- configured generic specification documents and folders;
- existing safely classified SDD/spec/proposal/design documents.

Both `openspec/` and `.openspec/` must be recognized. The current scanner's narrower `.openspec`-only change aggregation is insufficient for this feature.

### 6.3 Configuration UI and API

Manage Projects adds a per-project `Documentation views` editor containing:

- `Default view`: Roadmap or Specs;
- zero or more project-relative Roadmap roots;
- zero or more project-relative Specs roots;
- visible explanation that an empty root list means automatic mixed-repository classification;
- explicit Save and Cancel actions.

`PATCH /api/projects/:id` accepts validated `defaultView` and `documentationViews` fields. The server normalizes every root, verifies that it resolves inside the saved project root, rejects invalid roots atomically, and never scans a request-provided root before it has been saved successfully. Existing project configs remain valid because all new fields are optional.

Static mode displays the saved values and explanation but disables mutation. The separate safe modal-dismissal change remains responsible for dirty confirmation across backdrop, Escape, and Close; this feature must not introduce a second conflicting dismissal implementation.

## 7. Presentation Data Contract

The React canvas consumes an immutable presentation model. It never scans prose or invents status, ownership, grouping, or dependency.

```text
PrimaryWorkViewModel
  projectId
  revision
  generatedAt
  sourceMode: live | static | stale
  selectedView: roadmap | specs
  roadmap: ProjectTimelineModel | null
  specs: SpecCanvasModel | null
  integrityIssues[]

SpecCanvasModel
  projectId
  revision
  specifications[]
  dependencies[]
  unassignedTasks[]
  explicitCurrentSpecKey: string | null
  progress
  isPartial

SpecWorkItem
  key
  id
  name
  kind: openspec-change | accepted-capability | generic-spec
  lifecycleStatus
  dependencyState: clear | blocked | invalid | unknown
  confidence
  source
  sourceScopeId
  explicitGroupId: string | null
  progress
  tasks[]
  dependsOnKeys[]

SpecTask
  key
  id: string | null
  name
  status
  source
  order

SpecDependency
  key
  prerequisiteKey
  dependentKey
  label
  sourceEvidence[]
  state: satisfied | unsatisfied | invalid | unknown
```

Stable keys must use durable source identity and must not depend on array index.

## 8. Specification And Task Semantics

### 8.1 Specification identity

- One active OpenSpec change is one specification card.
- One accepted capability specification is one accepted/reference card.
- One configured generic specification document is one card when it has a stable source identity.
- Archived changes remain available through an explicit completed/archived group or filter and must not silently inflate active-work counts.

### 8.2 Task ownership

A task belongs to a specification only when ownership is evidenced by:

- the task residing in that specification's artifact set, such as its `tasks.md`;
- explicit supported metadata referencing the specification id;
- a configured source rule that unambiguously assigns the task document.

Tasks without evidenced ownership appear in a separate `Unassigned work` region. They do not become fake specifications and do not participate in the dependency graph.

### 8.3 Progress

- Specification progress is resolved eligible tasks divided by all eligible tasks, rounded to the nearest integer.
- Cancelled and superseded tasks are excluded.
- Blocked and deferred tasks remain incomplete in the denominator.
- When no eligible tasks exist, progress is unknown, not zero.
- Explicit accepted/closed/archived specifications may display 100 percent with lifecycle evidence.
- Project Specs progress is the mean of known eligible specification progress values and discloses the number with unknown progress.

Lifecycle status and dependency state remain separate. A planned specification blocked by a prerequisite stays lifecycle `planned` and additionally exposes dependency `blocked`.

### 8.4 Current and selected identity

- `explicitCurrentSpecKey` is set only when trusted lifecycle data identifies exactly one in-progress specification.
- Zero in-progress specifications means no current spec.
- Multiple in-progress specifications are valid parallel work; they produce no fabricated singular current spec and are all visibly active.
- The user-selected card is presentation state and never changes lifecycle truth.
- On initial load, center the explicit current spec when one exists. Otherwise restore a valid saved selection; if neither exists, use `Fit all` without inventing focus.

## 9. Dependency Contract

### 9.1 Evidence requirement

A dependency is valid only when a supported source explicitly identifies both the dependent and prerequisite specification ids.

The canonical declaration is YAML frontmatter in the specification's identity document:

```yaml
---
work:
  id: ranking-rules
  dependsOn:
    - search-contract
  group: search-capability
---
```

Identity documents are:

- `proposal.md` for an OpenSpec change;
- `spec.md` for an accepted capability;
- the generic specification document itself for a generic spec.

`work.id` is required when `dependsOn` is present. Each `dependsOn` entry is a stable specification id. `work.group` is optional and is the only source-defined semantic cluster label unless a configured source-scope label exists. If multiple artifacts for one specification contain `work` frontmatter, the identity document wins and contradictory secondary declarations produce an integrity issue. Unknown frontmatter keys are ignored safely and preserved only as source evidence; the dashboard never rewrites the document.

The scanner must not infer dependencies from:

- file order or folder nesting;
- numeric prefixes;
- task order;
- modification dates;
- similar words or names;
- lifecycle status;
- an LLM or heuristic guess.

### 9.2 Direction

`dependent.dependsOn(prerequisite)` renders a directed connector:

```text
prerequisite -> dependent
```

The card also exposes visible text:

- prerequisite: `Enables <dependent>`;
- dependent: `Requires <prerequisite>`;
- unsatisfied dependent: `Blocked by <prerequisite>`.

### 9.3 Satisfaction

By default a prerequisite is satisfied only when its lifecycle is explicitly final: accepted, closed, done, or archived. `pending_acceptance` remains implementation-complete but does not silently satisfy a hard dependency because the human gate is unresolved.

### 9.4 Invalid dependencies

- Missing prerequisite target: mark the edge invalid and show the unresolved id.
- Self-dependency: mark invalid and do not calculate blocking from it.
- Cycle: mark every involved card `dependencyState: invalid`, disclose the cycle, and do not pretend there is a valid execution order.
- Contradictory duplicate declarations: retain evidence, deduplicate the visual edge, and disclose the integrity conflict.

## 10. Canvas Focus UI

### 10.1 Composition

The Specs view uses a read-only mindboard canvas containing Trello-like cards:

- the explicit active or selected specification receives the strongest focus;
- immediate prerequisites appear upstream;
- immediate dependents appear downstream;
- independent specifications occupy separate unconnected regions;
- named clusters appear only from explicit group/source-scope evidence;
- absence of a connector means no known dependency or execution order.

The canvas is not a graph editor. Users pan and inspect it but cannot drag cards into persisted positions.

Deterministic placement rules:

1. validate the dependency graph and compute stable topological layers for acyclic nodes;
2. place the explicit current or user-selected card in the focus region;
3. place its ancestors upstream and descendants downstream by dependency depth;
4. place other dependency chains in stable lanes ordered by explicit group/source scope and stable key;
5. place independent nodes in explicitly labeled groups or an unlabeled independent region;
6. break every otherwise-equal layout tie by stable key, never by scan arrival order;
7. after card expansion, recompute positions and connectors from the same deterministic inputs.

### 10.2 Card content

Collapsed card:

- lifecycle status text and non-color cue;
- specification name;
- progress count and bar when known;
- source/scope label;
- dependency summary;
- owner only when source data explicitly provides one.

Expanded card:

- all collapsed content;
- ordered task preview;
- completed, current/active, blocked, and planned task cues;
- up to six directly visible tasks;
- `N more tasks` and a Details action when additional tasks exist.

Task preview selection is deterministic:

- six or fewer tasks: show all in source order;
- explicit current task: show a source-order window of up to six containing that task, with up to two preceding tasks when available;
- no explicit current task with unresolved work: show the first six unresolved tasks in source order;
- all tasks resolved: show the final six tasks in source order;
- always show the true total and hidden count.

Missing owner, dates, tasks, or progress are omitted or labeled unknown. Placeholder people or fabricated dates are forbidden.

### 10.3 Card interaction

- Activating a collapsed card selects and expands it.
- Activating the expanded card again collapses it while preserving selection.
- Activating another card moves selection and expansion to that card.
- Only zero or one card is expanded.
- Selecting a card highlights its incoming/outgoing connectors and immediate neighbors while keeping unrelated cards readable.
- A task activation opens the existing read-only detail drawer with source evidence.
- A separate Details action opens full specification evidence and all tasks.
- Drawer close returns focus to the exact originating card or task control, including after a live refresh replaces the DOM node.

### 10.4 Connector geometry

Connectors are rendered in an SVG or equivalent line layer behind cards.

Required geometry:

- endpoints attach to visible ports on the relevant card edges;
- arrowheads communicate prerequisite-to-dependent direction;
- routes use free canvas space and treat every non-endpoint card rectangle as an obstacle;
- a connector or its label must not intersect a non-endpoint card;
- labels must fit wholly inside the gap they annotate;
- connector halos preserve contrast against the canvas grid;
- unrelated connectors remain restrained; selected-card connectors receive stronger emphasis;
- independent cards render no connector.

Implementation acceptance tolerances:

- connector endpoints land within 2 CSS pixels of their assigned ports;
- connector paths and labels maintain at least 4 CSS pixels of clearance from non-endpoint card rectangles;
- no dependency label overlaps any card;
- card expansion triggers deterministic re-layout and re-routing before the final frame is presented;
- no line animation is required to understand the relationship.

If routing all connectors without crossings is impossible, crossings between lines may remain, but card intersections are never allowed. Selection must isolate the relevant path so a crossing cannot make the dependency ambiguous.

### 10.5 Canvas controls

Provide:

- zoom out, current percentage, zoom in;
- `Fit all`;
- `Center active` when an explicit active specification exists;
- local horizontal/vertical pan without page-level overflow.

Zoom range is 50–150 percent in deterministic increments. Controls are buttons, not pointer-only gestures. Touch pinch and empty-canvas drag may supplement but never replace the controls.

## 11. Dense Projects And Large Task Sets

- Active, blocked, pending-acceptance, and invalid specifications stay visible by default.
- Accepted/archived specifications may collapse into an explicit counted region; expanding it restores every card.
- Counts always reflect the full result, not only currently rendered cards.
- Explicit source scopes/groups may collapse independently.
- More than 24 visible cards activates compact metadata and a `Fit all` recommendation.
- Scanner caps remain disclosed through `isPartial`; reaching a cap never appears as a complete graph.
- A card with more than six tasks shows the most relevant ordered preview plus the true remaining count; the drawer contains the full scanned task list.
- Filters may narrow lifecycle or source scope, but active filters are always visible and resettable.

## 12. Responsive Behavior

### Desktop and tablet

- Canvas Focus remains spatial and locally pannable.
- The page itself must not gain horizontal overflow.
- Cards retain readable minimum width and do not overlap after expansion.

### Mobile below 768 px

- Replace freeform canvas positioning with dependency-aware vertical groups.
- Preserve card treatment and task expansion.
- Render vertical connectors only within explicit dependency chains.
- Show independent cards in a clearly labeled unconnected section.
- Dependency text remains visible so meaning does not depend on the line.
- Do not require two-dimensional panning to reach essential information.

## 13. Accessibility

- The primary view selector uses semantic tabs or an equivalent single-select control with visible focus and accurate selected state.
- The Specs surface is a named region with a concise graph summary.
- Cards use semantic buttons/controls and roving focus scoped to the canvas.
- Arrow keys move to the nearest card in the requested spatial direction; Home focuses the first root/independent card and End the last reachable card in deterministic DOM order.
- Enter/Space toggles expansion.
- Dependency SVG lines are decorative to assistive technology.
- Every dependency is repeated as accessible text on the related cards.
- Each card exposes lifecycle, dependency state, known progress, task count, and expansion state in its accessible name/description.
- Expansion changes are announced politely without moving focus.
- Reduced-motion mode disables animated pan, zoom, card reflow, and connector transitions.
- Status and dependency never rely on color alone.
- Focus remains visible at every zoom level.

## 14. Loading, Empty, Error, Stale, And Partial States

### Loading

- Initial loading shows non-interactive canvas/card skeletons and `aria-busy="true"`.
- No fake status, progress, dependency, or card title is announced.

### Successful empty view

- Roadmap empty with Specs available: switch to Specs and disclose `No roadmap detected — showing Specs`.
- Specs empty with Roadmap available: switch to Roadmap and disclose `No specifications detected — showing Roadmap`.
- Both empty: show one primary-work empty state with source guidance; render no empty axis or canvas.
- Specification without tasks: show `No tasks documented`; progress remains unknown.
- Tasks without owning specification: show `Unassigned work`, never a fabricated spec card.

### Error and stale data

- Initial model error shows a safe message and Retry only in live mode.
- Refresh error retains the prior graph, selected card, expansion, pan, and zoom when compatible, and marks the view stale.
- Removed selected ids fall back deterministically with a concise notice.

### Partial and integrity states

- Truncated inputs show a visible partial-data warning.
- Ambiguous classification, missing dependency target, cycle, duplicate id, or invalid root produces an evidence-backed integrity notice.
- Integrity failure never causes the component to invent current work or dependency order.

## 15. Search, Drawer, And Knowledge Integration

- Global search indexes specification name, id, task names, explicit group, lifecycle, and source path.
- Opening a specification result selects the project, activates Specs view, centers/selects the card, and opens details when requested.
- Opening a task result activates Specs view, expands its owner card, and focuses or opens the task.
- Generic spec documents remain available in Knowledge even when they also produce a structured card.
- The existing SDD/Specs Knowledge surface becomes a supporting document list, not a competing primary representation.

## 16. Safety Boundaries

- Scanner input remains restricted to enabled projects from canonical saved config.
- Source roots are saved, normalized, and validated before scan.
- UI state stores ids, view, focus, pan, zoom, and filters only; it never stores arbitrary filesystem paths supplied by the browser.
- All canvas, expansion, filter, and focus actions are presentation-only.
- No interaction writes to a scanned project, changes task/spec status, invokes a model, starts agent work, runs a command, creates commits, or calls a remote service.

## 17. Automated Verification

### Scanner and contract fixtures

Cover:

- roadmap-only project;
- spec-only project;
- mixed repository;
- separate configured Roadmap and Specs roots;
- one view scoped and the other auto-classified;
- both `openspec/` and `.openspec/` layouts;
- generic spec document with owned tasks;
- task-only project with Unassigned work;
- explicit dependency chain and branch;
- missing target, self-edge, duplicate edge, and cycle;
- no dependency inference from order, numbers, names, or dates;
- invalid/outside source roots rejected without scanning arbitrary paths.

### Pure presentation model

Cover stable keys, lifecycle/dependency separation, progress, unknown progress, explicit current/null, groups, archived collapse counts, partial data, deterministic layout input, and stale-state reconciliation.

### Component interaction

Cover:

- view selection priority and per-project persistence;
- stale saved-view fallback;
- first-visit Roadmap tie-breaker;
- card expand, repeat collapse, and card switching;
- task and details drawer focus return;
- selected dependency highlighting;
- pan, zoom, Fit all, and Center active;
- keyboard spatial navigation and reduced motion;
- loading, empty, task-only, error, stale, partial, no-tasks, and integrity states;
- screen-reader dependency text independent of SVG.

### Geometry regression

Use representative mixed-height cards and branching dependencies to assert:

- endpoint-to-port deviation at most 2 px;
- at least 4 px clearance from every non-endpoint card;
- zero connector-label/card intersections;
- zero card/card intersections after expansion;
- zero page-level horizontal overflow.

## 18. Browser Acceptance Matrix

Verify dark and light themes at minimum:

- 1280 × 720 desktop;
- 1024 × 768 tablet;
- 390 × 844 mobile.

For each matrix point verify:

- primary view selection and fallback;
- readable card hierarchy;
- task expansion;
- dependency direction and non-overlapping connector geometry;
- pan/zoom or mobile vertical fallback;
- visible focus and complete keyboard operation;
- exact drawer focus return;
- no clipped essential content;
- no page-level horizontal overflow;
- no console errors or warnings.

Also verify a dense fixture with at least 30 specifications, multiple source scopes, 3 dependency chains, independent work, archived work, a cycle, and one task-only source.

## 19. Acceptance Criteria

The feature is acceptable when all of the following are true:

1. The user can switch the primary visualization between Roadmap and Specs.
2. The selected view persists per project and restores through browser history.
3. The documented selection priority and fallbacks are deterministic.
4. A spec-only project opens useful structured work without requiring a roadmap.
5. Configured source roots and mixed classification both work without arbitrary path access.
6. Each specification is one top-level card and its evidenced tasks are nested work.
7. Unowned tasks remain explicitly unassigned.
8. Independent specifications have no implied order and no connector.
9. Only explicitly evidenced dependencies produce connectors and blocking.
10. Missing targets, self-edges, and cycles are disclosed rather than guessed away.
11. Canvas Focus uses substantial Trello-like cards consistent with Projects Viewer styling.
12. The selected/active specification, its prerequisites, and its dependents are understandable at a glance.
13. Every connector attaches to ports, has direction, and avoids all non-endpoint cards.
14. Connector labels do not overlap cards.
15. Expanding a card cannot produce card or connector collisions.
16. Large projects disclose complete counts and partial/collapsed state.
17. Mobile provides a dependency-aware vertical alternative without two-dimensional navigation.
18. Keyboard and assistive technology can obtain every status, task, and dependency conveyed visually.
19. Loading, empty, task-only, no-tasks, error, stale, partial, and integrity states are distinct.
20. Search and drawer navigation enter the correct project, view, card, and task context.
21. Scanned projects remain read-only and all current local-only safety boundaries remain intact.
22. Focused tests, full tests, production build, strict OpenSpec validation, geometry checks, and browser matrix pass.
23. The human owner accepts that the Canvas Focus view looks like a finished Trello-plus-mindboard product rather than a diagram or wireframe.

## 20. Implementation Boundaries

The implementation should introduce separate modules for:

- scanner/source classification and dependency extraction;
- pure spec-work normalization;
- deterministic graph layout and obstacle-aware routing;
- Specs canvas presentation and interaction state;
- primary-view selection/persistence;
- geometry verification helpers.

Do not overload the accepted roadmap `ProjectTimelineModel` with specification-only graph semantics. Roadmap and Specs share lifecycle/status primitives and drawer infrastructure, but each keeps its own presentation model.

## 21. Documentation And OpenSpec Follow-Up

After human approval of this design:

1. create a dedicated OpenSpec change for selectable primary views and the Specs Canvas;
2. reproduce the accepted YAML frontmatter dependency syntax in the OpenSpec data-contract requirements;
3. create an implementation plan with scanner/data-contract work before UI work;
4. keep the Manage Projects safe backdrop-dismissal requirement in a separate bounded change;
5. update roadmap/audit/file-structure documentation only as implementation changes their truth.
