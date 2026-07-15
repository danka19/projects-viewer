## Purpose
Define local review-required AI finding records derived from Projects Viewer scan signals.

## Roadmap

- Roadmap phase: P1
- Related phases: none

## Requirements

### Requirement: AI findings are review-required derived records

Projects Viewer SHALL represent AI or heuristic findings as review-required derived records, not as accepted project decisions.

#### Scenario: Finding is created from scan signals

- **WHEN** Projects Viewer detects a suspected contradiction, stale audit, missing verification evidence, stale handoff pointer, unresolved human gate, unclear next action, or similar issue from scan data
- **THEN** it records a finding with a finding type, title, explanation, confidence, review state, and source evidence
- **AND** the finding is labeled as review-required

#### Scenario: Finding does not change project truth

- **WHEN** a finding is created
- **THEN** the scanned project documentation remains unchanged
- **AND** the finding is not treated as an accepted decision, requirement, or completed verification result

### Requirement: AI findings are stored inside dashboard runtime data

Projects Viewer SHALL store AI finding runtime data only inside the dashboard project's local runtime data area.

#### Scenario: Findings file is written locally

- **WHEN** findings are generated or review state is updated
- **THEN** Projects Viewer writes only under `app-data/` or another documented dashboard runtime-data path
- **AND** Projects Viewer does not write to tracked project folders

#### Scenario: Findings are separated from scan output

- **WHEN** findings are persisted
- **THEN** they are stored separately from scanned project documentation
- **AND** they remain distinguishable from the generated scan output and accepted project config

### Requirement: AI findings preserve source evidence

Projects Viewer SHALL attach source evidence to every finding unless the finding concerns missing generated data itself.

#### Scenario: Finding has source evidence

- **WHEN** a finding is generated from a blocker, risk, decision, audit, phase, spec, task, or gap with source references
- **THEN** the finding includes the project identity
- **AND** the finding includes project-relative source file and line number evidence where available

#### Scenario: Finding has multiple evidence items

- **WHEN** a finding depends on a contradiction between two or more source items
- **THEN** the finding includes each relevant source item
- **AND** the finding explanation identifies the suspected contradiction

### Requirement: AI findings support human review state

Projects Viewer SHALL support review states for findings so the human can distinguish new, accepted, dismissed, and stale findings.

#### Scenario: New finding is pending review

- **WHEN** a finding is first generated
- **THEN** its review state is `new`
- **AND** it appears as pending human review in AI-facing data

#### Scenario: Human dismisses a finding

- **WHEN** the human dismisses a finding
- **THEN** Projects Viewer records the finding review state as `dismissed`
- **AND** future AI-facing data does not present the dismissed finding as unresolved unless the underlying evidence changes enough to create a new finding identity

#### Scenario: Finding becomes stale

- **WHEN** the source evidence for an existing finding no longer exists or no longer supports the finding after a rescan
- **THEN** Projects Viewer marks the finding as `stale` or omits it from unresolved findings while retaining enough local review history to avoid confusion

### Requirement: AI findings do not trigger automatic agent action

Projects Viewer SHALL NOT use AI findings to run commands, modify scanned projects, create commits, or trigger agent implementation work automatically.

#### Scenario: Finding indicates possible blocker

- **WHEN** a finding indicates a possible blocker or missing verification evidence
- **THEN** Projects Viewer records or displays the finding for review
- **AND** Projects Viewer does not run shell commands or edit project files in response to the finding
