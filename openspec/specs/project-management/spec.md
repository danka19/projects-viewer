# Project Management Specification

## Purpose

Define persistent local project/workspace management while keeping scanned project folders read-only.

## Roadmap

- Roadmap phase: P0
- Related phases: none

## Requirements

### Requirement: Persistent Tracked Project Config

Projects Viewer SHALL persist tracked projects and workspaces in `app-data/projects.config.json`, the only runtime tracked-project config source.

#### Scenario: Canonical config is created without legacy migration

- **GIVEN** `app-data/projects.config.json` does not exist
- **WHEN** the local server initializes config
- **THEN** it creates an empty normalized config at `app-data/projects.config.json`
- **AND** it does not migrate or read root `projects.config.json`
- **AND** scanned project folders are not modified

#### Scenario: Tracked project survives restart

- **GIVEN** a user adds a project through the dashboard
- **WHEN** the local server restarts
- **THEN** `GET /api/config` still includes the project

#### Scenario: User can browse for a folder path

- **GIVEN** the dashboard is running in live mode
- **WHEN** the user clicks Browse in Manage Projects and selects a folder
- **THEN** the selected absolute folder path is inserted into the relevant path field
- **AND** manual path entry remains available

### Requirement: Read-Only Scanned Projects

Projects Viewer SHALL never write, delete, move, or reformat files inside tracked project paths.

#### Scenario: Remove project from dashboard

- **GIVEN** a project is tracked
- **WHEN** the user removes it from dashboard tracking
- **THEN** only the config entry is removed
- **AND** the actual project folder remains unchanged

### Requirement: Workspace Discovery

Projects Viewer SHALL treat a saved workspace folder as a workspace root, discover real project candidates separately from tracked projects, and keep internal project folders out of selectable discovery results.

#### Scenario: Discover candidates without tracking all

- **GIVEN** a saved workspace contains multiple candidate folders
- **WHEN** the user runs discovery
- **THEN** the API returns candidates with detected reasons
- **AND** none are tracked until the user selects them

#### Scenario: Default discovery inspects immediate children only

- **GIVEN** a workspace root contains a project with internal folders such as `docs`, `.pytest_cache`, `openspec`, `web`, or `src`
- **WHEN** discovery runs with default settings
- **THEN** only immediate child project roots with enough project-root signals are returned
- **AND** internal folders are returned only as skipped debug entries

#### Scenario: Nested discovery is explicit

- **GIVEN** a saved workspace has `allowNestedProjects: false`
- **WHEN** discovery runs
- **THEN** nested folders are not returned as project candidates
- **AND** when `allowNestedProjects: true`, nested candidates still require strong project-root signals and ignored/internal folder names remain excluded

#### Scenario: Track selected validates candidates before writing config

- **GIVEN** the user selected discovered project paths
- **WHEN** the user clicks Track selected
- **THEN** each selected path is validated for existence, workspace membership, ignored/internal folder names, duplicate tracked projects, nested project rules, and project-root signals
- **AND** invalid selections are rejected without partially adding projects

### Requirement: Enabled Project Scan Boundary

Projects Viewer SHALL scan and watch only enabled tracked projects from saved config.

#### Scenario: Disabled project is excluded

- **GIVEN** a tracked project has `enabled: false`
- **WHEN** a scan or watcher setup runs
- **THEN** that project path is excluded
