## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Current phase identity is explicit or null
The scanner SHALL derive `summary.currentPhase` only from phases parsed from `ROADMAP.md`. It SHALL set that field only when exactly one roadmap phase has `in_progress` lifecycle status and SHALL keep it null for zero or multiple in-progress roadmap phases.

#### Scenario: One roadmap phase is in progress
- **WHEN** exactly one phase in `ROADMAP.md` is `in_progress`
- **THEN** `summary.currentPhase` names that phase

#### Scenario: Non-roadmap prose resembles active phase status
- **WHEN** a plan, audit, archive, or other non-roadmap document contains a phase-like in-progress status
- **THEN** it does not establish or make ambiguous `summary.currentPhase`

#### Scenario: Current roadmap phase is ambiguous or absent
- **WHEN** zero or more than one roadmap phase is `in_progress`, or roadmap work is only pending acceptance
- **THEN** `summary.currentPhase` is null
- **AND** downstream presentation surfaces the between-phases or ambiguity state instead of a fabricated current phase
