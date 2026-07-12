## ADDED Requirements

### Requirement: Local project config uses one runtime source

Projects Viewer SHALL use `app-data/projects.config.json` as the only runtime source for tracked projects and workspaces.

#### Scenario: Clean startup creates empty canonical config

- **WHEN** Projects Viewer starts and `app-data/projects.config.json` is absent
- **THEN** it creates or treats the canonical config as empty
- **AND** it does not add tracked projects or workspaces by default

#### Scenario: Root config is ignored at runtime

- **WHEN** root `projects.config.json` exists
- **AND** `app-data/projects.config.json` is absent
- **THEN** Projects Viewer does not migrate, seed, or read tracked projects from the root file
- **AND** no `Example Project` appears unless the user explicitly adds it through supported project management behavior

### Requirement: Example config has no tracked projects

Projects Viewer SHALL keep any versioned example config separate from runtime config and free of real tracked project entries.

#### Scenario: Example config is present

- **WHEN** a versioned example config file exists
- **THEN** it contains no real local project paths
- **AND** it is not read by startup, scanning, watcher setup, project management APIs, or MCP tools as runtime config

### Requirement: Runtime config changes remain user-driven

Projects Viewer SHALL add, disable, or remove tracked projects only through explicit project management APIs, UI actions, or direct edits to `app-data/projects.config.json`.

#### Scenario: Scan runs with no configured projects

- **WHEN** the canonical config contains no enabled projects
- **THEN** scan output reports an empty project list without adding default projects
- **AND** scanned project folders are not modified
