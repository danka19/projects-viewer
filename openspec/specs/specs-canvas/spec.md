# specs-canvas Specification

## Purpose
Define the responsive, accessible, read-only Specs Canvas presentation and interaction contract.

## Roadmap

- Roadmap phase: P4
- Related phases: none

## Requirements
### Requirement: Canvas Focus renders Trello-like specification cards
Desktop and tablet Specs view SHALL render substantial read-only cards on a locally pannable canvas. The selected or explicit active card, immediate prerequisites, immediate dependents, independent regions, and only explicitly named groups MUST be visually distinguishable without hiding unrelated work.

#### Scenario: Card expands exclusively
- **WHEN** the user activates a collapsed card, activates it again, then activates another card
- **THEN** it expands and selects, collapses while preserving selection, then transfers the single expansion to the other card

#### Scenario: Card content remains evidence-backed
- **WHEN** owner, dates, tasks, or progress are missing
- **THEN** the fields are omitted or marked unknown and no placeholder person/date is shown

### Requirement: Directed connectors attach to ports and avoid cards
Each explicit dependency SHALL render behind cards from a visible prerequisite edge port to a visible dependent edge port with an arrowhead. Endpoints MUST be within 2 CSS pixels of assigned ports; paths and labels MUST maintain at least 4 CSS pixels clearance from every non-endpoint card; labels MUST NOT overlap any card. Expansion MUST deterministically re-layout and re-route before the final frame.

#### Scenario: Branching mixed-height geometry remains clear
- **WHEN** mixed-height cards form branching dependencies and one card expands
- **THEN** no cards overlap, every connector meets port/clearance tolerances, and every label remains outside cards

#### Scenario: Independent work has no line
- **WHEN** two cards have no explicit dependency
- **THEN** no connector is rendered between them

#### Scenario: Unavoidable line crossing remains unambiguous
- **WHEN** routes cannot avoid crossing another connector
- **THEN** neither line crosses a card and selection emphasis isolates the selected relationship

### Requirement: Canvas controls are complete without pointer gestures
The canvas SHALL provide button controls for zoom out, current percentage, zoom in, Fit all, and Center active when a singular explicit active specification exists. Zoom SHALL range from 50 to 150 percent in deterministic increments; local pan MUST NOT create page-level horizontal overflow. Touch pinch and empty-canvas drag MAY supplement the buttons.

#### Scenario: Keyboard user fits dense graph
- **WHEN** a keyboard user activates Fit all on a dense project
- **THEN** the graph is scaled and panned into the local viewport without page overflow

### Requirement: Mobile uses dependency-aware vertical groups
Below 768 CSS pixels the system SHALL replace freeform positioning with vertical dependency chains and a labelled independent section. Dependency text and vertical connectors MUST preserve direction without requiring two-dimensional panning.

#### Scenario: Mobile user reaches all essential content
- **WHEN** Specs renders at 390×844
- **THEN** every visible card, task, dependency description, filter, and details action is reachable with no page-level horizontal overflow

### Requirement: Canvas is fully keyboard and screen-reader operable
The Specs surface SHALL be a named region with graph summary, semantic card controls, roving focus, nearest-card Arrow navigation, deterministic Home/End, Enter/Space expansion, visible focus, polite expansion announcements, accessible lifecycle/dependency/progress/task descriptions, and reduced-motion behavior. SVG connectors MUST be decorative and every dependency MUST be repeated in accessible text.

#### Scenario: Spatial keyboard navigation follows cards
- **WHEN** focus is on a canvas card and an Arrow key is pressed
- **THEN** focus moves to the nearest card in that spatial direction while Home/End follow deterministic DOM order

#### Scenario: Reduced motion preserves meaning
- **WHEN** the user prefers reduced motion
- **THEN** pan, zoom, reflow, and connector animations are disabled without removing status or relationship cues

### Requirement: Task and details drawer restore exact focus
Activating an owned task SHALL open the existing read-only drawer with source evidence; Details SHALL expose the full specification and all scanned tasks. Closing the drawer MUST restore focus to the exact originating card/task control by stable identity, including after compatible live refresh replaces its DOM node.

#### Scenario: Refresh-safe task focus return
- **WHEN** a task opens the drawer, a compatible refresh replaces the card DOM, and the drawer closes
- **THEN** focus returns to the matching task control in the refreshed card

### Requirement: Dense and integrity states remain inspectable
The canvas SHALL disclose active filters, partial input, archived/group collapse counts, invalid dependencies, unassigned work, and full result counts. Selection SHALL emphasize its incoming/outgoing connectors and immediate neighbors while unrelated cards remain readable.

#### Scenario: Dense integrity fixture is understandable
- **WHEN** a 30-card fixture includes three chains, independent work, multiple scopes, archived work, a cycle, and unassigned tasks
- **THEN** all regions and warnings are labelled, counts are complete, and the selected dependency path can be isolated
