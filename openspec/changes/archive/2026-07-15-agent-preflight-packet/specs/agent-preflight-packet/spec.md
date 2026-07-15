## ADDED Requirements

### Requirement: Agent preflight packet is generated from local configured project data

Projects Viewer SHALL generate an agent preflight packet only from saved local project config, generated scan data, accepted AI context, AI findings review state, local OpenSpec artifacts, and local project documentation signals.

#### Scenario: Packet uses saved tracked project identity

- **WHEN** a client requests an agent preflight packet for a saved tracked project id
- **THEN** the packet is derived from the saved tracked project config and current generated scan data for that project
- **AND** the request does not accept arbitrary project paths
- **AND** scanned project folders are not modified

#### Scenario: Packet works without remote services

- **WHEN** the local server is running and generated scan data exists
- **THEN** the packet can be generated without cloud services, external model providers, API keys, remote synchronization, or external task systems

### Requirement: Agent preflight packet has a distinct agent-facing contract

Projects Viewer SHALL expose agent preflight packet output as a distinct contract from human daily or weekly project brief reports.

#### Scenario: Packet identifies its own kind

- **WHEN** a client requests an agent preflight packet
- **THEN** the response includes `kind: "agent-preflight-packet"`
- **AND** the response does not use `kind: "project-brief-report"`
- **AND** the response includes an agent role field for implementation, reviewer, verification, or handoff use

#### Scenario: Packet does not expose human brief cadence fields

- **WHEN** a client requests an agent preflight packet
- **THEN** the response does not include daily or weekly brief `mode` semantics
- **AND** the response does not include human-brief-only fields such as `recommendedHumanDecision` or `noAttentionMessage`
- **AND** the response can include agent-facing fields such as required reading, acceptance mapping, attention signals, and verification expectations

### Requirement: Agent preflight packet orients agents before work

Projects Viewer SHALL include the compact context an AI agent needs before planning, implementing, reviewing, verifying, or preparing a handoff.

#### Scenario: Packet includes required reading and current project state

- **WHEN** a packet is generated for a tracked project
- **THEN** it includes ordered required-reading references for relevant project docs and OpenSpec artifacts where available
- **AND** it includes compact current project state such as status, current phase, next action, main blocker, main risk, and recent decision where available
- **AND** it labels missing optional inputs through safe states rather than inventing source facts

#### Scenario: Packet includes active change context

- **WHEN** a packet is requested with a local OpenSpec change id
- **THEN** it includes proposed-change context, requirement references, scenario references, and task references for that change where available
- **AND** it labels those entries as proposed rather than accepted behavior

#### Scenario: Packet includes verification expectations

- **WHEN** project checklist, phase plan, OpenSpec, or audit signals define verification expectations
- **THEN** the packet includes advisory verification expectations with evidence targets
- **AND** the packet does not execute those checks during retrieval

### Requirement: Agent preflight packet preserves evidence and derived labels

Projects Viewer SHALL preserve source evidence where available and distinguish derived interpretations from source facts in agent preflight packets.

#### Scenario: Packet item references source evidence

- **WHEN** a packet field is derived from a task, blocker, risk, decision, audit, spec, phase plan, checklist, documentation gap, or finding with source evidence
- **THEN** the packet includes project-relative source file evidence where available
- **AND** the packet includes source line evidence when available

#### Scenario: Packet labels derived summaries

- **WHEN** a packet field is derived from generated summary data without a direct source line
- **THEN** the packet marks the field as derived summary data
- **AND** the packet does not present that derived field as an accepted project decision or quoted source fact

### Requirement: Agent preflight packet degrades safely when optional context is missing

Projects Viewer SHALL return explicit safe states when optional preflight inputs are missing or incomplete.

#### Scenario: Missing generated scan data blocks packet generation

- **WHEN** a client requests an agent preflight packet before generated scan data is available
- **THEN** the API returns a clear `missing-generated-scan-data` error or equivalent blocked state
- **AND** the API does not scan arbitrary request-provided paths as a fallback

#### Scenario: Missing change metadata is non-blocking

- **WHEN** a client requests an agent preflight packet with a change id that is not present locally
- **THEN** the packet response can still include current project context
- **AND** it includes an `unknown-change` safe state
- **AND** it does not fabricate requirement, scenario, or task references for the missing change

#### Scenario: Missing findings or audit signals are non-blocking

- **WHEN** findings review state, audit signals, phase signals, or checklist signals are unavailable but generated scan data exists
- **THEN** the packet response includes non-blocking safe states for the missing inputs
- **AND** it uses only the remaining available local inputs

### Requirement: Agent preflight packet does not trigger automatic action

Projects Viewer SHALL keep agent preflight packets advisory and SHALL NOT use packet generation to run commands, modify scanned projects, create commits, create external tasks, create calendar items, update finding review state, write AI context snapshots, or trigger agent implementation work automatically.

#### Scenario: Packet includes a blocker or high-risk signal

- **WHEN** an agent preflight packet includes a blocker, approval gate, unresolved finding, or missing verification signal
- **THEN** Projects Viewer records or returns the signal for review
- **AND** Projects Viewer does not run shell commands, edit project files, create commits, create external task or calendar records, update finding review state, write AI context snapshots, or start agent work in response to the packet

#### Scenario: Packet rejects action parameters

- **WHEN** a packet request includes command, action, commit, task, calendar, notification, remote provider, auth, model, path, glob, or agent-control parameters
- **THEN** the request is rejected with a clear validation error
- **AND** no packet side effects occur
