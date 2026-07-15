## ADDED Requirements

### Requirement: Specs presentation contract is immutable and evidence-backed
The system SHALL expose a `SpecCanvasModel` containing stable specification/task keys, lifecycle status, separate dependency state, confidence, sources, explicit groups, progress, owned tasks, explicit dependencies, unassigned tasks, partial state, and integrity issues. Stable keys MUST derive from durable source identity and MUST NOT use array indexes.

#### Scenario: Scan arrival order changes
- **WHEN** identical specification inputs arrive in a different array order
- **THEN** model keys, groups, layout inputs, dependency edges, and revision remain deterministic

### Requirement: Progress follows eligible task semantics
Specification progress SHALL equal resolved eligible tasks divided by all eligible tasks rounded to the nearest integer; cancelled and superseded tasks MUST be excluded, while blocked and deferred tasks remain incomplete. No eligible tasks means unknown progress, except explicit accepted/closed/archived evidence MAY establish 100 percent. Project progress SHALL be the mean of known specification progress values and disclose unknown count.

#### Scenario: Mixed eligible statuses calculate progress
- **WHEN** a specification has resolved, blocked, deferred, cancelled, and superseded tasks
- **THEN** cancelled/superseded tasks are excluded and blocked/deferred tasks remain in the incomplete denominator

#### Scenario: No tasks does not fabricate zero
- **WHEN** a non-final specification has no eligible tasks
- **THEN** its progress is unknown and the model reports `No tasks documented`

### Requirement: Current identity is never inferred
`explicitCurrentSpecKey` SHALL be set only when trusted lifecycle evidence identifies exactly one in-progress specification. Zero or multiple in-progress specifications MUST produce null; user selection MUST remain presentation state separate from lifecycle truth.

#### Scenario: Parallel active specifications
- **WHEN** two specifications are explicitly in progress
- **THEN** both render active and no singular current specification is fabricated

### Requirement: Dependency validation preserves truth and blocking
Each explicit dependency SHALL point prerequisite to dependent. A prerequisite is satisfied only with accepted, closed, done, or archived lifecycle evidence; pending acceptance remains unsatisfied. Missing target, self-edge, cycle, duplicate-id, and contradictory duplicate declarations MUST produce integrity evidence and MUST NOT fabricate a valid execution order.

#### Scenario: Unsatisfied prerequisite blocks dependent work
- **WHEN** a planned specification explicitly depends on a non-final prerequisite
- **THEN** lifecycle remains planned while dependency state is blocked and accessible text names the prerequisite

#### Scenario: Pending acceptance does not satisfy hard dependency
- **WHEN** a prerequisite is implementation-complete but pending human acceptance
- **THEN** its dependent remains blocked

#### Scenario: Cycle is invalid
- **WHEN** explicit dependencies form a cycle
- **THEN** every involved card has invalid dependency state, the cycle is disclosed, and no topological order is claimed

### Requirement: Task preview and dense grouping are deterministic
Cards SHALL display at most six directly visible tasks using the approved current-window, unresolved-first, or final-six algorithm while reporting true total and hidden counts. Active, blocked, pending-acceptance, and invalid specifications MUST stay visible; accepted/archived work and explicit groups MAY collapse only with full counts and resettable visible controls. More than 24 visible cards MUST enable compact metadata and recommend Fit all.

#### Scenario: Current task remains in preview
- **WHEN** an owned task is explicitly current among more than six tasks
- **THEN** a source-order window of at most six includes it with up to two preceding tasks

#### Scenario: Dense fixture preserves counts
- **WHEN** a model contains at least 30 specifications with collapsed archived work and partial input
- **THEN** visible and total counts, collapsed count, unknown progress count, and partial warning remain accurate

### Requirement: Layout inputs are stable and independent work stays unordered
The model SHALL compute stable topological layers for acyclic dependency nodes, explicit group/source lanes, an invalid lane, and an independent region, breaking every tie by stable key. Independent specifications MUST have no connector or implied execution order.

#### Scenario: Equivalent scan order produces equivalent layout
- **WHEN** model inputs are shuffled without semantic changes
- **THEN** every card receives the same deterministic layer and lane
