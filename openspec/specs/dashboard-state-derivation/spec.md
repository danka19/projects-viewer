# Dashboard State Derivation Specification

## Purpose

Define trustworthy scanner-derived current state, lifecycle, next-action, blocker, and phase-step semantics.

## Roadmap

- Roadmap phase: P4
- Related phases: none

## Requirements

### Requirement: Next actions come only from project planning sources

The scanner SHALL NOT source next-action signals from agent-rule documents, process-policy documents, example/template documents, or audit/checklist-category documents.

#### Scenario: Agent rules describe reporting habits
- **WHEN** `AGENTS.md` or a verification checklist contains next-step reporting rules
- **THEN** no next-action signal is produced from those documents
- **AND** next actions from roadmap/planning documents remain available

#### Scenario: Done project has only rule-derived candidates
- **WHEN** a project has closed phases, no open planning work, and rule files with next-step wording
- **THEN** the project reports zero next actions
- **AND** `summary.nextAction` is null

### Requirement: Plan checkboxes are tasks, not live blockers

The scanner SHALL treat unchecked markdown checkboxes as tasks and SHALL classify them as real blockers only when their text explicitly says blocked or blocker.

#### Scenario: TDD plan step mentions a failing test
- **WHEN** an unchecked checkbox says "Add a failing test named …"
- **THEN** it is not classified as a real blocker
- **AND** it never becomes `summary.mainBlocker`

#### Scenario: Checkbox explicitly records blocked work
- **WHEN** an unchecked checkbox text contains explicit blocked/blocker wording
- **THEN** it may still be classified as a real blocker with source evidence

### Requirement: Live blockers and constraints use canonical current sources

The scanner SHALL derive live blockers, approval gates, review signals, paused/deferred constraints, and blocker-derived summary state only from `ROADMAP.md`, `docs/BUGS.md`, or a non-archived active OpenSpec change under `openspec/changes/<change-id>/`. The scanner SHALL NOT derive those live signals from `docs/archive/**`, `openspec/changes/archive/**`, audits, evidence documents, plans, or any other documentation source.

#### Scenario: Historical and audit blockers are present
- **WHEN** archived, audit, evidence, or plan documents contain blocked or gate terminology alongside a current roadmap blocker
- **THEN** only the current roadmap blocker appears in live blocker-derived state
- **AND** excluded documents do not affect health, `summary.mainBlocker`, constraints, or live signal counts

#### Scenario: Active OpenSpec change records current blocked work
- **WHEN** a non-archived active OpenSpec change contains an explicit current-work blocker
- **THEN** the scanner may include it as a live blocker with source evidence
- **AND** an otherwise identical archived OpenSpec change does not create a live signal

#### Scenario: Canonical bug list records current blocked work
- **WHEN** `docs/BUGS.md` contains an explicit current bug that blocks named work
- **THEN** the scanner includes the evidence under the live blocker contract

### Requirement: Blocker vocabulary requires explicit current-work evidence

The scanner SHALL NOT classify a line as a live blocker merely because it contains `blocked`, `blocker`, or related vocabulary. A live blocker SHALL identify current work and an explicit obstacle; technical invariants, historical quotations, conditional statements, and explanatory prose remain non-live context.

#### Scenario: Roadmap documents a technical invariant
- **WHEN** a roadmap line explains that blocked phases retain status until evidence changes
- **THEN** the line does not produce a live blocker
- **AND** it does not become `summary.mainBlocker`

#### Scenario: Roadmap quotes historical blocked work
- **WHEN** a roadmap contains a quotation describing a previous release as blocked
- **THEN** the quotation remains historical context
- **AND** it does not affect live state

### Requirement: Superseded evidence is quality-only when replacement is absent

The scanner SHALL exclude superseded work from live constraints and blocker-derived state. When superseded evidence lacks an explicit replacement reference, the scanner SHALL expose only a non-live documentation-quality warning and SHALL NOT infer a blocker, restriction, or replacement work item.

#### Scenario: Superseded work has no replacement reference
- **WHEN** current-source text marks work as superseded without naming or linking a replacement
- **THEN** the work is absent from live constraints and blockers
- **AND** the scanner records a non-live quality warning about the missing replacement reference

#### Scenario: Superseded work names a replacement
- **WHEN** superseded work explicitly names or links its replacement
- **THEN** the superseded item remains excluded from live state
- **AND** the replacement is not inferred as blocked without separate explicit current-work evidence

### Requirement: Current phase identity follows roadmap order

The scanner SHALL derive `summary.currentPhase` only from phases parsed from `ROADMAP.md`. It SHALL select the first roadmap phase whose lifecycle is not `accepted`, `closed`, `cancelled`, or `superseded`, preserving the selected phase's explicit lifecycle status. It SHALL keep `summary.currentPhase` null only when no unfinished roadmap phase exists.

#### Scenario: First unfinished roadmap phase is blocked
- **WHEN** all earlier roadmap phases are final and the next phase is explicitly `blocked`
- **THEN** `summary.currentPhase` names that blocked phase
- **AND** the phase lifecycle remains `blocked`

#### Scenario: Non-roadmap prose resembles active phase status
- **WHEN** a plan, audit, archive, or other non-roadmap document contains a phase-like in-progress status
- **THEN** it does not establish or make ambiguous `summary.currentPhase`

#### Scenario: Roadmap has no unfinished phase
- **WHEN** every roadmap phase is accepted, closed, cancelled, or superseded
- **THEN** `summary.currentPhase` is null
- **AND** downstream presentation surfaces the completed-roadmap state instead of a fabricated current phase

### Requirement: Exact leading phase lifecycle remains authoritative

The system SHALL preserve an exact supported lifecycle value at the start of a phase `Status:` value and SHALL expose contradictory later lifecycle vocabulary as documentation integrity evidence rather than replacing the leading lifecycle.

#### Scenario: Ready phase explanation mentions an accepted decision
- **WHEN** a phase status value starts with `ready` and later prose says that a boundary or decision is accepted
- **THEN** lifecycle status remains `ready`
- **AND** conflicting final-state vocabulary is exposed as documentation integrity evidence

#### Scenario: Planned phase explanation contains negated acceptance
- **WHEN** a phase status value starts with `planned` and later prose says that a plan has not been accepted yet
- **THEN** lifecycle status remains `planned`
- **AND** the phase is not displayed as accepted or implemented

#### Scenario: Genuine accepted result remains final
- **WHEN** a phase status value starts with `accepted` and its explanation describes human acceptance of the result
- **THEN** lifecycle status remains `accepted`
- **AND** existing accepted-phase implementation-progress semantics are preserved

### Requirement: Phase steps require explicit source ownership

The system SHALL attach numbered step headings to roadmap phases only when the source document contains recognized phase structure or explicitly identifies itself as a phase plan.

#### Scenario: Generic planning sections resemble phase steps
- **WHEN** a generic planning document contains numbered headings such as `3.1` or `4.1` but contains no recognized phase heading or phase-plan title
- **THEN** those headings are not attached as roadmap phase steps
- **AND** they do not affect roadmap implementation progress
