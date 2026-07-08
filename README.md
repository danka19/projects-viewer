# Projects Viewer

A local, read-only **project radar** that scans the documentation of your projects and answers three questions at a glance: *what is the status of each project, what should I do next, and what needs attention?*

## How the interface works

The main screen is deliberately calm — details are one click away (progressive disclosure):

- **Top metric bar** — total / active / needs-attention / stalled / done projects, open next actions, docs coverage. Every card is clickable: status cards filter the project list, "Next actions" opens the Tasks tab, "Docs coverage" opens the Documentation tab.
- **Left sidebar** — compact project cards with status orb, health score (0–100), one-line status reason, and last update. Filter chips by status; click a card to select the project.
- **Project radar panel** — the selected project's summary: health ring, current phase, next action, main blocker, recent decision, recent change, and a 5-slot doc-coverage strip. Every tile is clickable and jumps to the right tab or opens the detail drawer.
- **Focus cards (Overview tab)** — max 3 items each for Next up, Blocked/gated, Needs attention, and Recent decisions, with "View all →" buttons.
- **Tabs** — Overview · Roadmap · SDD/Specs (grouped by status) · Tasks · Decisions · Audits (grouped: attention/latest/recorded/archived) · Documentation (coverage map with per-category file lists and filename search) · Activity (change timeline). Only the selected tab renders its lists.
- **Roadmap tab** — a segmented progress bar that separates fully-completed / pending-approval / in-progress / blocked-paused / planned phases (pending-approval work is deliberately *not* counted as finished), plus expandable phase cards. Collapsed: number, title, status badge, step-based progress %, confidence dot, source file. Expanded: a "Why this status?" panel (raw `Status:` text, matched parser rule, confidence, source `file:line`, suspected stale-doc warnings), detected steps with colored status dots and counts, and related decisions/audits. `npm run scan` also prints a **Roadmap Status Diagnostics** table per project with the same transparency data.
- **Detail drawer** — click any phase, task, decision, blocker, audit, spec, or doc file to open a right-side drawer with its type, status, extracted text, `file:line` source, a copy-path button, and related items. Esc closes it.
- **Global search** (`/` to focus) — searches projects, roadmap phases, tasks, blocked work, decisions, specs, and doc filenames across all projects; clicking a result selects the project, opens the right tab, and opens the drawer.

The health score is derived from documentation coverage, blocker/rejection counts, attention markers, staleness, and next-action clarity — it is a documentation-health signal, not a judgment of the code.

- **Read-only by design.** The scanner only *reads* whitelisted markdown files inside your projects. It never writes to, moves, or modifies them. The only file it writes is `src/data/projects.json` inside this dashboard folder.
- **Fully local.** No database, no auth, no cloud, no API keys.

Stack: Vite + React + TypeScript + Tailwind CSS + a local Express server, Chokidar watcher, and a plain Node.js scanner script.

## Quick start

```bash
npm install      # once
npm run scan     # reads projects.config.json -> writes src/data/projects.json
npm run dev      # starts the live dashboard at http://127.0.0.1:5173
```

Use the live controls in the top-right panel to rescan without leaving the browser.

## Project setup and command reference

Initial setup:

1. Install Node.js 20 or newer.
2. Run `npm install` in the dashboard folder.
3. Edit `projects.config.json` and add absolute paths for the projects you want to monitor.
4. Run `npm run dev` and open `http://127.0.0.1:5173`.

Common commands:

| Command | Use |
|---|---|
| `npm install` | Install local dependencies. Run once after cloning, and again when `package-lock.json` changes. |
| `npm run scan` | Run a one-time read-only documentation scan and write `src/data/projects.json`. |
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
4. Use **Rescan docs** for an immediate manual scan when needed.
5. Run `npm test` and `npm run build` before committing code changes.

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
- **Static mode** appears when the API is unavailable. The page falls back to the generated `src/data/projects.json`; rescanning is disabled because a browser-only static build cannot read local folders or execute Node code. Start `npm run dev` or `npm run server` to enable live rescans.

Manual rescan:

1. Click **Rescan docs** in the top-right panel.
2. The button disables while scanning.
3. The frontend calls `POST /api/rescan`.
4. After the scan completes, the frontend reloads data from `GET /api/projects`.

Automatic interval rescan is optional and off by default. The selector supports **Off / 5 min / 15 min / 30 min**, stores the choice in `localStorage`, never offers intervals below 5 minutes, and skips interval scans while another scan is running or shortly after a watcher-triggered scan.

File watcher behavior:

- Enabled by default when running the local server.
- Watches only documentation-like markdown files inside paths from `projects.config.json`.
- Debounces changes by 3 seconds.
- Never starts two scans at the same time.
- If a change happens during a scan or inside the 30-second throttle window, one extra scan is queued or delayed.
- The UI shows `Docs changed · rescanned automatically` after watcher scans.

To disable the watcher, set `"watchDocs": false` in `projects.config.json`. Manual and interval rescans still work in live mode.

## Configuration: projects.config.json

The file lives in the dashboard root. Add one entry per project; use absolute paths and escape backslashes on Windows (`\\`):

```json
{
  "activeDays": 14,
  "watchDocs": true,
  "projects": [
    {
      "name": "Example Project",
      "path": "C:\\Users\\danoc\\Documents\\projects\\AutoParts"
    },
    {
      "name": "Another Project",
      "path": "C:\\Users\\danoc\\Documents\\projects\\AnotherProject"
    }
  ]
}
```

- `name` — display name in the dashboard.
- `path` — absolute path to the project root. Forward slashes also work (`C:/Users/...`).
- `activeDays` (optional, default 14) — how recent a doc change must be for a project with open work to count as **active** instead of **stalled**.
- `watchDocs` (optional, default true in local server mode) — set to `false` to disable automatic watcher rescans.

After editing project paths, use **Rescan docs** in live mode or run `npm run scan` from the terminal.

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
| Blocked work | owner/human rejections and acceptance gaps, “must not start until / is blocked / blocked until” statements (conditional “if … blocked” gate language is ignored), paused work, and human-approval gates |
| Specs & proposals | OpenSpec change folders (`proposal/design/tasks` artifacts with checkbox progress), handoff files with their `Status: Active/Done/Archived` lifecycle, `specs/` and `openapi/` files |
| Documentation gaps | missing README/ROADMAP/CLAUDE.md/specs/audits, docs older than 30 days, and a CLAUDE.md “Active Handoff” pointer that references a missing or non-active handoff |
| Risks & open questions | bullets under “Risks” / “Open Questions” headings, plus explicit “open question” lines |
| Audit documents | audit/review/verification/checklist/QA docs with a derived status (attention / recorded / archived) and their extracted severe signals |
| Doc categories | every file is classified by fuzzy filename/path patterns into core / roadmap-planning (`*roadmap*`, `*plan*`, `*phase*`, `*milestone*`…) / SDD-specs (`*spec*`, `*design*`, `*architecture*`, `.openspec/`…) / audits-QA / decisions / handoffs / other |
| Docs found | file list with size, category, per-file task counts, and modified date |

Markdown table rows are skipped for decision/blocker detection — file inventories *describe* blockers, they aren't blockers. Every extracted item links back to its `file:line` source.

## Status rules

Evaluated top-down, first match wins:

1. **unknown** — no documentation files found (or project path missing).
2. **needs attention** — TODO/FIXME/BUG markers, owner rejections / acceptance gaps, or hard blocked-work statements.
3. **active** — open tasks or an in-progress roadmap phase, with doc changes within `activeDays`.
4. **stalled** — open work but no recent doc changes.
5. **done** — no open work; completed tasks or finished phases exist.

Each project card shows the reason for its status and a “Doc intelligence” block: ROADMAP/README/CLAUDE/SPECS presence, task counts, attention markers, and the last documentation update.

## Troubleshooting

**The dashboard shows “No scan data yet”**
`src/data/projects.json` does not exist. Run `npm run scan`, then reload the browser.

**No projects found / “No projects scanned yet”**
`projects.config.json` has an empty `projects` array, or every entry was skipped. The scanner prints `skipping config entry without a valid name/path` for malformed entries — each project needs both a `name` and a `path` string.

**A project shows “unknown — Project path not found or not readable”**
The `path` in `projects.config.json` is wrong. Check for typos, use the full absolute path, and on Windows either escape backslashes (`C:\\Users\\me\\project`) or use forward slashes (`C:/Users/me/project`). A path that points to a file instead of a folder fails the same way.

**Docs exist but are not detected**
The scanner only reads the whitelisted locations listed under “What gets scanned”. Documentation in other places (e.g. `documentation/`, `wiki/`, `*.txt`, `*.rst`, or markdown files in the project root with other names) is intentionally ignored. Move or link nothing — either rename files to a whitelisted name or extend the whitelist constants (`ROOT_DOC_FILES`, `DOC_DIRS`) at the top of `scan-projects.mjs`. Note: symlinked folders are skipped by design.

**Large files are skipped**
Any markdown file over 1 MB is ignored on purpose (safety cap, `MAX_FILE_SIZE` in `scan-projects.mjs`). If one giant file matters, split it — a 1 MB markdown file is usually a generated artifact, not documentation. Projects with more than 2,000 doc files print a `scan truncated` warning.

**Permission errors**
The scanner never crashes on unreadable files or folders — it skips them silently, so a project on a restricted share may show fewer docs than expected. If a whole project root is unreadable it appears as `unknown` with “Project path not found or not readable”. Run the terminal as a user who can read the project folders, or grant read access. If the *scan itself* fails (e.g. it cannot write `src/data/projects.json`), it prints `Scan failed: <reason>` and exits — check that the dashboard folder is writable and not locked by another program.

**Port 5173 is busy**
`npm run dev` will pick the next free port; check the terminal output for the actual URL.

## Project structure

```text
projects.config.json     # your project list (edit this)
scan-projects.mjs        # read-only Node scanner (npm run scan)
src/data/projects.json   # generated scan output (do not edit by hand)
src/App.tsx              # app shell: header, global search, layout, drawer state
src/drawer.ts            # builders that turn extracted items into drawer payloads
src/components/          # OverviewStats, ProjectSidebar, SelectedProjectHeader,
                         # FocusCards, ProjectTabs, RoadmapTimeline, SpecsPanel,
                         # AuditsPanel, DecisionsPanel, TasksPanel,
                         # DocumentationCoverage, ActivityPanel, DetailDrawer
docs/                    # design notes: conventions analysis, data model, status rules
```
