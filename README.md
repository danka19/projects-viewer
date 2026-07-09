# Projects Viewer

A local, read-only **project radar** that scans the documentation of your projects and answers three questions at a glance: *what is the status of each project, what should I do next, and what needs attention?*

## How the interface works

The main screen is deliberately calm — details are one click away (progressive disclosure):

- **Top metric bar** — total / active / needs-attention / stalled / done projects, open next actions, docs coverage. Every card is clickable: status cards filter the project list, "Next actions" opens the Tasks tab, "Docs coverage" opens the Documentation tab.
- **Left sidebar** — compact project cards with status orb, health score (0–100), one-line status reason, and last update. Filter chips by status; click a card to select the project.
- **Project radar panel** — the selected project's summary: health ring, current phase, next action, main blocker, recent decision, recent change, and a 5-slot doc-coverage strip. Every tile is clickable and jumps to the right tab or opens the detail drawer.
- **Focus cards (Overview tab)** — max 3 items each for Next up, Work constraints (Real blockers / Approval gates / Needs review / Paused), Needs attention, and Recent decisions, with "View all →" buttons.
- **Tabs** — Overview · Roadmap · SDD/Specs (grouped by status) · Tasks · Decisions · Audits (grouped: attention/latest/recorded/archived) · Documentation (coverage map with per-category file lists and filename search) · Activity (change timeline). Only the selected tab renders its lists.
- **Roadmap tab** — a segmented progress bar that separates fully-completed / pending-approval / in-progress / blocked-paused / planned phases (pending-approval work is deliberately *not* counted as finished), plus expandable phase cards. Collapsed: number, title, status badge, step-based progress %, confidence dot, source file. Expanded: a "Why this status?" panel (raw `Status:` text, matched parser rule, confidence, source `file:line`, suspected stale-doc warnings), detected steps with colored status dots and counts, and related decisions/audits. `npm run scan` also prints a **Roadmap Status Diagnostics** table per project with the same transparency data.
- **Detail drawer** — click any phase, task, decision, blocker, audit, spec, or doc file to open a right-side drawer with its type, status, extracted text, `file:line` source, a copy-path button, and related items. Esc closes it.
- **Global search** (`/` to focus) — searches projects, roadmap phases, tasks, blocked work, decisions, specs, and doc filenames across all projects; clicking a result selects the project, opens the right tab, and opens the drawer.

The health score is derived from documentation coverage, blocker/rejection counts, attention markers, staleness, and next-action clarity — it is a documentation-health signal, not a judgment of the code.

- **Read-only by design.** The scanner only *reads* whitelisted markdown files inside your projects. It never writes to, moves, or modifies them. Runtime writes stay inside this dashboard folder, primarily under `app-data/`.
- **Fully local.** No database, no auth, no cloud, no API keys.
- **AI preflight context, agent packets, and project brief reports.** Local API endpoints expose compact, evidence-linked project context, review-required findings, an agent-oriented preflight packet, and an advisory daily/weekly project brief report derived from generated scan data. They do not call model providers and do not write to scanned project folders.

Stack: Vite + React + TypeScript + Tailwind CSS + a local Express server, Chokidar watcher, and a plain Node.js scanner script.

## Quick start

```bash
npm install      # once
npm run scan     # reads app-data/projects.config.json -> writes app-data/projects.generated.json
npm run dev      # starts the live dashboard at http://127.0.0.1:5173
```

On first local-server or scan startup, the app migrates a legacy root `projects.config.json` into `app-data/projects.config.json` if the new config does not exist. Use **Manage Projects** to add one project, add a workspace folder, discover candidates, and track selected projects without editing JSON by hand.

## Project setup and command reference

Initial setup:

1. Install Node.js 20 or newer.
2. Run `npm install` in the dashboard folder.
3. Run `npm run dev` and open `http://127.0.0.1:5173`.
4. Open **Manage Projects** and add tracked project paths or workspace folders.

Common commands:

| Command | Use |
|---|---|
| `npm install` | Install local dependencies. Run once after cloning, and again when `package-lock.json` changes. |
| `npm run scan` | Run a one-time read-only documentation scan and write `app-data/projects.generated.json`. |
| `npm run dev` | Start the local live dashboard: Express API, Vite middleware, startup scan, and watcher. |
| `npm run build` | Type-check the app and build the static frontend into `dist/`. |
| `npm run server` | Serve the built frontend through the same local Express API. Run `npm run build` first. |
| `npm run preview` | Alias for serving the built dashboard through `server.mjs`. |
| `npm run start` | Alias for serving the built dashboard through `server.mjs`. |
| `npm test` | Run the Node test suite for scanner/server behavior. |

Local URLs and ports:

- The default live URL is `http://127.0.0.1:5173`.
- In PowerShell, run `$env:PORT=5174; npm run dev` if you need a different port.
- In PowerShell, run `$env:HOST="127.0.0.1"; npm run dev` if you need to override the bind host.

Development workflow:

1. Keep `npm run dev` running while editing.
2. Change code or docs.
3. Let Vite reload the frontend and let the watcher rescan configured project docs.
4. Use **Manage Projects** to adjust tracked projects when needed.
5. Use **Rescan docs** for an immediate manual scan when needed.
6. Run `npm test` and `npm run build` before committing code changes.

Server lifecycle rule:

- Do not stop the local dashboard server automatically at the end of agent work.
- If the server is already running, leave it running unless a restart is required to pick up backend changes.
- If the server is not running and the user needs the dashboard, start it and report the URL.
- Restart the server only when necessary, for example after backend/server changes or when the current process is serving the wrong branch.

## Live mode, static mode, and rescans

`npm run dev` starts `server.mjs`, which runs the local Express API and uses Vite middleware for the frontend. The server performs a startup scan, exposes live rescan endpoints, and watches configured documentation files for changes.

Useful commands:

```bash
npm run scan     # one-time CLI scan
npm run dev      # live local dashboard with Vite middleware
npm run build    # type-check and build the static frontend
npm run server   # serve the built frontend through the local server
npm run preview  # same as server
```

The dashboard has two data modes:

- **Live mode** appears when the page can reach the local Express API. The top-right panel enables **Rescan docs**, shows scan status, last scanned time, duration, scanned/skipped counts, error text, and the trigger (`manual`, `watcher`, `interval`, or `startup`).
- **Static mode** appears when the API is unavailable. The page falls back to the generated `src/data/projects.json`; rescanning and project management are disabled because a browser-only static build cannot read or write local files. Start `npm run dev` or `npm run server` to enable live rescans and project management.

Manual rescan:

1. Click **Rescan docs** in the top-right panel.
2. The button disables while scanning.
3. The frontend calls `POST /api/rescan`.
4. After the scan completes, the frontend reloads data from `GET /api/projects`.

Automatic interval rescan is optional and off by default. The selector supports **Off / 5 min / 15 min / 30 min**, stores the choice in `localStorage`, never offers intervals below 5 minutes, and skips interval scans while another scan is running or shortly after a watcher-triggered scan.

File watcher behavior:

- Enabled by default when running the local server.
- Watches only documentation-like markdown files inside enabled tracked project paths from `app-data/projects.config.json`.
- Debounces changes by 3 seconds.
- Never starts two scans at the same time.
- If a change happens during a scan or inside the 30-second throttle window, one extra scan is queued or delayed.
- The UI shows `Docs changed · rescanned automatically` after watcher scans.

To disable the watcher, set `"watchDocs": false` in `app-data/projects.config.json` under `settings`. Manual and interval rescans still work in live mode.

## Manage Projects

Tracked projects are stored in `app-data/projects.config.json`, so they remain after restarting the local server or rebooting the computer.

### Add one project

1. Start live mode with `npm run dev`.
2. Open **Manage Projects**.
3. Click **Browse** to choose a project folder, or paste an absolute project folder path manually.
4. Optionally enter a display name.
5. Click **Add project**.
6. Click **Rescan docs** or **Rescan enabled** to refresh dashboard data.

### Add a workspace folder

1. Open **Manage Projects**.
2. Click **Browse** to choose a folder that contains multiple projects, or paste an absolute folder path manually.
3. Enter a display name.
4. Keep discovery depth at `1` for normal workspace roots.
5. Enable nested project discovery only when the workspace intentionally contains real projects below the first child level.
6. Click **Discover projects**.

A **workspace root** is the parent folder where Projects Viewer looks for projects, for example `C:\Users\me\Documents\projects`. The workspace root is not tracked as a project by discovery.

A **discovered project** is a candidate folder found inside a workspace root. By default, discovery inspects only immediate child folders (`discoveryDepth: 1`), so `C:\Users\me\Documents\projects\ExampleProject` can be offered while `C:\Users\me\Documents\projects\ExampleProject\docs` is skipped.

A **tracked project** is a discovered or manually added project that you explicitly confirmed. Selecting rows in **Discovered Projects** does not track them until you click **Track selected**.

An **internal folder** is a folder inside a project that discovery must never offer as a separate project. Internal folders can still be read later by the scanner when they contain documentation for a tracked project.

Discovery requires project-root signals. Strong signals include `.git`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`, `CLAUDE.md`, `AGENTS.md`, `README.md` plus `CLAUDE.md`, `README.md` plus `AGENTS.md`, or `README.md` plus a `docs` directory. `README.md` alone is a weak signal and is not enough for internal folder names.

Ignored/internal discovery folder names are: `node_modules`, `.git`, `.pytest_cache`, `__pycache__`, `.next`, `dist`, `build`, `coverage`, `vendor`, `docs`, `doc`, `documentation`, `specs`, `spec`, `openspec`, `.openspec`, `src`, `test`, `tests`, `web`, `api`, `frontend`, `backend`, `public`, `assets`, `static`.

Nested projects are disabled by default with `allowNestedProjects: false`. To enable them, turn on **Allow nested projects** in **Manage Projects** or set `"allowNestedProjects": true` in the workspace config. Nested candidates still need strong project-root signals, ignored/internal folders remain excluded, and nested rows are marked with a `nested project` badge.

### Track discovered projects

1. Review the discovered candidates list.
2. Select only the project folders you want to track.
3. Click **Track selected**.
4. The selected projects are saved to `app-data/projects.config.json`.

Discovery returns detected reasons, confidence, and badges such as `git`, `package.json`, `CLAUDE.md`, `AGENTS.md`, `docs`, `SDD`, and `roadmap`. It does not automatically track every candidate.

### Disable a project without deleting it

Use the **Enabled** toggle in **Manage Projects**. Disabled projects stay in `app-data/projects.config.json`, but scanner, watcher, manual rescan, and interval rescan skip them.

### Remove a project from the dashboard

Use **Remove** in **Manage Projects**. Removing a project from the dashboard removes only the tracking entry. It never deletes the actual project folder.

## Configuration: app-data/projects.config.json

Manual editing is optional; the dashboard UI is the preferred path. The **Browse** button opens a native folder picker when supported by the local server environment, and manual path paste remains available as the fallback. If needed, edit `app-data/projects.config.json` while the server is stopped, then restart or rescan. Use absolute paths and escape backslashes on Windows (`\\`):

```json
{
  "workspaces": [
    {
      "id": "local-projects",
      "name": "Local Projects",
      "path": "C:\\Users\\me\\Documents\\projects",
      "enabled": true,
      "discoveryDepth": 1,
      "allowNestedProjects": false
    }
  ],
  "projects": [
    {
      "id": "example-project",
      "name": "Example Project",
      "path": "C:\\Users\\me\\Documents\\projects\\ExampleProject",
      "enabled": true,
      "tags": [],
      "createdAt": "2026-07-08T00:00:00.000Z",
      "updatedAt": "2026-07-08T00:00:00.000Z"
    }
  ],
  "settings": {
    "watchDocs": true,
    "autoRescanIntervalSec": 0,
    "activeDays": 14
  }
}
```

- `name` — display name in the dashboard.
- `path` — absolute path to the project root. Forward slashes also work (`C:/Users/...`).
- `enabled` — set to `false` to keep a project configured but exclude it from scans and watcher roots.
- `tags` — optional labels shown in project management UI.
- `settings.activeDays` (optional, default 14) — how recent a doc change must be for a project with open work to count as **active** instead of **stalled**.
- `settings.watchDocs` (optional, default true in local server mode) — set to `false` to disable automatic watcher rescans.

Workspace config fields:

- `discoveryDepth` - workspace discovery depth. Default is `1`, which means immediate child folders only.
- `allowNestedProjects` - set to `true` only when nested real projects should be discoverable; default is `false`.

Generated scan results are stored separately in `app-data/projects.generated.json`. The static fallback file `src/data/projects.json` remains available for browser-only static mode and build compatibility.

AI context snapshots are stored in `app-data/ai.context.snapshot.json` so the changes-since endpoint can compare derived compact context fields across requests instead of relying only on documentation modification times.

AI findings are stored separately in `app-data/ai.findings.generated.json`. This file is local runtime data: it records deterministic review-required findings and human review states (`new`, `accepted`, `dismissed`, `stale`) without changing scanned project documentation or accepted project decisions.

After editing project paths, use **Rescan docs** in live mode or run `npm run scan` from the terminal.

## AI context, findings, packets, and brief API

The local server exposes deterministic AI-readable context, a dedicated agent preflight packet, and an advisory project brief/report for human review:

| Endpoint | Purpose |
|---|---|
| `GET /api/ai-context` | Compact context for all enabled projects from `app-data/projects.generated.json`. Query paths are ignored; the endpoint never scans arbitrary request-provided paths. |
| `GET /api/ai-context/projects/:id` | Compact context for one saved tracked project id from `app-data/projects.config.json`. |
| `GET /api/ai-context/changes?since=<iso>` | AI-readable changed field categories since an ISO timestamp, compared against the saved compact context snapshot when available. |
| `GET /api/ai-findings?state=unresolved` | Review-required findings, filtered by `unresolved`, `all`, `new`, `accepted`, `dismissed`, or `stale`. |
| `PATCH /api/ai-findings/:id` | Update local finding review state to `new`, `accepted`, or `dismissed`. |
| `GET /api/agent-preflight-packet?projectId=<id>` | Agent-oriented JSON packet for one saved tracked project, with optional `changeId` and `agentRole=implementation|reviewer|verification|handoff`. |
| `GET /api/project-brief-report` | Advisory JSON report with ranked review-order project items, attention reasons, source evidence, derived labels, safe states, and recommended human decisions. |

AI context includes project identity, status, status reason, health score, current phase, next action, main blocker/risk, recent decision, gaps, selected constraints, risks, decisions, specs, audits, and evidence references. It intentionally omits raw markdown document bodies.

Findings are deterministic derived records for review, such as suspected status contradictions, unresolved human gates, unclear next actions, missing specs/design docs, missing verification evidence, stale handoff pointers, and audits needing attention. A finding is not an accepted decision, requirement, blocker, or verification result until a human handles it through a separate workflow.

Agent preflight packets are JSON-first and read-only. The endpoint requires a saved `projectId`, accepts optional `changeId`, and accepts optional `agentRole` as a metadata/sorting hint. It rejects unknown, repeated, path-like, selector, command/action, task/calendar, notification, remote provider, auth, model, and agent-control parameters with `400`. Missing generated scan data returns `404` with code `missing-generated-scan-data`; unknown or disabled saved projects return `404` with code `project-not-found`; unknown local changes return `200` with an `unknown-change` safe state and no fabricated proposed requirements or tasks. Packet retrieval reads existing generated scan data, saved project config, existing AI context/findings state, local OpenSpec metadata, and local project docs. It does not write snapshots, findings stores, report history, scanned project files, task/calendar records, commits, shell command records, remote call records, or agent-work records, and it does not start agent work.

Agent packets are separate from project brief reports. Packets use `kind: "agent-preflight-packet"` and include agent-facing fields such as `agentRole`, `requiredReading`, `acceptanceMap`, `attentionSignals`, and `verificationPlan`. Human brief reports use `kind: "project-brief-report"` and include report-facing fields such as `mode`, `recommendedHumanDecision`, and `noAttentionMessage`.

Project brief reports are JSON-first and read-only. The endpoint accepts only `mode=daily|weekly` and an optional `since=<iso>` timestamp; invalid, repeated, unknown, path-like, project selector, file selector, and glob parameters return `400`. Missing generated scan data returns `404` with code `missing-generated-scan-data`. Report retrieval reads existing generated scan data, saved project config, current findings review state, and the existing AI context snapshot when available. It does not write snapshots, findings stores, report history, scanned project files, tasks, calendar records, commits, shell commands, remote calls, or agent work.

Examples:

```bash
curl "http://127.0.0.1:5173/api/agent-preflight-packet?projectId=project-1&changeId=agent-preflight-packet&agentRole=verification"
curl http://127.0.0.1:5173/api/project-brief-report
curl "http://127.0.0.1:5173/api/project-brief-report?mode=weekly&since=2026-07-08T00:00:00.000Z"
```

## What gets scanned

Only these documentation files inside each configured project:

- Root files: `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, `TODO.md`, `ROADMAP.md`, `CHANGELOG.md`
- Folders (markdown only): `docs/**/*.md`, `specs/**/*.md`, `.openspec/**/*.md`, `openapi/**/*.md`

Never scanned: `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `vendor`, any non-markdown file (databases, archives, images, video, audio, SQL, etc.), and any file larger than **1 MB**. Symlinks and junctions are never followed, folder recursion is depth-capped, and a project's scan stops after 2,000 documentation files.

## What gets extracted

| Signal | Pattern |
|---|---|
| Open tasks | `- [ ] ...` markdown checkboxes |
| Completed tasks | `- [x] ...` markdown checkboxes |
| Next tasks / actions | unchecked tasks under a “Next” heading, `NEXT:` lines, and prose like “the next implementation step is …” |
| Markers | `TODO`, `FIXME`, `BUG` (uppercase, anywhere); `NEXT:`, `DONE:` (colon required, since “next”/“done” are common words) |
| Roadmap phases | `## Phase N. Name` sections in ROADMAP.md and `# Phase N - Name` plan files, with their prose `Status:` lines normalized to planned / in_progress / paused / blocked / completed / completed_pending_approval / pending_approval / needs_review / unknown — each with the matched parser rule, a confidence level (high/medium/low), and a suspected-issue flag when the docs contradict themselves (e.g. an early phase still marked "in progress" while later phases are completed) |
| Phase steps | `### N.x Work Item` headings and checkboxes inside phase-plan files, classified by their section text (completed / pending / blocked / needs review / unknown) |
| Decisions | lines with a date plus decision vocabulary (“Human decisions 2026-06-29: …”, “product decision”, “clarification”), bullets in `## Human/Key Decisions` sections, and `*DECISIONS*` files |
| Work constraints | a two-step blocked/gated classifier first records raw candidates (`block`, `gate`, `pending approval`, review/validation wording, pause/defer wording), then includes only concrete project-work signals in status and health: real blockers, approval gates, needs review/validation, and paused/deferred work |
| Specs & proposals | OpenSpec change folders (`proposal/design/tasks` artifacts with checkbox progress), handoff files with their `Status: Active/Done/Archived` lifecycle, `specs/` and `openapi/` files |
| Documentation gaps | missing README/ROADMAP/CLAUDE.md/specs/audits, docs older than 30 days, and a CLAUDE.md “Active Handoff” pointer that references a missing or non-active handoff |
| Risks & open questions | bullets under “Risks” / “Open Questions” headings, plus explicit “open question” lines |
| Audit documents | audit/review/verification/checklist/QA docs with a derived status (attention / recorded / archived) and their extracted severe signals |
| Doc categories | every file is classified by fuzzy filename/path patterns into core / roadmap-planning (`*roadmap*`, `*plan*`, `*phase*`, `*milestone*`…) / SDD-specs (`*spec*`, `*design*`, `*architecture*`, `.openspec/`…) / audits-QA / decisions / handoffs / other |
| Docs found | file list with size, category, per-file task counts, and modified date |

Markdown table rows are skipped for decision/work-constraint detection — file inventories *describe* blockers, they aren't blockers. Every extracted item links back to its `file:line` source.

Blocked/gated wording in agent rules, process policies, examples, templates, prompts, skills, and documentation instructions is filtered out of project status unless the nearby text clearly describes a concrete phase, task, implementation, feature, audit result, current status, or remaining project work. Filtered candidates stay visible in the collapsed **Constraint diagnostics** area with classification, confidence, matched keywords, reason, context, and source path.

## Status rules

Evaluated top-down, first match wins:

1. **unknown** — no documentation files found (or project path missing).
2. **needs attention** — TODO/FIXME/BUG markers, owner rejections / acceptance gaps, or hard real-blocker project signals.
3. **active** — open tasks or an in-progress roadmap phase, with doc changes within `activeDays`.
4. **stalled** — open work but no recent doc changes.
5. **done** — no open work; completed tasks or finished phases exist.

Each project card shows the reason for its status and a “Doc intelligence” block: ROADMAP/README/CLAUDE/SPECS presence, task counts, attention markers, and the last documentation update.

## Troubleshooting

**The dashboard shows “No scan data yet”**
Static fallback data at `src/data/projects.json` does not exist. Run `npm run scan`, then reload the browser. In live mode, generated data is read from `app-data/projects.generated.json`.

**No projects found / “No projects scanned yet”**
`app-data/projects.config.json` has an empty enabled `projects` array, or every entry was skipped. The scanner prints `skipping config entry without a valid name/path` for malformed entries — each project needs both a `name` and a `path` string.

**A project shows “unknown — Project path not found or not readable”**
The `path` in `app-data/projects.config.json` is wrong. Check for typos, use the full absolute path, and on Windows either escape backslashes (`C:\\Users\\me\\project`) or use forward slashes (`C:/Users/me/project`). A path that points to a file instead of a folder fails the same way.

**Docs exist but are not detected**
The scanner only reads the whitelisted locations listed under “What gets scanned”. Documentation in other places (e.g. `documentation/`, `wiki/`, `*.txt`, `*.rst`, or markdown files in the project root with other names) is intentionally ignored. Move or link nothing — either rename files to a whitelisted name or extend the whitelist constants (`ROOT_DOC_FILES`, `DOC_DIRS`) at the top of `scan-projects.mjs`. Note: symlinked folders are skipped by design.

**Large files are skipped**
Any markdown file over 1 MB is ignored on purpose (safety cap, `MAX_FILE_SIZE` in `scan-projects.mjs`). If one giant file matters, split it — a 1 MB markdown file is usually a generated artifact, not documentation. Projects with more than 2,000 doc files print a `scan truncated` warning.

**Permission errors**
The scanner never crashes on unreadable files or folders — it skips them silently, so a project on a restricted share may show fewer docs than expected. If a whole project root is unreadable it appears as `unknown` with “Project path not found or not readable”. Run the terminal as a user who can read the project folders, or grant read access. If the *scan itself* fails (e.g. it cannot write `app-data/projects.generated.json`), it prints `Scan failed: <reason>` and exits — check that the dashboard folder is writable and not locked by another program.

**Port 5173 is busy**
`npm run dev` will pick the next free port; check the terminal output for the actual URL.

## Project structure

```text
app-data/projects.config.json      # local tracked project/workspace config (ignored)
app-data/projects.generated.json   # generated live scan output (ignored)
app-data/ai.context.snapshot.json  # saved compact AI context snapshot for changes-since (ignored)
app-data/ai.findings.generated.json # generated AI findings and review state (ignored)
scan-projects.mjs        # read-only Node scanner (npm run scan)
src/data/projects.json   # static fallback scan output
src/App.tsx              # app shell: header, global search, layout, drawer state
src/components/ManageProjects.tsx  # tracked project/workspace management UI
server/project-config.mjs          # config migration, validation, CRUD helpers
server/project-discovery.mjs       # safe workspace candidate discovery
server/ai-context.mjs              # compact AI context and changes-since helpers
server/ai-findings.mjs             # deterministic findings and local review-state store
server/agent-preflight-packet.mjs  # pure agent preflight packet composition
server/project-brief-report.mjs    # pure advisory project brief/report composition
src/drawer.ts            # builders that turn extracted items into drawer payloads
src/components/          # OverviewStats, ProjectSidebar, SelectedProjectHeader,
                         # FocusCards, ProjectTabs, RoadmapTimeline, SpecsPanel,
                         # AuditsPanel, DecisionsPanel, TasksPanel,
                         # DocumentationCoverage, ActivityPanel, DetailDrawer
docs/                    # design notes: conventions analysis, data model, status rules
```
