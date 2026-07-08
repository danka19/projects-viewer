# Add Persistent Project Management

## Why

Users need to add single projects and workspace folders from the local dashboard without losing tracked project settings after app restart or computer reboot.

## What Changes

- Add canonical persistent config at `app-data/projects.config.json`.
- Add generated scan output at `app-data/projects.generated.json`.
- Add local management APIs for project and workspace CRUD/discovery.
- Add dashboard UI for adding, discovering, tracking, disabling, and removing tracked project entries.
- Filter scanner and watcher inputs to enabled projects from saved config.

## Impact

- Affects scanner input contract, generated output location, Express API, watcher setup, dashboard UI, README operations, and local persistence rules.
- Keeps scanned projects read-only and local-only.
