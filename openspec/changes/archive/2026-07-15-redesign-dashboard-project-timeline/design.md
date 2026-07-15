## Context

Projects Viewer is a local-only, read-only dashboard over generated documentation scan data. The current roadmap presentation in `src/components/RoadmapTimeline.tsx` is a vertical list with an aggregate bar, expandable evidence, and optional step lists. It exposes useful source/confidence information, but it does not make the project's lifecycle position visually obvious and it sits behind a secondary Roadmap tab.

The supplied reference demonstrates two states of one component: a collapsed horizontal phase axis and an expanded current phase with a nested step axis. Only that composition and interaction model is relevant. Projects Viewer keeps its existing dark/light theme tokens, status vocabulary, typography rules, read-only evidence drawer, and local safety boundaries. Names, dates, people, avatars, blue palette, zoom controls, navigation shell, and test data from the reference are not part of this design.

The UX audit also found that current generated state can include false next actions, blockers, and tasks from agent rules or historical plans. The timeline therefore consumes an explicit presentation model with source/confidence and integrity signals; it must not infer a current phase or step from arbitrary text inside the component.

## Goals / Non-Goals

**Goals:**

- Make completed, current, and future roadmap position understandable without reading a vertical document inventory.
- Put the current phase and current step near the visual center on first presentation whenever they exist.
- Let the user inspect one phase at a time and reveal its steps without navigating away from project status.
- Preserve all supported phase/step lifecycle states, source evidence, confidence, parser/documentation issue indicators, and read-only details.
- Define deterministic interaction, progress, overflow, responsive, fallback, and accessibility behavior.
- Fit the component into the dashboard redesign as the primary visual status surface for the selected project.
- Keep the implementation decomposable and testable without adding a visualization library.

**Non-Goals:**

- No task editing, drag-and-drop, phase reordering, schedule editing, ownership management, or writes to scanned projects.
- No Gantt durations, calendar-scale positioning, critical-path calculation, dependency graph, zoom control, or date arithmetic.
- No copying of the reference application's shell, light palette, people, dates, labels, icons, or sample content.
- No automatic repair of scanner false positives inside the UI component.
- No replacement of the existing detail drawer or evidence model.
- No third level below steps.

## Dashboard Integration

The redesigned selected-project experience has this order:

1. Compact project state header: project name, normalized project status, confidence/integrity state, freshness, and one trusted next decision/action.
2. Project Timeline / Roadmap: phase axis always visible; one optional nested step axis.
3. Secondary detail navigation for work, decisions, and knowledge/document evidence.

On a desktop viewport of at least 1280 by 720, the state header and the phase axis must be visible without scrolling when the selected project first opens. The timeline replaces the current vertical roadmap list as the default roadmap visualization. Evidence and related decisions/audits remain available through the existing drawer rather than being expanded inline into long prose.

The broader dashboard redesign remains ordered by trust: state-derivation cleanup precedes promotion of the timeline to the primary dashboard surface. Until the trust gate passes, the component may be implemented behind the existing Roadmap tab for verification, but it must not be presented as authoritative on the overview.

## Component Structure And Hierarchy

The component consists of the following regions in DOM and visual order:

1. **Timeline header**
   - Title `Project timeline` or the localized equivalent.
   - Compact lifecycle summary such as completed, current, waiting for acceptance, and planned counts.
   - Freshness/source indicator when the model is stale, partial, or contains integrity issues.
   - `Jump to current` control only when the current phase exists outside the visible scroll area or after the user has scrolled away.

2. **Phase viewport**
   - One horizontally scrollable viewport with a single non-wrapping ordered list.
   - A continuous axis behind the phase nodes. Resolved segments are solid; future segments are dashed; exceptional lifecycle states use their semantic token and a text/icon label.
   - One phase card aligned to each axis node.
   - Leading and trailing padding allow the first and last phase to be centered.

3. **Expanded phase bridge**
   - A short vertical connector from the expanded phase node to the nested step region.
   - The connector uses selection emphasis, not lifecycle color, so expansion is not confused with status.

4. **Step viewport**
   - Rendered only while a phase is expanded.
   - Separate horizontal scroll viewport with its own ordered list and axis.
   - Step cards are visually smaller than phase cards and expose name, optional ID, status, and progress/evidence summary.
   - The step region includes a visible phase context label so horizontal scrolling does not detach steps from their parent phase.

5. **Legend and accessible summary**
   - Compact legend for only the lifecycle groups present in the current model.
   - Text count accompanies every symbol; color is never the only differentiator.
   - On narrow viewports the legend may collapse into a summary button, but the information remains available to keyboard and assistive-technology users.

6. **Fallback/status region**
   - Loading, empty, error, stale, partial, integrity-warning, and no-steps messages occupy the timeline content area without moving primary page controls unpredictably.

## Visual States

The component uses the existing semantic tokens from `src/index.css` and mappings from `src/statusMeta.ts`.

| Lifecycle status | Phase/step treatment | Axis/node treatment | Required non-color cue |
|---|---|---|---|
| `closed` | Muted resolved card | Solid `ok` segment and filled node | Check icon and `Closed` label |
| `accepted` | Muted resolved card | Solid `ok`/`info` segment and filled node | Check icon and `Accepted` label |
| `in_progress` | Highest lifecycle emphasis | Solid `info` segment; current item additionally receives selection accent ring | `In progress` label and current marker |
| `pending_acceptance` | Implemented but awaiting owner acceptance | Solid `gate` segment and gate node | `Pending acceptance` label and gate icon |
| `blocked` | High-attention card without replacing selection state | `danger` segment/node | `Blocked` label and warning icon |
| `ready` | Future card with stronger readiness than planned | Dashed `info` connector and outlined node | `Ready` label |
| `planned` | Future card | Dashed `line-strong` connector and outlined node | `Planned` label |
| `draft` | Low-confidence future card | Dashed dim connector and outlined node | `Draft` label |
| `deferred` | Muted paused card | Dashed `warn` connector and paused node | `Deferred` label and pause icon |
| `cancelled` | Strongly de-emphasized removed card | Broken dim segment | `Cancelled` label and strike/removed icon |
| `superseded` | Strongly de-emphasized historical card | Broken dim segment | `Superseded` label and replacement icon |

Selection/expansion is orthogonal to lifecycle status. The expanded phase always receives the existing `accent` outline/bridge while retaining its lifecycle badge. The current phase receives `aria-current="step"` and a visible current marker. If the expanded phase is not the current phase, both states remain distinguishable.

Completed phase cards use reduced contrast but keep readable names and statuses. Planned cards use outlines/dashes rather than opacity so they do not appear disabled. Blocked and pending-acceptance phases remain in sequence and are not moved into a separate lane.

## Interaction Decisions

### Initial state

- On project change or first model load, the current phase is centered in the phase viewport.
- If the current phase has steps, it is expanded by default so the current step is visible immediately.
- If the current phase has no steps, it remains selected/expanded and shows the no-steps state.
- If there is no current phase, the viewport centers the transition between the last resolved phase and first eligible future phase. No phase is expanded automatically.
- Restoring component state is allowed only for the same project and same timeline revision; state from another project must not leak.

### Phase click

- Clicking a collapsed phase sets `expandedPhaseId` to that phase and closes the previously expanded phase.
- Clicking the already expanded phase sets `expandedPhaseId` to `null` and removes the step region.
- Switching phases keeps keyboard focus on the newly activated phase button and scrolls that card into view using reduced or no motion when requested by the user.
- Clicking a phase with no steps still expands its phase context area and presents the no-steps message plus `Open phase details`.
- Expansion does not change project data, phase status, progress, or URL-derived project selection.

### Step click

- Clicking a step selects it for visual focus and opens the existing read-only detail drawer with evidence, source file/line, normalized status, rule, and confidence inherited from its phase/model where applicable.
- Closing the drawer returns focus to the originating step button.
- Re-clicking the same step while the drawer is open may refresh/navigate the existing drawer item but must not create a second modal layer.

### User scroll

- Automatic centering runs only on initial load, project change, current-phase change, `Jump to current`, or keyboard focus moving outside the viewport.
- Ordinary model refresh must preserve the user's horizontal position when the selected/expanded IDs still exist.
- The component must not fight manual scrolling by repeatedly recentering the active phase.

## Progress Rules

Progress represents implementation completion, not elapsed time and not schedule adherence.

### Phase progress

- `closed`, `accepted`, and `pending_acceptance` phases report 100% implementation progress. `pending_acceptance` still retains its distinct lifecycle state and is not counted as fully reconciled.
- For a phase with steps, progress is the number of steps in `closed`, `accepted`, or `pending_acceptance` divided by all eligible steps, rounded to the nearest integer.
- `cancelled` and `superseded` steps are excluded from both numerator and denominator.
- `deferred` and `blocked` steps remain in the denominator and are not counted as complete.
- A phase with only cancelled/superseded steps has unknown progress, not 0%.
- `draft`, `planned`, and `ready` phases without steps report 0%.
- `in_progress`, `blocked`, or `deferred` phases without steps report unknown progress; the UI shows status text instead of fabricating a percentage.

### Project roadmap progress

- Eligible phases exclude `cancelled` and `superseded` phases.
- The project implementation percentage is the mean of known eligible phase percentages. Unknown phase percentages are omitted from the arithmetic and disclosed as `N phases without progress evidence`.
- If no eligible phase has known progress, no percentage is shown.
- Lifecycle summary counts are shown alongside progress so 100% implementation with pending acceptance cannot be mistaken for closed/accepted work.

### Rendering

- Percentages are displayed only when the value is known and the basis is `explicit` or `derived-from-steps`.
- Every displayed percentage has an accessible description of its basis.
- The component never derives progress from dates, card order, file modification time, or the visual width of an axis segment.

## Data Model

The presentational component receives one immutable timeline model and emits interaction callbacks. It performs no fetching and does not scan text.

### Timeline model

| Field | Type/constraint | Meaning |
|---|---|---|
| `projectId` | stable string | Saved project identity or stable project path key |
| `revision` | stable string | Changes when ordered phase/step data changes; used to scope restored UI state |
| `generatedAt` | ISO timestamp | Freshness disclosure |
| `sourceMode` | `live`, `static`, or `stale` | Data-source presentation state |
| `currentPhaseId` | phase key or null | Explicit current phase; never inferred by the component |
| `phases` | ordered timeline phase array | Canonical presentation order |
| `integrityIssues` | structured array | Ambiguous/multiple current phases, missing order, duplicate IDs, parser/doc issues |
| `isPartial` | boolean | Indicates scanner limits or incomplete source data |

### Timeline phase

| Field | Type/constraint | Meaning |
|---|---|---|
| `key` | unique stable string | Prefer phase ID plus source identity; never use array index |
| `id` | display string | Human-facing phase identifier |
| `sequence` | finite number | Deterministic ordering independent of DOM order |
| `name` | non-empty string | Phase title |
| `status` | existing `PhaseStatus` | Lifecycle state |
| `statusText` | string | Source prose explaining normalized status |
| `confidence` | `high`, `medium`, or `low` | Trust disclosure |
| `issue` / `issueNote` | existing issue fields | Parser/documentation integrity warning |
| `progress` | value or null plus basis | Precomputed according to progress rules |
| `currentStepId` | step key or null | Explicit current step for this phase |
| `steps` | ordered timeline step array | Child steps |
| `source` | file and line | Read-only evidence target |

### Timeline step

| Field | Type/constraint | Meaning |
|---|---|---|
| `key` | unique stable string | Phase key plus explicit step ID or source file/line fallback |
| `id` | display string or null | Optional documented step identifier |
| `sequence` | finite number | Deterministic child order |
| `name` | non-empty string | Step title |
| `status` | existing `StepStatus` | Lifecycle state |
| `evidence` | string | Concise evidence/status explanation |
| `source` | file and line | Read-only evidence target |

An adapter such as `buildProjectTimelineModel(project)` may initially map existing `PhaseItem[]` and `PhaseStep[]` to this model. The adapter must validate unique keys/order/current IDs and expose integrity issues. It must not choose a current phase from arbitrary checkbox or prose signals. If upstream data does not provide an unambiguous current ID, the model uses null and reports the issue.

## Loading, Empty, Error, Stale, Partial, And No-Steps States

### Loading

- The component container uses `aria-busy="true"` and exposes a single polite loading announcement.
- Skeletons preserve the approximate header, phase-axis, and optional step-axis height without presenting fake status text or interactive buttons.
- Previously rendered trusted data may remain visible with a loading veil during background refresh; it must not be replaced by blank content.

### Empty

- Empty means the data source loaded successfully and contains zero phases.
- Show `No roadmap phases detected`, a concise explanation of recognized roadmap sources, and actions to open Documentation or Manage Projects where available.
- Do not show a 0% progress bar, empty axis, or fabricated planned phase.

### Error

- Show an error title, safe human-readable message, and `Retry` only when live mode can repeat the read/rescan.
- If stale data exists, keep it visible and mark it stale rather than replacing it with the error state.
- Error details may expose the local source/contract code but must not expose secrets or arbitrary filesystem data beyond already authorized project paths.

### Partial or integrity warning

- A partial model or integrity issue renders a visible warning before the axis and an assistive announcement.
- The timeline may remain interactive, but ambiguous items must not receive fabricated current emphasis.
- Source/confidence and `Open details` remain available for diagnosis.

### No steps

- Expanding a phase with zero steps renders a compact child region: `No steps documented for this phase`.
- The region includes phase status/progress basis and `Open phase details`.
- It does not render skeleton step cards or interpret absence of steps as phase completion.

## Large Collections And Horizontal Overflow

- Phase and step rows never wrap into multiple axes.
- Up to seven phase cards may be centered within available desktop width; eight or more use horizontal overflow.
- At more than twelve phases, non-current cards use compact metadata while preserving full accessible names and detail access.
- The model supports the existing scanner limits of up to 100 phases and 300 steps without requiring virtualization in the first implementation. Rendering must remain bounded to those limits and disclose `isPartial` when upstream truncates data.
- The current or newly focused phase/step scrolls into view. User scroll position otherwise remains stable.
- Scroll snapping uses proximity rather than mandatory snapping.
- Visible previous/next edge affordances and `Jump to current` must not obscure card content.
- Mouse wheel/trackpad, Shift+wheel where supported, touch drag, scrollbar, keyboard navigation, and programmatic focus scrolling are supported.
- The component does not include zoom controls; card sizing is responsive and browser zoom remains authoritative.

## Responsive Behavior

### Wide desktop, 1280 px and above

- Phase cards use a 220 px base width; the current/expanded card may use up to 252 px without changing other card positions unexpectedly.
- Step cards use a 184 px base width.
- Header summary and controls share one row when space permits.
- The current phase is centered with at least one neighbor visible on each available side where data exists.

### Tablet, 768-1279 px

- Phase viewport spans the full selected-project content width.
- Cards retain a minimum 208 px width and horizontal scrolling.
- Header controls may wrap to a second row; the axis does not wrap.
- The step viewport is independent from the phase viewport so a long child list does not shift the selected parent offscreen.

### Mobile, below 768 px

- Timeline appears immediately after the compact selected-project header and before the full project list/detail navigation in the redesigned layout.
- Phase cards use `min(78vw, 280px)` width; step cards use `min(72vw, 240px)`.
- The current card is centered on entry. Adjacent card edges remain partially visible as a horizontal-scroll affordance.
- Legend becomes a compact summary disclosure.
- No hover-only content is required to understand status or use actions.
- Expanded steps stay horizontal; they do not become a long vertical list before the user can reach lower dashboard content.

### Shared phase-axis baseline

- All phase cards in one rendered row stretch to the tallest card in that row; variable title, status, progress, or integrity content must not move individual axis nodes vertically.
- Axis-node top coordinates may differ by at most 1 px after layout at desktop, tablet, and mobile widths.
- The layout must preserve intrinsic card content and existing clamps. A fixed pixel height and content clipping are not acceptable solutions.
- The phase implementation follows the existing nested-step pattern: equal-height flex list items and cards that consume the available row height.

Change intake 2026-07-11:

```text
Idea: Keep the phase axis straight when phase cards contain different amounts of content.
Source: Human owner browser review after the first redesign acceptance report.
Type: bug_fix, scope_refinement, verification_change, documentation_change
Decision: adopt_now
Reason: The defect breaks the primary lifecycle visualization and invalidates the previous visual-acceptance claim.
Affected specs: dashboard-project-timeline large-timeline and responsive requirements.
Affected architecture: No boundary change; reuse the existing flex layout contract.
Data contract impact: None.
Verification impact: Add a failing component contract test and <=1 px live-browser geometry checks at three supported viewports.
Status: in_progress
```

## Accessibility

- The phase viewport uses a labelled ordered list; every phase card is a real button.
- Each phase button exposes its visible name, lifecycle status, progress when known, confidence, `aria-expanded`, `aria-controls`, and `aria-current="step"` only for the explicit current phase.
- Left/Right Arrow moves roving focus between phases; Home/End moves to first/last; Enter/Space applies the same toggle behavior as click; Escape collapses the expanded phase; ArrowDown from an expanded phase moves focus to the first step when steps exist.
- The step viewport uses a labelled ordered list with real buttons. Left/Right Arrow and Home/End move focus; Enter/Space opens details; ArrowUp returns focus to the parent phase.
- Focus movement scrolls the focused item fully into view and never requires pointer input.
- On expansion/collapse, focus remains on the phase button. A polite live region announces the phase name and number of revealed steps.
- Opening the detail drawer moves focus into the dialog; closing it restores focus to the originating phase or step.
- Status is communicated by text and icon/shape in addition to color. All text and focus indicators meet WCAG 2.1 AA contrast.
- Animations respect `prefers-reduced-motion`; reduced-motion mode uses immediate positioning and no animated axis transitions.
- Scroll containers have visible focus treatment and descriptive accessible names.

## Decisions

### Use a horizontal semantic sequence, not a calendar/Gantt scale

The roadmap documents lifecycle order more reliably than dates or duration. Equal card spacing avoids implying schedule precision the source data does not provide.

Alternative: position cards by dates from the reference. Rejected because Projects Viewer does not have a reliable normalized schedule contract and must not fabricate temporal accuracy.

### Keep one expanded phase

One expanded phase preserves parent-child context and bounds vertical growth. It also maps directly to the user's click/switch requirement.

Alternative: allow multiple expanded phases. Rejected because it recreates the current long-text page and makes nested horizontal axes difficult to associate.

### Make current IDs explicit in the presentation model

The component must render trusted state rather than repeat scanner heuristics. Explicit IDs also make initial centering, keyboard state, and tests deterministic.

Alternative: infer current from the last `in_progress` item inside the component. Rejected because multiple/ambiguous statuses must remain visible as data-integrity issues.

### Decompose the current monolith without adding a chart dependency

Recommended boundaries are a model adapter, timeline state reducer/controller, phase viewport/card, step viewport/card, legend, and fallback state. HTML/CSS/SVG connectors are sufficient.

Alternative: add a visualization library. Rejected because the interaction is an ordered list rather than a general graph and the dependency would add bundle/accessibility cost without product value.

## Risks / Trade-offs

- [Horizontal layouts can hide offscreen context] -> Center current state, expose adjacent edges, visible scroll affordances, keyboard navigation, and `Jump to current`.
- [A visually authoritative timeline can amplify wrong scanner state] -> Require explicit current IDs, confidence/integrity disclosure, and the dashboard trust gate before overview promotion.
- [Many lifecycle states can produce visual complexity] -> Keep selection separate from lifecycle color and render a legend only for states present.
- [Auto-expansion can consume height] -> Expand only one phase, use compact step cards, and allow repeated-click collapse.
- [Nested scroll areas can be difficult on touch] -> Keep phase and step viewports vertically separated, provide clear labels, and avoid mandatory snapping.
- [Progress can be mistaken for schedule completion] -> Label its basis as implementation progress and never use dates or axis length.
- [Existing frontend test infrastructure is limited] -> Introduce the minimum component-capable test harness and retain browser acceptance as a required gate.

## Migration Plan

1. Add presentation-model and progress-contract tests without changing current UI.
2. Add timeline state/keyboard tests and focused visual components behind the Roadmap surface.
3. Verify current, no-current, pending-acceptance, blocked, ambiguous, empty, no-steps, long-list, mobile, and reduced-motion fixtures.
4. Replace the vertical roadmap list inside the Roadmap tab while retaining evidence drawer access.
5. Run browser and human acceptance in dark and light themes at desktop, tablet, and mobile sizes.
6. Promote the timeline into the redesigned selected-project overview only after scanner trust acceptance criteria pass.

Rollback keeps the presentation adapter/tests and restores the previous `RoadmapTimeline` rendering. No runtime data migration or scanned-project write is involved.

## Open Questions

No product decision blocks specification or implementation planning. Choice of the smallest compatible React component test harness is an implementation decision, but it must support DOM semantics, keyboard events, and accessibility assertions required by the spec.
