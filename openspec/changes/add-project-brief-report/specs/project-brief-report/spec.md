## ADDED Requirements

### Requirement: Project brief report is generated from local derived data

Projects Viewer SHALL generate project brief reports only from saved local project config, generated scan data, AI context changes, and AI findings review state.

#### Scenario: Brief uses saved local inputs
- **WHEN** a client requests a project brief report
- **THEN** the report is derived from saved tracked projects and generated scan data
- **AND** it may include AI context changes and AI findings review state
- **AND** the report identifies its local input sources in structured metadata
- **AND** the report includes a schema version and input-state metadata
- **AND** the request accepts only documented safe report parameters
- **AND** the request rejects arbitrary project paths, workspace paths, file selectors, globs, project selectors, and unknown parameters
- **AND** scanned project folders are not modified

#### Scenario: Brief does not require remote services
- **WHEN** the local server has generated scan data
- **THEN** the brief report can be generated without cloud services, external model providers, API keys, or remote synchronization

### Requirement: Project brief report highlights actionable human review items

Projects Viewer SHALL include enough structured report data for the human owner to identify changed projects, unresolved review-required findings, likely blockers, approval gates, and recommended human decisions.

#### Scenario: Brief contains prioritized project items
- **WHEN** generated scan data contains changed projects, blockers, approval gates, or unresolved findings
- **THEN** the report includes ranked project items with attention reasons
- **AND** each project item identifies the project, changed categories when known, unresolved finding counts when known, likely blockers or approval gates when available, and a recommended human decision
- **AND** the ranking fields are deterministic advisory report fields, not accepted project decisions
- **AND** rank and priority are review-order fields only, not task order, implementation order, accepted decisions, SLAs, or commands
- **AND** unresolved finding attention reasons are based only on findings with review state `new`

#### Scenario: Brief separates recommendation from action
- **WHEN** the report recommends a human decision
- **THEN** the report labels it as a recommendation for review
- **AND** the recommendation includes stable fields for the decision category, prompt, rationale, action-taken guard, and accepted-decision guard
- **AND** the report does not claim that an action was taken
- **AND** the report does not mark the recommendation as an accepted project decision
- **AND** high-priority or rank 1 items still keep action-taken and accepted-decision guards set to false

### Requirement: Project brief report preserves evidence and derived labels

Projects Viewer SHALL preserve source evidence where available and distinguish derived interpretations from source facts in project brief reports.

#### Scenario: Brief item includes source evidence
- **WHEN** a report item is based on a context item, finding, blocker, risk, decision, audit, spec, phase, task, or gap with source evidence
- **THEN** the report item includes the available source file and line number evidence
- **AND** finding summaries preserve finding ids, review state counts, confidence, and available evidence for unresolved findings

#### Scenario: Derived summary is labeled
- **WHEN** a report item is based on a derived status, health score, summary, or recommendation without direct source-line evidence
- **THEN** the report labels the item as derived
- **AND** derived labels identify the report field and reason for the derived label
- **AND** it is not presented as a quoted source fact

### Requirement: Project brief report degrades safely when data is missing

Projects Viewer SHALL return clear safe states when generated scan data, previous AI context snapshots, or findings data are missing or empty.

#### Scenario: Generated scan data is missing
- **WHEN** a client requests a project brief report before generated scan data is available
- **THEN** the system returns a clear empty-state or error response
- **AND** the response uses a missing-generated-scan-data safe state or equivalent clear error
- **AND** it does not scan arbitrary request-provided paths as a fallback

#### Scenario: Previous context snapshot is missing
- **WHEN** a client requests a project brief report and no previous AI context snapshot exists
- **THEN** the report identifies that no previous comparison baseline is available
- **AND** the report includes a non-blocking safe-state warning for the missing baseline
- **AND** it can still include current blockers, approval gates, and unresolved findings from current generated data
- **AND** first-run current signals are not labeled as changed since a previous report or baseline
- **AND** ordinary report retrieval does not write a new AI context snapshot

#### Scenario: No attention items exist
- **WHEN** generated scan data exists and no changed projects, unresolved findings, blockers, or approval gates are found
- **THEN** the report explicitly states that no attention items were found
- **AND** the report returns an empty items array rather than inventing a recommendation
- **AND** no-attention language is conditional on available generated local inputs rather than claiming that all projects are fine

### Requirement: Project brief report does not trigger automatic action

Projects Viewer SHALL keep project brief reports advisory and SHALL NOT use them to run commands, modify scanned projects, create commits, create external tasks, create calendar items, or trigger agent implementation work automatically.

#### Scenario: Brief includes high-priority attention item
- **WHEN** a project brief report includes a high-priority blocker, approval gate, or unresolved finding
- **THEN** Projects Viewer records or displays the item for review
- **AND** Projects Viewer does not run shell commands, edit project files, create commits, create external task/calendar records, or start agent work in response to the report
