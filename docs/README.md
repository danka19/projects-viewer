# projects-viewer Documentation

Projects Viewer is a local, read-only dashboard over documentation in configured local projects. It scans markdown conventions used in Codex/phase/OpenSpec-style repositories and presents project status, next actions, blockers, decisions, audits, documentation coverage, and recent activity.

Repo: https://github.com/danka19/projects-viewer

## Current State

v7 implemented on 2026-07-09:

- JSON-first agent preflight packet workflow implemented for `GET /api/agent-preflight-packet`.
- Shared `AgentPreflightPacket` contract types added to `src/types.ts`.
- Pure `server/agent-preflight-packet.mjs` composition module builds required reading, project state, acceptance mapping, attention signals, verification expectations, safe states, evidence, and work boundaries from prepared local inputs.
- Endpoint requires saved `projectId`, accepts optional `changeId` and `agentRole=implementation|reviewer|verification|handoff`, rejects unsafe query parameters, returns stable domain errors, and keeps unknown changes non-blocking through an `unknown-change` safe state without fabricated proposed requirements or tasks.
- Focused packet tests cover pure composition, API query validation, read-only side-effect boundaries, unknown-change behavior, and separation from `project-brief-report`.

v6 implemented on 2026-07-09:

- JSON-first project brief/report workflow implemented for `GET /api/project-brief-report`.
- Shared `ProjectBriefReport` contract types added to `src/types.ts`.
- Pure `server/project-brief-report.mjs` composition module ranks advisory review-order items from generated scan data, saved config, existing findings review state, optional AI context changes, and baseline availability.
- Endpoint accepts only `mode` and `since`, rejects unsafe query parameters, returns `missing-generated-scan-data` for missing generated scan output, and does not write snapshots, findings stores, report history, scanned project files, or external action records.
- Focused report tests cover ranking, evidence, derived labels, safe states, query validation, and read-only side-effect boundaries.

v5 implemented on 2026-07-08:

- Persistent tracked project and workspace config in `app-data/projects.config.json`.
- Generated live scan data separated into `app-data/projects.generated.json`.
- Local AI context and findings layer implemented and accepted into OpenSpec specs: compact AI context endpoints derive from generated scan data, changes-since uses a local compact context snapshot, and deterministic review-required findings persist local review state in `app-data/ai.findings.generated.json`.
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
| `ROADMAP.md` | Phase-level project roadmap and current phase status |
| `CURRENT_PROJECT_AUDIT.md` | Verified repository, runtime, command, and risk evidence |
| `AI_STEP_VERIFICATION_CHECKLIST.md` | Required checks before claiming code or documentation work is complete |
| `AGENTS_USAGE.md` | Codex and agent runbook for local startup, context packet API usage, MCP tools, and safety boundaries |
| `CONTEXT.md` | Canonical terms and boundary rules for live/static scanning |
| `phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md` | Closed Phase 1 plan for users, workflows, data sources, AI use cases, and acceptance criteria |
| `phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md` | Accepted and closed Phase 2 plan for the project brief/report data contract, module boundaries, API surface, ranking rules, and Phase 3 readiness |
| `phases/PHASE_3_FIRST_USABLE_WORKFLOW.md` | Accepted and closed Phase 3 implementation record for the JSON-first project brief/report API workflow |
| `01-doc-conventions-analysis.md` | How the user's documentation system works and parsing signals table |
| `02-dashboard-data-model.md` | Proposed JSON data model for scanner output |
| `03-status-rules.md` | Status derivation rules |
| `04-implementation-plan.md` | Early implementation plan and v1 acceptance criteria |

## Active OpenSpec Changes

- `openspec/changes/add-project-brief-report/`: proposed local daily/weekly human project brief/report workflow.
- `openspec/changes/agent-preflight-packet/`: implemented proposed local AI-agent preflight packet workflow, ready for human acceptance review and intentionally separate from the human brief/report contract.

## Operations Summary

- Development server: `npm run dev`, default URL `http://127.0.0.1:5173`.
- Production-like local server: `npm run build`, then `npm run server`.
- One-shot scan: `npm run scan`.
- Tests: `npm test`.
- Build verification: `npm run build`.
- AI context API: `GET /api/ai-context`, `GET /api/ai-context/projects/:id`, `GET /api/ai-context/changes?since=<iso>`.
- AI findings API: `GET /api/ai-findings?state=unresolved`, `PATCH /api/ai-findings/:id`.
- Agent preflight packet API: `GET /api/agent-preflight-packet`, required `projectId`, optional `changeId`, optional `agentRole=implementation|reviewer|verification|handoff`.
- Project brief report API: `GET /api/project-brief-report`, optional `mode=daily|weekly`, optional `since=<iso>`.
- Agent/Codex usage and MCP runbook: `docs/AGENTS_USAGE.md`.
- AI runtime files: `app-data/ai.context.snapshot.json` and `app-data/ai.findings.generated.json`.
- Current configured scanned project: `Example Project` at `C:\Users\danoc\Documents\projects\AutoParts`, migrated from legacy config when `app-data/projects.config.json` is absent.

## Safety Summary

- The app is local-only.
- Scanned projects are read-only inputs.
- Browser path input is accepted only by config-management endpoints that validate and save paths; scan and watcher code use saved enabled config paths only.
- The API scans only enabled paths from `app-data/projects.config.json`.
- AI context uses only `app-data/projects.generated.json` and saved tracked project ids; it does not accept arbitrary project paths.
- AI context changes-since compares saved compact context snapshots where available, rather than relying only on documentation modification times.
- AI findings are review-required derived runtime records under `app-data/`; they do not modify scanned project folders and do not trigger agent actions.
- Agent preflight packets are advisory and read-only: they reject arbitrary paths/selectors, action parameters, task/calendar parameters, remote/auth/model parameters, and agent-control parameters; they read existing runtime and local documentation/OpenSpec metadata, and do not write snapshots, findings, report history, scanned project files, task/calendar records, commits, shell command records, remote call records, or agent-work records.
- Project brief reports are advisory and read-only: they reject arbitrary paths/selectors, read existing runtime data, and do not write snapshots, findings, report history, scanned project files, tasks/calendar records, commands, commits, remote calls, or agent work.
- No cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning are part of the current design.
- Markdown files larger than 1 MB and unsafe folders such as `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, and `vendor` are skipped.
