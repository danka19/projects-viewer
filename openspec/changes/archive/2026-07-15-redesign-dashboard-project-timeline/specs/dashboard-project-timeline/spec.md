## ADDED Requirements

### Requirement: Timeline communicates project lifecycle position at a glance

Projects Viewer SHALL render project phases as one ordered horizontal timeline in which completed phases precede the explicit current phase and eligible future phases follow it, without using calendar-scale spacing.

#### Scenario: Project has completed current and planned phases
- **WHEN** the timeline model contains resolved phases, one explicit current phase, and future phases
- **THEN** resolved phases appear before the current phase and future phases appear after it in sequence order
- **AND** the current phase receives the strongest selection/current emphasis
- **AND** each phase exposes its lifecycle status as visible text and a non-color cue

#### Scenario: Project has no explicit current phase
- **WHEN** `currentPhaseId` is null
- **THEN** the component does not fabricate a current phase
- **AND** it centers the transition between the last resolved phase and the first eligible future phase when both exist
- **AND** it exposes a visible `No active phase` or `Between phases` state

#### Scenario: Current phase identity is inconsistent
- **WHEN** the model reports an unknown current phase ID or an ambiguity integrity issue
- **THEN** the timeline shows an integrity warning
- **AND** no ambiguous phase receives fabricated current emphasis

### Requirement: Timeline preserves the Projects Viewer visual system

The timeline SHALL use existing Projects Viewer theme/status tokens and SHALL treat the supplied screenshot only as a composition and interaction reference.

#### Scenario: Timeline renders in dark theme
- **WHEN** the default dark theme is active
- **THEN** phase cards, axis segments, focus rings, status badges, and step cards use the existing semantic theme tokens
- **AND** no reference-specific blue palette, application name, person, date, avatar, navigation shell, or sample identifier is reproduced

#### Scenario: Timeline renders in light theme
- **WHEN** the saved light theme is active
- **THEN** the same hierarchy and lifecycle distinctions remain available through the light token values
- **AND** text and interactive indicators meet WCAG 2.1 AA contrast

### Requirement: Phase expansion is exclusive and reversible

Projects Viewer SHALL allow zero or one phase to be expanded and SHALL render the expanded phase's step timeline directly below the phase axis.

#### Scenario: User expands a collapsed phase
- **WHEN** the user clicks or activates a collapsed phase
- **THEN** that phase becomes the sole expanded phase
- **AND** its nested step region appears below the phase axis
- **AND** focus remains on the phase button

#### Scenario: User collapses the expanded phase
- **WHEN** the user clicks or activates the already expanded phase
- **THEN** the step region is removed
- **AND** no phase remains expanded
- **AND** focus remains on the same phase button

#### Scenario: User switches expanded phase
- **WHEN** one phase is expanded and the user activates another phase
- **THEN** the previous phase collapses
- **AND** the newly activated phase expands
- **AND** the new phase scrolls fully into view without resetting unrelated project state

#### Scenario: Current phase loads with steps
- **WHEN** a project/revision first loads with an explicit current phase containing steps
- **THEN** the current phase is centered and expanded by default
- **AND** the explicit current step is centered in the nested viewport when present

### Requirement: Nested steps communicate phase execution position

The expanded phase SHALL render its steps as one ordered horizontal child timeline using the same lifecycle vocabulary with smaller visual hierarchy.

#### Scenario: Expanded phase has resolved current and future steps
- **WHEN** an expanded phase contains completed steps, an explicit current step, and planned steps
- **THEN** the step axis orders them by sequence
- **AND** completed steps are visually resolved, the current step receives current emphasis, and planned steps remain outlined/dashed
- **AND** every step displays a status label or accessible equivalent

#### Scenario: User opens step details
- **WHEN** the user clicks or activates a step
- **THEN** Projects Viewer opens the existing read-only detail drawer for that step
- **AND** the drawer exposes evidence and source file/line
- **AND** closing the drawer restores focus to the originating step

### Requirement: Progress has deterministic implementation semantics

The timeline SHALL represent implementation progress only and SHALL NOT derive progress from dates, axis length, file modification time, or card position.

#### Scenario: Phase lifecycle is implemented
- **WHEN** a phase status is `closed`, `accepted`, or `pending_acceptance`
- **THEN** phase implementation progress is 100 percent
- **AND** `pending_acceptance` remains visibly distinct from accepted/closed lifecycle state

#### Scenario: Phase progress derives from steps
- **WHEN** a non-resolved phase has eligible steps
- **THEN** progress equals resolved eligible steps divided by all eligible steps, rounded to the nearest integer
- **AND** resolved means `closed`, `accepted`, or `pending_acceptance`
- **AND** cancelled/superseded steps are excluded from numerator and denominator
- **AND** blocked/deferred steps remain incomplete in the denominator

#### Scenario: Progress evidence is insufficient
- **WHEN** an in-progress, blocked, or deferred phase has no eligible steps or only cancelled/superseded steps
- **THEN** progress is unknown rather than zero
- **AND** the UI shows lifecycle status without a fabricated percentage

#### Scenario: Project roadmap progress is displayed
- **WHEN** at least one eligible phase has known progress
- **THEN** overall implementation progress is the mean of known eligible phase progress values
- **AND** cancelled/superseded phases are excluded
- **AND** the UI discloses how many eligible phases lack progress evidence

### Requirement: Timeline consumes explicit trustworthy presentation data

The timeline SHALL consume an immutable ordered presentation model with explicit current IDs, stable keys, source evidence, confidence, and integrity issues, and SHALL NOT scan or infer arbitrary documentation text inside the component.

#### Scenario: Existing project scan data is adapted
- **WHEN** existing `PhaseItem` and `PhaseStep` data is prepared for the timeline
- **THEN** an adapter produces stable unique keys, deterministic sequence values, explicit current IDs or null, progress value/basis, source evidence, and integrity issues
- **AND** React list identity does not depend on array index

#### Scenario: Upstream data cannot identify current state
- **WHEN** the adapter cannot identify one unambiguous current phase or step from trusted lifecycle data
- **THEN** it emits null for the current ID
- **AND** it records an integrity issue instead of selecting the last matching prose or checkbox signal

#### Scenario: Timeline data is partial
- **WHEN** upstream scan limits truncate phases or steps
- **THEN** `isPartial` is true
- **AND** the component visibly discloses that the timeline is incomplete

### Requirement: Timeline provides explicit loading empty error stale and no-steps states

Projects Viewer SHALL distinguish data loading, successful empty data, load error, stale retained data, partial data, integrity warnings, and phases without documented steps.

#### Scenario: Timeline is loading without prior data
- **WHEN** timeline data is loading and no prior model exists
- **THEN** the component is marked `aria-busy="true"`
- **AND** non-interactive skeletons preserve the approximate timeline layout
- **AND** no fake phases statuses or percentages are announced

#### Scenario: Timeline refreshes with prior data
- **WHEN** a background refresh starts after a model has rendered
- **THEN** the previous model remains visible with a loading/freshness indication
- **AND** expansion and horizontal position are preserved when IDs still exist

#### Scenario: Timeline is empty
- **WHEN** loading succeeds with zero phases
- **THEN** the UI shows `No roadmap phases detected` and a concise source explanation
- **AND** it does not render an empty axis or 0 percent progress

#### Scenario: Timeline load fails
- **WHEN** loading fails with no stale model
- **THEN** the UI shows a safe error message
- **AND** a Retry action is shown only when live mode can repeat the operation

#### Scenario: Stale model exists after error
- **WHEN** refresh fails while a prior model exists
- **THEN** the prior model remains visible and is marked stale
- **AND** the error does not erase the user's selected/expanded context

#### Scenario: Expanded phase has no steps
- **WHEN** the user expands a phase whose steps array is empty
- **THEN** the nested region shows `No steps documented for this phase`
- **AND** it offers read-only phase details/source access
- **AND** it does not infer completion from missing steps

### Requirement: Large timelines remain navigable without wrapping

Phase and step axes SHALL remain single-row horizontal sequences and SHALL support bounded project data up to the documented scanner limits.

#### Scenario: Phase count exceeds available width
- **WHEN** phase cards do not fit the viewport
- **THEN** the phase row scrolls horizontally without wrapping
- **AND** the current/focused phase can be brought fully into view
- **AND** visible edge affordances indicate additional content

#### Scenario: Timeline contains more than twelve phases
- **WHEN** the model contains more than twelve phases
- **THEN** non-current phase cards use compact metadata
- **AND** full accessible names/statuses and detail access remain available
- **AND** the current and expanded phases retain full emphasis

#### Scenario: User manually scrolls away from current phase
- **WHEN** the user scrolls the timeline manually
- **THEN** ordinary data refresh does not repeatedly recenter the viewport
- **AND** `Jump to current` restores the explicit current phase when requested

#### Scenario: Phase cards contain different amounts of content
- **WHEN** one phase row contains cards with different title, status, progress, or integrity content heights
- **THEN** every phase card stretches to the height of the tallest card in that row
- **AND** all phase-axis node top coordinates differ by no more than 1 pixel
- **AND** the implementation does not use a fixed card height or clip card content

### Requirement: Timeline is responsive and touch usable

The timeline SHALL preserve hierarchy and interaction across desktop, tablet, and mobile viewports using horizontal overflow rather than stacking phase order vertically.

#### Scenario: Desktop viewport opens selected project
- **WHEN** viewport width is at least 1280 pixels and the selected project first opens
- **THEN** the compact project state header and phase axis are visible within a 720-pixel-tall first viewport
- **AND** the current phase is centered with neighboring phases visible where available

#### Scenario: Mobile viewport opens selected project
- **WHEN** viewport width is below 768 pixels
- **THEN** the timeline appears directly after the selected-project state header in the redesigned layout
- **AND** the user does not have to scroll past the full project list to reach it
- **AND** current and adjacent phase cards remain touch-scrollable with partially visible neighbor affordances

#### Scenario: Mobile phase expands
- **WHEN** a phase expands on mobile
- **THEN** the step timeline uses its own horizontal viewport
- **AND** it does not become a long vertical list that obscures later dashboard content
- **AND** no essential action depends on hover

### Requirement: Timeline is fully keyboard and assistive-technology operable

All phase and step interactions SHALL be available through semantic controls, deterministic keyboard commands, visible focus, and appropriate ARIA relationships.

#### Scenario: Keyboard user navigates phases
- **WHEN** focus is in the phase timeline
- **THEN** Left/Right Arrow moves roving focus between phases
- **AND** Home/End moves to first/last phase
- **AND** focused phases scroll fully into view
- **AND** Enter/Space toggles the focused phase

#### Scenario: Keyboard user navigates expanded steps
- **WHEN** a phase with steps is expanded
- **THEN** ArrowDown from its phase button moves focus to the first step
- **AND** Left/Right Arrow and Home/End navigate steps
- **AND** ArrowUp returns focus to the parent phase
- **AND** Enter/Space opens step details

#### Scenario: Phase ARIA state is exposed
- **WHEN** the timeline renders a phase
- **THEN** its button exposes accessible name, lifecycle status, known progress, `aria-expanded`, and `aria-controls`
- **AND** only the explicit current phase exposes `aria-current="step"`

#### Scenario: Expansion state changes
- **WHEN** a phase expands or collapses
- **THEN** a polite live region announces the phase name and revealed step count/state
- **AND** focus remains on the triggering phase button

#### Scenario: Reduced motion is requested
- **WHEN** the user prefers reduced motion
- **THEN** centering and expansion use immediate or minimal motion
- **AND** no animated connector or emphasis is required to understand status

### Requirement: Timeline preserves read-only evidence and project safety boundaries

Timeline interactions SHALL remain advisory and read-only and SHALL NOT modify scanned projects or trigger external actions.

#### Scenario: User inspects a phase or step
- **WHEN** the user opens details from the timeline
- **THEN** the UI reads existing model/evidence data only
- **AND** it does not edit phase/step status, scanned files, tasks, calendars, commits, commands, auth state, remote services, or agent work

#### Scenario: Timeline encounters a local source path
- **WHEN** a phase or step exposes a source file/line
- **THEN** details remain scoped to the configured saved project
- **AND** the component does not accept an arbitrary browser-provided path

### Requirement: Timeline implementation has acceptance evidence

Replacing the existing roadmap view SHALL require automated and manual evidence covering model semantics, interaction, accessibility, responsive behavior, visual themes, and safety boundaries.

#### Scenario: Automated component acceptance runs
- **WHEN** the timeline implementation is proposed complete
- **THEN** focused tests cover initial current centering/expansion, repeated-click collapse, phase switching, no-current, no-steps, progress edge cases, ambiguity, partial data, long lists, keyboard commands, ARIA state, focus restoration, and reduced motion
- **AND** the full existing test suite and production build pass

#### Scenario: Browser acceptance runs
- **WHEN** implementation reaches its browser gate
- **THEN** dark and light themes are checked at desktop, tablet, and mobile widths
- **AND** horizontal scrolling, visible focus, drawer return focus, edge affordances, sticky-layout interaction, and first-viewport placement are verified
- **AND** no console errors or unexpected horizontal page overflow are present

#### Scenario: Human acceptance is requested
- **WHEN** automated and browser evidence is complete
- **THEN** the human owner reviews whether completed/current/planned hierarchy and nested steps are understandable at a glance
- **AND** overview promotion remains pending until the human accepts both visual clarity and trusted state inputs
