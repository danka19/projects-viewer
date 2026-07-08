# projects-viewer Documentation

Projects Viewer is a local, read-only dashboard over documentation in configured local projects. It scans markdown conventions used in Codex/phase/OpenSpec-style repositories and presents project status, next actions, blockers, decisions, audits, documentation coverage, and recent activity.

Repo: https://github.com/danka19/projects-viewer

## Current State

v5 implemented on 2026-07-08:

- Persistent tracked project and workspace config in `app-data/projects.config.json`.
- Generated live scan data separated into `app-data/projects.generated.json`.
- Local AI context and findings layer in progress: compact AI context endpoints derive from generated scan data, and deterministic review-required findings persist local review state in `app-data/ai.findings.generated.json`.
- Legacy root `projects.config.json` migration on first local startup when the canonical config is missing.
- Express management API endpoints for config, tracked projects, workspaces, discovery, selected tracking, and rescans.
- **Manage Projects** UI for adding one project, adding a workspace folder, discovering candidates, tracking selected projects, disabling projects, removing tracking entries, and rescanning enabled projects.
- Scanner, watcher, manual rescan, and interval rescan use enabled projects from saved config only.

v4 implemented on 2026-07-08:

- Local live dashboard server in `server.mjs`.
- Express API endpoints: `GET /api/projects`, `GET /api/scan-status`, `POST /api/rescan`.
- Vite middleware in development through `npm run dev`.
- Built frontend serving through `npm run server` / `npm run preview`.
- Manual **Rescan docs** UI control.
- Live/static mode detection and static `src/data/projects.json` fallback.
- Optional interval rescan, off by default.
- Chokidar watcher for documentation-like markdown changes inside configured project paths.
- Scanner exports reusable `runScan()` and keeps CLI support through `npm run scan`.

v3 implemented on 2026-07-07:

- Interactive project radar UI with metric bar, project sidebar, per-project summary panel, focus cards, tabs, right-side detail drawer, and global search.
- Scanner intelligence for fuzzy doc categories, roadmap phases, specs, handoffs, decisions, blockers, risks, audits, documentation gaps, and health score.

## Documents

| File | Purpose |
|---|---|
| `00_FILE_STRUCTURE.md` | Repository map for app, scanner, local server, tests, and documentation |
| `ROADMAP.md` | Phase-level project roadmap and current project-foundation status |
| `CURRENT_PROJECT_AUDIT.md` | Verified repository, runtime, command, and risk evidence |
| `AI_STEP_VERIFICATION_CHECKLIST.md` | Required checks before claiming code or documentation work is complete |
| `CONTEXT.md` | Canonical terms and boundary rules for live/static scanning |
| `01-doc-conventions-analysis.md` | How the user's documentation system works and parsing signals table |
| `02-dashboard-data-model.md` | Proposed JSON data model for scanner output |
| `03-status-rules.md` | Status derivation rules |
| `04-implementation-plan.md` | Early implementation plan and v1 acceptance criteria |

## Operations Summary

- Development server: `npm run dev`, default URL `http://127.0.0.1:5173`.
- Production-like local server: `npm run build`, then `npm run server`.
- One-shot scan: `npm run scan`.
- Tests: `npm test`.
- Build verification: `npm run build`.
- AI context API: `GET /api/ai-context`, `GET /api/ai-context/projects/:id`, `GET /api/ai-context/changes?since=<iso>`.
- AI findings API: `GET /api/ai-findings?state=unresolved`, `PATCH /api/ai-findings/:id`.
- Current configured scanned project: `Example Project` at `C:\Users\danoc\Documents\projects\AutoParts`, migrated from legacy config when `app-data/projects.config.json` is absent.

## Safety Summary

- The app is local-only.
- Scanned projects are read-only inputs.
- Browser path input is accepted only by config-management endpoints that validate and save paths; scan and watcher code use saved enabled config paths only.
- The API scans only enabled paths from `app-data/projects.config.json`.
- AI context uses only `app-data/projects.generated.json` and saved tracked project ids; it does not accept arbitrary project paths.
- AI findings are review-required derived runtime records under `app-data/`; they do not modify scanned project folders and do not trigger agent actions.
- No cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning are part of the current design.
- Markdown files larger than 1 MB and unsafe folders such as `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, and `vendor` are skipped.
