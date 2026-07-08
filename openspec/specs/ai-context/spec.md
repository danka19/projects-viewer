## Purpose

Define local AI-readable context contracts over generated Projects Viewer scan data.

## Requirements

### Requirement: AI context uses generated scan data

Projects Viewer SHALL build AI context only from existing generated scan output for enabled tracked projects.

#### Scenario: All-project context uses generated output

- **WHEN** a client requests AI context for all projects
- **THEN** the response is derived from the current generated scan output
- **AND** the request does not accept arbitrary project paths
- **AND** scanned project folders are not modified

#### Scenario: Missing generated output is reported

- **WHEN** a client requests AI context before generated scan data is available
- **THEN** the API returns a clear error or empty-state response
- **AND** the API does not scan arbitrary request-provided paths as a fallback

### Requirement: AI context is compact by default

Projects Viewer SHALL expose a compact AI context view that contains the project state signals needed for agent preflight without returning full raw markdown content by default.

#### Scenario: Project context contains preflight fields

- **WHEN** a client requests AI context for one project
- **THEN** the response includes project identity, status, status reason, health score, current phase, next action, main blocker, main risk, recent decision, gaps, and selected source-backed lists for constraints, risks, decisions, specs, and audits
- **AND** the response omits full raw markdown document bodies

#### Scenario: All-project context is suitable for triage

- **WHEN** a client requests AI context for all projects
- **THEN** the response includes enough compact data to identify projects that are active, stalled, done, unknown, or need attention
- **AND** the response includes enough compact data to identify projects waiting on a human decision or approval gate

### Requirement: AI context preserves evidence

Projects Viewer SHALL preserve source evidence for AI-consumable context items whenever source evidence exists in scan output.

#### Scenario: Context item references source location

- **WHEN** a context item is derived from a task, blocker, risk, decision, audit, spec, phase, or documentation gap with source evidence
- **THEN** the context item includes the project-relative source file
- **AND** the context item includes the source line number when available

#### Scenario: Derived summary identifies missing evidence

- **WHEN** a context item is derived from a summary field without a direct source line
- **THEN** the context item remains marked as derived summary data
- **AND** it is not presented as a quoted source fact

### Requirement: AI context reports meaningful changes between scans

Projects Viewer SHALL provide an AI-readable changes-since view over derived project-state fields.

#### Scenario: Project status changed after timestamp

- **WHEN** a client requests changes since a timestamp and a project's status, status reason, current phase, next action, blocker summary, risk summary, gaps, or findings changed after that timestamp
- **THEN** the response includes that project in the changed projects list
- **AND** the response identifies the changed field categories

#### Scenario: No meaningful changes found

- **WHEN** a client requests changes since a timestamp and no tracked derived project-state fields changed
- **THEN** the response explicitly reports that no meaningful AI-context changes were found

### Requirement: AI context stays local-only

Projects Viewer SHALL keep AI context access local to the dashboard server and SHALL NOT require cloud services, external model providers, API keys, or remote synchronization.

#### Scenario: AI context endpoint works without model credentials

- **WHEN** the local server is running and generated scan data exists
- **THEN** AI context endpoints can return deterministic context without any model provider credentials

#### Scenario: Remote provider is not required

- **WHEN** AI context is requested
- **THEN** Projects Viewer does not call a remote LLM provider as part of this capability
