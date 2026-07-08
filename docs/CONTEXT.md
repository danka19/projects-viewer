# Context

This is the active glossary and domain-boundary file for Projects Viewer.

## Canonical Terms

| Term | Meaning | Notes |
|---|---|---|
| Scanned project | A configured local repository or folder whose documentation is read by Projects Viewer. | Paths come only from `app-data/projects.config.json`; browser requests must never provide arbitrary scan paths. |
| Dashboard project | This repository: `projects-viewer`. | Runtime writes stay inside the dashboard project, primarily under `app-data/`. |
| Canonical project config | `app-data/projects.config.json`, the local source of truth for tracked projects, workspaces, and settings. | The root `projects.config.json` is a legacy seed/example after migration. |
| Workspace | A saved local root folder that may contain multiple projects. | Workspaces are discovery inputs only; candidates are not tracked until selected. |
| Discovered project candidate | A folder found under a saved workspace because it has markers such as `README.md`, `package.json`, `docs/`, `.openspec/`, or `.git/`. | Candidate detection does not automatically add it to tracked projects. |
| Generated scan data | `app-data/projects.generated.json`, the live generated dashboard data written by scanner runs. | `src/data/projects.json` remains a static fallback artifact for browser-only mode. |
| Disabled tracked project | A saved project with `enabled: false`. | It remains in config but is excluded from scanner, watcher, manual rescan, and interval rescan. |
| Live mode | Browser connected to the local Express API from `server.mjs`. | Enables manual rescan, interval rescan, watcher status, and live data reloads. |
| Static mode | Browser using generated `src/data/projects.json` without local API access. | Rescan and project-management controls must be disabled because browser-only static pages cannot read or write local files. |
| Manual rescan | User-triggered scan from the **Rescan docs** button. | Calls `POST /api/rescan`; respects single-flight and throttle rules. |
| Watcher rescan | Chokidar-triggered scan after documentation file changes. | Watches only documentation-like markdown files under configured project paths. |
| Interval rescan | Optional localStorage-backed fallback scan interval. | Off by default; minimum selectable interval is 5 minutes. |
| Skipped file | A path the scanner/watcher intentionally did not read or watch. | Reasons are logged, including unsafe folders, non-markdown files, and files larger than 1 MB. |

## Boundary Rules

- Scanned projects are read-only inputs; do not write, move, delete, or reformat files inside them.
- API endpoints may accept project/workspace paths only to validate and save them in canonical config; scan and watcher code must not use unsaved arbitrary request paths.
- The scanner and watcher must use only enabled project paths from `app-data/projects.config.json`.
- Removing a tracked project means removing only the config entry, never deleting the actual project folder.
- No cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning belongs in this app without an explicit future design decision.
- Raw documentation text is source data. Derived statuses, health scores, blockers, risks, and summaries are dashboard interpretations.
- Review-required proposals are not accepted decisions.
- LLM or heuristic output is proposal evidence only unless the project explicitly defines a reviewed acceptance workflow.
