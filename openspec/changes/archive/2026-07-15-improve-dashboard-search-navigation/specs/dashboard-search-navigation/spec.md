## ADDED Requirements

### Requirement: Global search ranks trustworthy sources deterministically

Projects Viewer SHALL rank exact project identity and current roadmap/work sources ahead of historical documents and filtered diagnostics, and SHALL use deterministic tie-breakers independent of source iteration order.

#### Scenario: Current sources and historical documents match
- **WHEN** one query matches a configured project, an active roadmap phase, a current next action, an ordinary task, and a documentation file
- **THEN** the project and current roadmap/work hits appear before the ordinary task and document hits
- **AND** repeated searches over equivalent input produce the same order

#### Scenario: Equal-score results match
- **WHEN** multiple hits have the same source score
- **THEN** Projects Viewer orders them deterministically by project identity result label and stable source file line kind identity
- **AND** every rendered hit has stable identity that does not depend on array index

#### Scenario: One evidence item appears in more than one source collection
- **WHEN** the same project file line and text appear as both a next action and an ordinary open task
- **THEN** Projects Viewer returns one hit for that evidence
- **AND** the retained hit uses the higher-trust next-action rank and navigation target

### Requirement: Search discloses result scope and diagnostics

Projects Viewer SHALL exclude filtered parser diagnostics by default, SHALL expose an explicit diagnostic opt-in, and SHALL disclose the true included-result total and any render truncation.

#### Scenario: Diagnostics match while opt-in is disabled
- **WHEN** a query matches ordinary sources and filtered parser diagnostics and diagnostic opt-in is off
- **THEN** diagnostic hits are absent from the result options
- **AND** the UI reports how many matching diagnostics are available to include

#### Scenario: Filtered diagnostic evidence is also extracted as a task
- **WHEN** the same project file line and text appear in filtered diagnostics and an ordinary task collection
- **THEN** diagnostic opt-in off returns neither a diagnostic nor a task representation for that evidence
- **AND** diagnostic opt-in on returns one explicitly labelled diagnostic representation after higher-trust results

#### Scenario: User includes diagnostics
- **WHEN** the user activates the diagnostic opt-in
- **THEN** matching diagnostic hits appear after higher-trust results
- **AND** each diagnostic is visibly identified as diagnostic context rather than current work

#### Scenario: More than forty included results match
- **WHEN** the ranked included result set contains more than forty hits
- **THEN** the UI renders at most forty options
- **AND** it displays `Showing 40 of N results` using the true included total
- **AND** N is computed from all scanner-bounded matching source items before render truncation

### Requirement: Search results are keyboard and assistive-technology operable

The global search SHALL use a labelled combobox/listbox pattern, SHALL expose visible project and result-type context, and SHALL support deterministic keyboard navigation without requiring pointer or hover input.

#### Scenario: Keyboard user traverses results
- **WHEN** the focused search input has results and the user presses ArrowDown, ArrowUp, Home, or End
- **THEN** the active result moves within the ranked option sequence
- **AND** the input exposes the active option relationship

#### Scenario: Keyboard user activates or dismisses search
- **WHEN** an active result exists and the user presses Enter
- **THEN** Projects Viewer opens that result through the same read-only navigation path as pointer activation
- **AND** when the user presses Escape the popup closes, with a second Escape clearing the query when focus remains in search

#### Scenario: Results span projects and types
- **WHEN** a query matches more than one project or result type
- **THEN** visible group/type labels and project context distinguish the options
- **AND** grouping does not change the canonical flat score order for rendering or keyboard traversal

### Requirement: Search navigation preserves retrieval context

Opening a search result SHALL preserve the current query and project-status filter while selecting the result project and requested detail surface.

#### Scenario: Result belongs outside the current sidebar filter
- **WHEN** a user opens a result whose project does not match the active project-status filter
- **THEN** that project becomes the selected project
- **AND** the existing status filter and query remain unchanged
- **AND** the result's requested tab, knowledge subview, and read-only drawer open when provided

### Requirement: Safe dashboard UI context survives reload

Projects Viewer SHALL persist selected project, project-status filter, active detail surface, knowledge subview, query, diagnostic opt-in, revision-scoped expanded phase identity, and a minimal drawer source descriptor in versioned local browser storage and namespaced browser history state, and SHALL restore only values valid for the current loaded data and supported UI contracts.

#### Scenario: Stored state is valid
- **WHEN** the page reloads with a stored project path that exactly matches a currently loaded configured project and supported enum values
- **THEN** the selected project, filter, surfaces, query, and diagnostic choice are restored

#### Scenario: Timeline expansion matches current model revision
- **WHEN** stored timeline identity matches the selected project model revision and an existing phase key
- **THEN** that phase is restored as expanded without restoring stale focus or origin controls
- **AND** a different revision or missing phase key falls back to the model's safe initial state

#### Scenario: Drawer descriptor resolves to current evidence
- **WHEN** a stored drawer descriptor matches exactly one current loaded project item by project stable kind file and optional line
- **THEN** Projects Viewer recreates the drawer through the current read-only drawer mapping
- **AND** stale serialized drawer text or status is never trusted
- **AND** an unresolved or ambiguous descriptor is discarded without opening a drawer

#### Scenario: Stored state is corrupt or stale
- **WHEN** stored JSON is corrupt, the version is unknown, the project is no longer loaded, or an enum value is unsupported
- **THEN** each invalid field falls back to its safe default
- **AND** the page still renders without an exception

#### Scenario: Browser storage is unavailable
- **WHEN** reading or writing localStorage throws
- **THEN** Projects Viewer continues with in-memory defaults and current UI behavior
- **AND** no failure is sent to a remote service or converted into an API path request

#### Scenario: User navigates browser history
- **WHEN** the user moves backward or forward across dashboard project/tab/filter/drawer/timeline navigation entries
- **THEN** Projects Viewer restores the namespaced state through the same loaded-project enum revision and evidence validation used for local storage
- **AND** transient query typing replaces rather than floods history entries
- **AND** no raw project path is added to the URL

#### Scenario: History state belongs to another feature or is malformed
- **WHEN** `history.state` lacks a supported Projects Viewer namespace/version or contains invalid fields
- **THEN** Projects Viewer ignores the foreign or invalid fields and uses safe current defaults

### Requirement: Search and persistence preserve read-only safety boundaries

Search and restored UI context SHALL operate only on already loaded configured project data and SHALL NOT modify scanned projects or trigger external actions.

#### Scenario: Stored project path does not match loaded data
- **WHEN** localStorage contains an arbitrary or previously configured path that is absent from the current scan
- **THEN** Projects Viewer ignores it and selects a current safe fallback
- **AND** it does not submit the path to scan, config, file, command, task, calendar, auth, remote, or agent APIs

### Requirement: Detail navigation is keyboard complete

Project detail tablists and the read-only detail drawer SHALL implement complete keyboard, ARIA relationship, modal focus-transfer, focus-containment, and focus-return behavior.

#### Scenario: Keyboard user navigates detail tabs
- **WHEN** focus is on either project detail tablist and the user presses ArrowLeft, ArrowRight, Home, or End
- **THEN** roving focus and selection move to the corresponding enabled tab
- **AND** each tab exposes `aria-controls` for one labelled `tabpanel`

#### Scenario: Search or timeline opens the detail drawer
- **WHEN** a result control opens the read-only drawer
- **THEN** focus moves into the drawer
- **AND** Tab and Shift+Tab remain contained within the modal controls
- **AND** background dashboard content is inert while the drawer is open
- **AND** closing the drawer restores focus to the originating control when it still exists
