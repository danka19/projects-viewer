## Purpose

Define exact roadmap ownership and visible specification cards for the Projects Viewer Roadmap.

## Roadmap

- Roadmap phase: P4
- Related phases: none

## ADDED Requirements

### Requirement: Specification ownership is explicit

Projects Viewer SHALL read one primary phase and an optional step from the artifact-kind-specific roadmap metadata and SHALL preserve source evidence for the ownership values.

#### Scenario: Phase-level accepted capability

- **WHEN** an accepted capability spec declares `Roadmap phase: P4` and no step
- **THEN** its generated work item is owned by phase `P4` at phase level
- **AND** it is not assigned to a step by inference

#### Scenario: Step-owned active change

- **WHEN** an active change declares `Execution phase: P4` and `Execution step: 7.1`
- **THEN** its generated work item is owned by phase `P4`, step `7.1`
- **AND** the source file and metadata lines remain available as evidence

### Requirement: Roadmap renders specification work as cards

The Roadmap view SHALL render owned specifications as interactive cards nested under their exact phase or step owner.

#### Scenario: Large phase-level specification

- **WHEN** a phase owns a specification with multiple implementation tasks
- **THEN** the Roadmap renders one specification card under the phase
- **AND** the card renders its task summary without requiring the specification to be split

#### Scenario: Invalid ownership

- **WHEN** a specification references a missing phase or step
- **THEN** the Roadmap renders it in an explicit unassigned/integrity region
- **AND** the UI shows source evidence and does not guess a replacement owner

### Requirement: Card navigation is bidirectional

Specification cards SHALL expose source details and a safe route to the matching Specs Canvas card when Specs view is available.

#### Scenario: Open specification from Roadmap

- **WHEN** the user activates a specification card
- **THEN** the existing read-only drawer opens with the specification source evidence
- **AND** the user can open the same stable specification identity in Specs Canvas

#### Scenario: Unknown progress stays explicit

- **WHEN** a specification has no documented tasks
- **THEN** its card shows that progress is unknown
- **AND** the card does not display a fabricated percentage
