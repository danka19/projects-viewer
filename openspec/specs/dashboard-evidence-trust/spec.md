# Dashboard Evidence Trust Specification

## Purpose

Define trustworthy blocker, next-action, OpenSpec scenario, search-match, and evidence-deduplication semantics.

## Roadmap

- Roadmap phase: P4
- Related phases: none

## Requirements

### Requirement: Completed task evidence never becomes a live blocker

Projects Viewer SHALL preserve markdown checkbox completion state through scanner classification and SHALL NOT classify checked tasks as live blockers or promote them to `summary.mainBlocker`.

#### Scenario: Completed task contains blocker terminology

- **WHEN** a task line is checked `[x]` and its completed text contains `checkbox blocker`, `hard-block pattern`, `blocked`, or `blocker`
- **THEN** the scanner does not include that task in `signalGroups.realBlockers`
- **AND** the task never becomes `summary.mainBlocker` or contributes to current blocker-derived health

#### Scenario: Unchecked task explicitly records blocked work

- **WHEN** an unchecked task records current work with explicit blocked or blocker wording
- **THEN** the scanner continues to classify it under the blocker contract owned by `dashboard-state-derivation`
- **AND** this completed-task exclusion does not weaken trusted positive blocker evidence

### Requirement: OpenSpec normative scenarios remain specification context

Projects Viewer SHALL recognize cross-line OpenSpec scenario structure and SHALL NOT promote its normative `WHEN`, `THEN`, or continuation lines as live project blockers solely because they contain blocker language.

#### Scenario: THEN line describes a blocked dependent

- **WHEN** an OpenSpec `#### Scenario` contains a normative `WHEN` line followed by `**THEN** its dependent remains blocked`
- **THEN** the normative lines remain specification or diagnostic context rather than `signalGroups.realBlockers`
- **AND** none of those lines becomes `summary.mainBlocker` or contributes to current blocker-derived health

#### Scenario: Ordinary planning evidence records an actual blocker

- **WHEN** a trusted planning source records current blocked work outside an OpenSpec normative scenario
- **THEN** the scanner continues to evaluate it under the existing trusted blocker rules
- **AND** the normative-scenario exclusion does not discard that live evidence

### Requirement: Superseded current-source text cannot revive historical constraints

Projects Viewer SHALL preserve superseded wording as non-live context even when it appears in an otherwise canonical current-state source. A missing replacement reference SHALL remain a documentation-quality warning rather than a live blocker or gate.

#### Scenario: Current roadmap retains superseded release text

- **WHEN** `ROADMAP.md` retains a superseded release entry without a replacement reference
- **THEN** the entry does not enter `signalGroups.realBlockers`, approval gates, review signals, or paused/deferred constraints
- **AND** any missing-replacement indication is non-live diagnostic evidence

### Requirement: Next actions require active-work semantics

Projects Viewer SHALL require a next-action candidate to express active work through a structural active-work form and SHALL NOT treat headings, explanatory text, or embedded marker examples as current next actions merely because they contain `next-action` terminology or a marker token.

#### Scenario: Implemented proposal explains next-action signals

- **WHEN** explanatory proposal prose says `Next-action signals ... are no longer sourced ...` and includes an embedded example marker such as `NEXT:`
- **THEN** the scanner does not include that line in current next actions
- **AND** the line never becomes `summary.nextAction`

#### Scenario: Heading names next-action behavior

- **WHEN** a heading or descriptive label contains `next action` or `next-action` without a standalone active-work directive
- **THEN** the scanner treats it as structure or explanation rather than current work

#### Scenario: Trusted source contains a standalone active directive

- **WHEN** a trusted planning source contains an unchecked active task or a standalone recognized next-action directive with actionable text
- **THEN** the scanner SHALL include it as a next action under the source-trust contract owned by `dashboard-state-derivation`
- **AND** embedded or quoted marker examples do not satisfy this scenario

### Requirement: Search results visibly explain their match

Projects Viewer SHALL render a query-matching fragment or equivalent visible query-to-result explanation for every search result, including when the match occurs after the beginning of long source text.

#### Scenario: Query matches late in long evidence text

- **WHEN** the query `preflight packet` matches later in evidence whose opening text discusses a different decision
- **THEN** the rendered result visibly includes the matching phrase with enough surrounding context to explain the relationship
- **AND** the user does not need to open the result or infer the match from its truncated prefix

#### Scenario: Match is outside the initial display prefix

- **WHEN** a normalized query match falls outside the initial fixed-length source prefix
- **THEN** the result presentation selects a match-aware fragment or another visible matching field
- **AND** any truncation preserves an accessible indication of omitted leading or trailing text

### Requirement: Match presentation preserves evidence deduplication

Projects Viewer SHALL treat match fragments as presentation metadata and SHALL preserve the stable evidence identity, ranking, navigation target, and source-aware deduplication contract owned by `dashboard-search-navigation`.

#### Scenario: Identical evidence has multiple representations

- **WHEN** identical project, source file, line, and text evidence is represented as more than one result type and matches the query
- **THEN** search returns one retained result for that evidence
- **AND** the retained result visibly explains the match without creating a second representation

#### Scenario: Query changes the selected display fragment

- **WHEN** different queries select different visible fragments from the same source evidence
- **THEN** the result keeps the same stable evidence identity and navigation target
- **AND** fragment selection does not independently alter ranking or bypass deduplication
