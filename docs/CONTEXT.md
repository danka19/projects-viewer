# Context

This is the active glossary and domain-boundary file for Projects Viewer.

## Canonical Terms

| Term | Meaning | Notes |
|---|---|---|
| Scanned project | A configured local repository or folder whose documentation is read by Projects Viewer. | Paths come only from `projects.config.json`; browser requests must never provide arbitrary paths. |
| Dashboard project | This repository: `projects-viewer`. | The only project the scanner writes inside is the dashboard project, to `src/data/projects.json`. |
| Live mode | Browser connected to the local Express API from `server.mjs`. | Enables manual rescan, interval rescan, watcher status, and live data reloads. |
| Static mode | Browser using generated `src/data/projects.json` without local API access. | Rescan controls must be disabled because browser-only static pages cannot read local files or run Node code. |
| Manual rescan | User-triggered scan from the **Rescan docs** button. | Calls `POST /api/rescan`; respects single-flight and throttle rules. |
| Watcher rescan | Chokidar-triggered scan after documentation file changes. | Watches only documentation-like markdown files under configured project paths. |
| Interval rescan | Optional localStorage-backed fallback scan interval. | Off by default; minimum selectable interval is 5 minutes. |
| Skipped file | A path the scanner/watcher intentionally did not read or watch. | Reasons are logged, including unsafe folders, non-markdown files, and files larger than 1 MB. |

## Boundary Rules

- Scanned projects are read-only inputs; do not write, move, delete, or reformat files inside them.
- API endpoints must not accept project paths from the browser.
- The scanner and watcher must use only paths from `projects.config.json`.
- No cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning belongs in this app without an explicit future design decision.
- Raw documentation text is source data. Derived statuses, health scores, blockers, risks, and summaries are dashboard interpretations.
- Review-required proposals are not accepted decisions.
- LLM or heuristic output is proposal evidence only unless the project explicitly defines a reviewed acceptance workflow.
