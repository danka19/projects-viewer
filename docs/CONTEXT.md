# Context

This is the active glossary and domain-boundary file for Projects Viewer.

## Canonical Terms

| Term | Meaning | Notes |
|---|---|---|
| Scanned project | A configured local repository or folder whose documentation is read by Projects Viewer. | Paths come only from `app-data/projects.config.json`; browser requests must never provide arbitrary scan paths. |
| Dashboard project | This repository: `projects-viewer`. | Runtime writes stay inside the dashboard project, primarily under `app-data/`. |
| Canonical project config | `app-data/projects.config.json`, the local source of truth for tracked projects, workspaces, and settings. | The root `projects.config.json` is a legacy seed/example after migration. |
| Workspace | A saved discovery input that points at a workspace root. | Workspaces are discovery inputs only, not scanned projects. |
| Workspace root | A saved local parent folder where discovery looks for project folders. | Example: `C:\Users\me\Documents\projects`; the workspace root itself is not a discovered project. |
| Discovered project candidate | A real project-root candidate found under a workspace root. | By default only immediate child folders are inspected; candidates are not tracked until selected and confirmed. |
| Tracked project | A project entry explicitly saved in `app-data/projects.config.json`. | Manual project add and **Track selected** create tracked projects. |
| Internal folder | A project subfolder such as `docs`, `openspec`, `src`, `tests`, `web`, `frontend`, or `backend` that discovery must never show as a project. | Scanner code may still read documentation inside internal folders after the parent project is tracked. |
| Generated scan data | `app-data/projects.generated.json`, the live generated dashboard data written by scanner runs. | `src/data/projects.json` remains a static fallback artifact for browser-only mode. |
| Disabled tracked project | A saved project with `enabled: false`. | It remains in config but is excluded from scanner, watcher, manual rescan, and interval rescan. |
| Live mode | Browser connected to the local Express API from `server.mjs`. | Enables manual rescan, interval rescan, watcher status, and live data reloads. |
| Static mode | Browser using generated `src/data/projects.json` without local API access. | Rescan and project-management controls must be disabled because browser-only static pages cannot read or write local files. |
| Manual rescan | User-triggered scan from the **Rescan docs** button. | Calls `POST /api/rescan`; respects single-flight and throttle rules. |
| Watcher rescan | Chokidar-triggered scan after documentation file changes. | Watches only documentation-like markdown files under configured project paths. |
| Interval rescan | Optional localStorage-backed fallback scan interval. | Off by default; minimum selectable interval is 5 minutes. |
| Skipped file | A path the scanner/watcher intentionally did not read or watch. | Reasons are logged, including unsafe folders, non-markdown files, and files larger than 1 MB. |
| Human owner | The person using Projects Viewer to decide priorities, review gates, accepted decisions, and product direction. | The human owner keeps final product, UX, data-source, security, and business-scope decisions. |
| AI implementation agent | An AI assistant using project context before planning, coding, or reviewing implementation work. | It must treat AI context as preflight evidence, then verify against source files before changing code or docs. |
| AI reviewer/checker agent | An AI assistant focused on risks, blockers, stale docs, missing verification, contradiction signals, or acceptance evidence. | It can produce review-required observations but cannot accept decisions or trigger work automatically. |
| AI preflight context | Compact project context derived from generated scan data for use before AI work starts. | It omits raw markdown bodies by default and preserves source evidence where available. |
| Agent preflight packet | Implemented AI-agent-oriented JSON packet for required reading, active change context, acceptance mapping, attention signals, verification expectations, and safety boundaries before agent work. | Implemented under `openspec/changes/agent-preflight-packet/` and ready for human acceptance review; it is separate from the daily/weekly human project brief and does not start agent work. |
| AI finding | A deterministic or future AI-generated review-required observation derived from scan signals. | It is proposal evidence only until a human handles it through an explicit review workflow. |
| Project brief | Implemented daily or weekly JSON report of project changes, blockers, review-required findings, and recommended human decisions. | Exposed through `GET /api/project-brief-report`; separate from the agent preflight packet. |
| Raw scanned documentation | Markdown source files read from saved tracked project paths. | This is source data for scans; the dashboard must not modify it. |
| Dashboard interpretation | Derived status, health, blocker, risk, gap, summary, or next-action signal produced from scanned documentation. | Useful for triage, but not an accepted project decision by itself. |
| Project timeline | Implemented horizontal visualization of ordered project phases with one optional expanded child-step timeline. | Canonical behavior and the still-open human clarity gate are in `openspec/changes/redesign-dashboard-project-timeline/`; the component preserves the theme/status vocabulary and remains read-only. |
| Current phase / current step identity | Explicit trusted identifier naming the lifecycle item currently being executed. | Timeline presentation must not infer this identity from arbitrary prose, agent rules, templates, examples, or historical checkboxes. Null means no unambiguous current item. |
| Timeline expansion state | UI-only identity of the phase whose child steps are currently visible. | Expansion is not lifecycle status and does not make a phase current, active, accepted, or blocked. |
| Timeline integrity issue | Structured warning that ordered/current phase or step data is ambiguous, duplicate, incomplete, or parser/documentation-derived with insufficient confidence. | The UI may remain inspectable but must not fabricate current emphasis or hide the warning. |
| AI context snapshot | `app-data/ai.context.snapshot.json`, the local compact context snapshot used for changes-since comparison. | Runtime cache only; safe to regenerate or reset. |
| AI findings store | `app-data/ai.findings.generated.json`, the local findings and review-state store. | Review-required evidence only; `accepted` means accepted as a finding state, not accepted as a project decision. |
| Static fallback data | `src/data/projects.json`, build/static-mode fallback data. | Not live source of truth when the local API is available. |
| Accepted project decision | A decision recorded in accepted OpenSpec specs, phase plans, audit files, context docs, or another reviewed durable project document. | Generated runtime files cannot create accepted decisions on their own. |
| Finding review state | The human-facing handling state for an AI finding: `new`, `accepted`, `dismissed`, or `stale`. | It describes handling of the finding record only; it does not approve implementation work or rewrite project truth. |

## Boundary Rules

- Scanned projects are read-only inputs; do not write, move, delete, or reformat files inside them.
- API endpoints may accept project/workspace paths only to validate and save them in canonical config; scan and watcher code must not use unsaved arbitrary request paths.
- The scanner and watcher must use only enabled project paths from `app-data/projects.config.json`.
- Removing a tracked project means removing only the config entry, never deleting the actual project folder.
- No cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning belongs in this app without an explicit future design decision.
- Raw documentation text is source data. Derived statuses, health scores, blockers, risks, and summaries are dashboard interpretations.
- Review-required proposals are not accepted decisions.
- LLM or heuristic output is proposal evidence only unless the project explicitly defines a reviewed acceptance workflow.
- AI preflight context, agent preflight packets, and project briefs must not grant AI authority to run commands, create commits, update task systems, or edit scanned projects.
- Runtime writes are limited to the dashboard project, especially `app-data/projects.config.json`, `app-data/projects.generated.json`, `app-data/ai.context.snapshot.json`, and `app-data/ai.findings.generated.json`.
- `app-data/projects.generated.json`, AI context snapshots, and AI findings are derived from saved config and scanned documentation; they may guide review, but they must not replace source files or accepted project documents.
- New data sources such as cloud sync, remote model providers, databases, task/calendar systems, or external issue trackers require explicit future design approval and OpenSpec coverage before implementation.
- A finding review state can prioritize human attention, but it must not trigger implementation, task creation, commits, shell commands, external notifications, or scanned-project edits.
- Dashboard selection, timeline expansion, and detail-drawer state are presentation state only; they must not alter lifecycle status or accepted project decisions.
- A primary timeline/overview may display derived lifecycle data only with explicit current identity, source/confidence, and visible integrity handling; visual emphasis must not convert a dashboard interpretation into project truth.
