# Persistent Project And Workspace Management Design

Status: ready for human review before implementation planning.

Date: 2026-07-08.

## Problem

Projects Viewer currently depends on a manually edited root-level `projects.config.json`. The user cannot easily add a single project or a folder containing many projects from the dashboard, and the persistence model is unclear. Project tracking must survive app restarts and computer reboots, while keeping the app local-only and scanned projects read-only.

## Goals

- Add browser UI and local API support for managing tracked local projects.
- Store persistent user configuration in `app-data/projects.config.json`.
- Store generated scan output separately in `app-data/projects.generated.json`.
- Keep all writes inside the dashboard project, under `app-data/`.
- Keep scanned projects as read-only inputs.
- Allow manual path entry for both single projects and workspace folders.
- Discover candidate projects inside a workspace folder without automatically tracking all of them.
- Scan, watch, and auto-rescan only enabled tracked projects.
- Preserve existing tracked projects by migrating the current root `projects.config.json` on first startup.

## Non-Goals

- No cloud sync, auth, API keys, remote services, or shared database.
- No arbitrary shell commands.
- No whole-disk scanning.
- No browser-only persistence as the source of truth.
- No writes, deletes, moves, or formatting inside scanned projects.
- No automatic tracking of every discovered candidate.

## Recommended Approach

Implement a modular persistent-config and discovery layer.

- `server/project-config.mjs` owns config paths, default config creation, legacy migration, validation, stable ids, CRUD helpers, and atomic writes to `app-data/projects.config.json`.
- `server/project-discovery.mjs` owns safe workspace candidate discovery with depth caps and skip rules.
- `scan-projects.mjs` reads enabled projects from the canonical config and writes generated output to `app-data/projects.generated.json` by default.
- `server.mjs` wires the API endpoints, scan controller, watcher lifecycle, and Vite/static serving.
- The React app adds a live-mode `Manage Projects` workflow for adding projects, discovering workspaces, tracking selected candidates, enabling/disabling projects, editing labels/tags, removing tracking entries, and requesting rescans.

This is preferred over putting all logic into `server.mjs` because persistence, discovery, scanning, and UI state have different safety boundaries and test surfaces.

## Config Contract

Canonical file:

```json
{
  "workspaces": [
    {
      "id": "local-projects",
      "name": "Local Projects",
      "path": "D:/projects",
      "enabled": true,
      "discoveryDepth": 2
    }
  ],
  "projects": [
    {
      "id": "autoparts",
      "name": "AutoParts",
      "path": "D:/projects/AutoParts",
      "enabled": true,
      "tags": [],
      "createdAt": "2026-07-08T00:00:00.000Z",
      "updatedAt": "2026-07-08T00:00:00.000Z"
    }
  ],
  "settings": {
    "watchDocs": true,
    "autoRescanIntervalSec": 0
  }
}
```

Migration rule:

- On startup, if `app-data/projects.config.json` does not exist and root `projects.config.json` exists, migrate legacy entries.
- Legacy top-level `watchDocs` becomes `settings.watchDocs`.
- Legacy `activeDays` is preserved as optional `settings.activeDays` for scanner compatibility. If absent, the scanner keeps its default of 14 days.
- Legacy project entries receive stable ids, `enabled: true`, `tags: []`, and timestamps.
- The migration writes only inside `app-data/`; it does not rewrite scanned project folders.

Generated file:

```text
app-data/projects.generated.json
```

The live API reads generated dashboard data from this file. `src/data/projects.json` remains available as the static build fallback unless implementation planning chooses a safer compatibility path.

## API Design

`GET /api/config`

- Returns the canonical persistent config.

`POST /api/projects`

- Body: `{ "path": string, "name"?: string, "tags"?: string[] }`.
- Validates that `path` exists and is a directory.
- Adds one tracked project with a stable id, enabled by default.
- Writes the canonical config.
- Does not scan a path directly except through the saved validated config.

`PATCH /api/projects/:id`

- Supports updating `name`, `tags`, and `enabled`.
- Updates `updatedAt`.
- Does not allow changing `path`; moving a tracked project is handled by removing the old entry and adding the new path.

`DELETE /api/projects/:id`

- Removes the project from tracking only.
- Never deletes project files.

`POST /api/workspaces`

- Body: `{ "path": string, "name"?: string, "discoveryDepth"?: 1 | 2 | 3 }`.
- Validates that `path` exists and is a directory.
- Saves a workspace root in the canonical config.

`POST /api/workspaces/:id/discover`

- Discovers candidates only inside the saved workspace path.
- Returns candidates and detected reasons.
- Does not track candidates automatically.

`POST /api/projects/track-discovered`

- Body: `{ "paths": string[] }` or selected candidate payloads from the previous discovery response.
- Accepts only paths under saved workspace roots.
- Validates every selected path before saving.
- Deduplicates existing tracked projects.

`GET /api/projects`

- Returns generated dashboard data from `app-data/projects.generated.json`.

`POST /api/rescan`

- Rescans all enabled tracked projects from canonical config.
- Keeps existing single-flight and throttle behavior.

Optional implementation detail:

- `POST /api/projects/:id/rescan` can be added for the UI's "rescan this project" button by passing a temporary filtered saved config to the scan runner. If this adds too much risk, the first version can trigger a full enabled-project rescan and label the button accordingly.

## Discovery Rules

A directory is a candidate when it contains one or more of:

- `package.json`
- `README.md`
- `CLAUDE.md`
- `AGENTS.md`
- `docs/`
- `specs/`
- `.openspec/`
- `.git/`

Discovery constraints:

- Default depth is `2`; UI allows `1`, `2`, or `3`.
- Never recurse endlessly.
- Skip `node_modules`, `.git` internals, `dist`, `build`, `.next`, `coverage`, `vendor`, archives, media folders, databases, and large files.
- Do not follow symlinks or junctions.
- Do not scan the whole disk.
- Return reasons such as `README.md`, `package.json`, `docs/`, or `.openspec/`.

## UI Design

Add a `Manage Projects` control in the live dashboard header or top control panel. It opens a modal or full-width management section.

The workflow contains:

1. Add single project
   - Project path input.
   - Optional display name input.
   - Add project button.
   - Validation and success message.

2. Add workspace folder
   - Workspace/root path input.
   - Display name input.
   - Discovery depth selector: `1`, `2`, `3`.
   - Discover projects button.

3. Discovered projects list
   - Checkbox per candidate.
   - Project name.
   - Path.
   - Detected reason.
   - Track selected button.

4. Tracked projects list
   - Name.
   - Path.
   - Enabled toggle.
   - Tags.
   - Last scanned when available from generated data.
   - Remove from dashboard button.
   - Rescan this project button or full rescan fallback.

5. Persistence note
   - "Tracked projects are saved in `app-data/projects.config.json` and will remain after restart."

Static mode behavior:

- Management controls remain visible enough to explain the feature, but mutating controls are disabled because a static browser page cannot write local config files.

## Data Flow

1. User adds a project or workspace path in live mode.
2. API validates the local directory.
3. API writes `app-data/projects.config.json`.
4. User discovers workspace candidates or tracks selected candidates.
5. Rescan reads enabled projects from the canonical config.
6. Scanner writes `app-data/projects.generated.json`.
7. `GET /api/projects` returns generated data to the UI.
8. Watcher watches only enabled project roots and is refreshed when config changes.

## Error Handling

- Invalid path: return `400` with a user-readable message.
- Path does not exist or is not a directory: return `400`.
- Duplicate project path: return existing project instead of creating a duplicate, with a clear message.
- Path outside saved workspace during track-discovered: return `400`.
- Config write failure: return `500` and do not mutate in-memory state.
- Scan failure: keep existing scan status error behavior.
- Disabled project: keep it in config and management UI, but exclude from scans and watcher roots.

## Safety Requirements

- Browser/API requests must not directly trigger scans of unsaved arbitrary paths.
- All project and workspace paths must be validated before being saved.
- Discovery reads only directory entries and marker filenames needed to identify candidates.
- Scanner reads only documentation files under enabled tracked project roots.
- Watcher watches only enabled tracked project roots.
- Delete means remove tracking entry from config only.
- All writes remain inside `app-data/` or existing dashboard-generated static fallback files.

## Testing And Verification

Automated tests should cover:

- Legacy root config migration to `app-data/projects.config.json`.
- Stable id generation and duplicate handling.
- Adding a project validates directories and writes config.
- Removing a project changes config but never touches project files.
- Disabling a project excludes it from scan input.
- Workspace discovery respects depth, markers, exclusions, and symlink skipping.
- Track-discovered accepts only candidates under saved workspaces.
- `runScan()` writes generated output to the configured output path.
- Existing scan-controller single-flight behavior remains intact.

Manual verification should cover:

- Add one project from the UI.
- Restart the local server and confirm the project remains tracked.
- Add one workspace folder.
- Discover projects.
- Track selected projects.
- Restart again and confirm tracked projects persist.
- Run rescan and confirm the dashboard uses saved config.
- Disable a project and confirm it is not scanned or watched.

## Documentation Updates

Implementation must update:

- `README.md` with UI-based project management instructions.
- `docs/README.md` current state.
- `docs/00_FILE_STRUCTURE.md` for `app-data/`, new server modules, and generated output.
- `docs/CONTEXT.md` for canonical config, workspace, discovered candidate, and generated scan data terms.
- `docs/CURRENT_PROJECT_AUDIT.md` with verification evidence and any residual risks.

## Legacy Root Config Decision

After migration, root `projects.config.json` is no longer the runtime source. The server and scanner use `app-data/projects.config.json`. The root file may remain as a legacy seed or example during the transition, but app code must not write to it and documentation must direct users to `app-data/projects.config.json`.
