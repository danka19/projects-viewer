# Project Management Specification

## ADDED Requirements

### Requirement: Persistent Tracked Project Config

Projects Viewer SHALL persist tracked projects and workspaces in `app-data/projects.config.json`.

#### Scenario: Legacy config is migrated

- **GIVEN** root `projects.config.json` exists and `app-data/projects.config.json` does not exist
- **WHEN** the local server initializes config
- **THEN** it writes a normalized config to `app-data/projects.config.json`
- **AND** scanned project folders are not modified

#### Scenario: Tracked project survives restart

- **GIVEN** a user adds a project through the dashboard
- **WHEN** the local server restarts
- **THEN** `GET /api/config` still includes the project

### Requirement: Read-Only Scanned Projects

Projects Viewer SHALL never write, delete, move, or reformat files inside tracked project paths.

#### Scenario: Remove project from dashboard

- **GIVEN** a project is tracked
- **WHEN** the user removes it from dashboard tracking
- **THEN** only the config entry is removed
- **AND** the actual project folder remains unchanged

### Requirement: Workspace Discovery

Projects Viewer SHALL discover candidate projects only inside saved workspace folders with depth caps and exclusion rules.

#### Scenario: Discover candidates without tracking all

- **GIVEN** a saved workspace contains multiple candidate folders
- **WHEN** the user runs discovery
- **THEN** the API returns candidates with detected reasons
- **AND** none are tracked until the user selects them

### Requirement: Enabled Project Scan Boundary

Projects Viewer SHALL scan and watch only enabled tracked projects from saved config.

#### Scenario: Disabled project is excluded

- **GIVEN** a tracked project has `enabled: false`
- **WHEN** a scan or watcher setup runs
- **THEN** that project path is excluded
