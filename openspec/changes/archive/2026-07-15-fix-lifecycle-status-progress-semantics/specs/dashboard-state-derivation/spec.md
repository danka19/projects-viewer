## ADDED Requirements

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
