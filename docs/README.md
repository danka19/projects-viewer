# projects-viewer Documentation

Projects Viewer is a local, read-only dashboard over documentation in configured local projects. It scans markdown conventions used in Codex/phase/OpenSpec-style repositories and presents project status, next actions, blockers, decisions, audits, documentation coverage, and recent activity.

Repo: https://github.com/danka19/projects-viewer

## Current State

Dashboard redesign update on 2026-07-11:

- Persistent project management and the local project brief/report were synchronized into accepted capability specs and archived on 2026-07-15. Canonical behavior lives in `openspec/specs/project-management/` and `openspec/specs/project-brief-report/`.
- The agent preflight packet was accepted on 2026-07-15. Its full local-data, role, evidence, safe-state, verification, and no-automatic-action contract is canonical in `openspec/specs/agent-preflight-packet/`; implementation history is archived under `openspec/changes/archive/2026-07-15-agent-preflight-packet/`.
- Roadmap specification cards were accepted on 2026-07-15. Exact phase/step ownership, nested cards, unassigned/integrity evidence, and navigation to the matching Specs Canvas identity are canonical in `openspec/specs/roadmap-spec-cards/`; the completed change is archived under `openspec/changes/archive/2026-07-15-add-roadmap-spec-cards/`.
- Accepted lifecycle/progress semantics are canonical in `openspec/specs/dashboard-state-derivation/` and `openspec/specs/spec-work-model/`; implementation history is archived under `openspec/changes/archive/2026-07-15-fix-lifecycle-status-progress-semantics/`.
- Selectable Roadmap/Specs primary work and the responsive Specs Canvas are accepted and canonical in `openspec/specs/documentation-view-sources/`, `selectable-primary-work-view/`, `spec-work-model/`, and `specs-canvas/`.
- The 2026-07-10 UX/UI audit remains the baseline. State-derivation trust, overview hierarchy, the horizontal phase/step timeline, ranked search, safe UI-state persistence, responsive ordering, focus handling, and contrast were implemented on `dashboard-redesign/ui-rebuild`.
- `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md` records automated and browser evidence across dark/light desktop, tablet, mobile, history/focus flows, overflow measurements, and representative lifecycle states.
- Accepted timeline and search/navigation behavior is canonical in `openspec/specs/dashboard-project-timeline/` and `openspec/specs/dashboard-search-navigation/`; implementation history is archived under `openspec/changes/archive/`.
- Accepted scanner/search evidence-trust behavior is canonical in `openspec/specs/dashboard-evidence-trust/`; implementation history is archived under `openspec/changes/archive/2026-07-15-improve-dashboard-evidence-trust/`.
- This bounded UX work did not activate or close roadmap Phase 4 and did not expand the local-only, configured-path, read-only, no-cloud security boundary.

v7 implemented on 2026-07-09:

- JSON-first agent preflight packet workflow implemented for `GET /api/agent-preflight-packet`.
- MCP/config hardening now includes the compact `GET /api/configured-projects` lookup and `list_configured_projects` as the preferred `projectId` discovery step before `get_agent_preflight_packet`.
- Dashboard UI polish added a saved light/dark theme toggle and consolidated semantic status colors around shared theme tokens.
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
- Fresh setup keeps `app-data/projects.config.json` empty until the user adds tracked projects or workspaces.
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
| `audits/UX_UI_AUDIT_2026-07-10.md` | Evidence-backed audit of first-glance state clarity, data trust, information density, interaction, responsive layout, and accessibility |
| `audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md` | Implementation, automated verification, browser matrix, representative lifecycle states, pending human acceptance, and residual risks |
| `audits/API_UX_TRUST_AUDIT_2026-07-12.md` | Original API/UX trust findings plus implementation, automated, real-rescan, browser, ownership, and residual-risk evidence for their remediations |
| `audits/LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md` | Evidence-backed audit of phase-status parsing, implementation-progress semantics, and accepted living-spec progress |
| `planning/DASHBOARD_REDESIGN_PLAN.md` | Implemented redesign sequence and integration record for state trust, overview hierarchy, Project Timeline, search/navigation, and acceptance gates |
| `planning/MCP_CONTEXT_API_HARDENING_PLAN.md` | Hardening plan and implementation notes for canonical config, compact project-id listing, agent preflight API routing, MCP non-JSON errors, and local HTTP diagnostics |
| `phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md` | Closed Phase 1 plan for users, workflows, data sources, AI use cases, and acceptance criteria |
| `phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md` | Accepted and closed Phase 2 plan for the project brief/report data contract, module boundaries, API surface, ranking rules, and Phase 3 readiness |
| `phases/PHASE_3_FIRST_USABLE_WORKFLOW.md` | Accepted and closed Phase 3 implementation record for the JSON-first project brief/report API workflow |
| `01-doc-conventions-analysis.md` | How the user's documentation system works and parsing signals table |
| `02-dashboard-data-model.md` | Proposed JSON data model for scanner output |
| `03-status-rules.md` | Status derivation rules |
| `04-implementation-plan.md` | Early implementation plan and v1 acceptance criteria |

## Active OpenSpec Changes

No active OpenSpec changes remain.

## Archived OpenSpec Changes

- `openspec/changes/archive/2026-07-15-harden-dashboard-state-derivation/`: accepted dashboard trust-gate implementation history; archived by owner approval without a retrospective design artifact.
- `openspec/changes/archive/2026-07-15-add-selectable-specs-canvas/`: accepted selectable Roadmap/Specs and responsive Specs Canvas implementation history.
- `openspec/changes/archive/2026-07-15-redesign-dashboard-project-timeline/`: accepted horizontal lifecycle timeline implementation history.
- `openspec/changes/archive/2026-07-15-improve-dashboard-search-navigation/`: accepted ranked search/navigation and safe UI-state persistence history.
- `openspec/changes/archive/2026-07-15-fix-lifecycle-status-progress-semantics/`: accepted lifecycle, phase-step ownership, and living-spec progress implementation history.
- `openspec/changes/archive/2026-07-15-improve-dashboard-evidence-trust/`: accepted scanner/search evidence-trust remediation history.
- `openspec/changes/archive/2026-07-15-add-persistent-project-management/`: accepted persistent project/workspace management implementation history.
- `openspec/changes/archive/2026-07-15-add-project-brief-report/`: accepted local advisory project brief/report implementation history.
- `openspec/changes/archive/2026-07-15-agent-preflight-packet/`: accepted local AI-agent preflight packet implementation history.
- `openspec/changes/archive/2026-07-15-add-roadmap-spec-cards/`: accepted Roadmap specification-card implementation history.
- `openspec/changes/archive/2026-07-23-canonical-project-state-sources/`: accepted scanner trust remediation for canonical live blocker sources, quality-only supersession evidence, and roadmap-order current phase derivation.
- `openspec/changes/archive/2026-07-12-harden-mcp-context-api/`: completed hardening change for canonical project config, compact saved project-id listing, JSON-only API boundaries, MCP response validation, and local API diagnostics. Accepted behavior is synced to `openspec/specs/agent-preflight-packet/`, `openspec/specs/local-project-config/`, and `openspec/specs/mcp-context-api/`.

## Operations Summary

- Development server: `npm run dev`, default URL `http://127.0.0.1:5173`.
- Production-like local server: `npm run build`, then `npm run server`.
- One-shot scan: `npm run scan`.
- Tests: `npm test`.
- Build verification: `npm run build`.
- AI context API: `GET /api/ai-context`, `GET /api/ai-context/projects/:id`, `GET /api/ai-context/changes?since=<iso>`.
- AI findings API: `GET /api/ai-findings?state=unresolved`, `PATCH /api/ai-findings/:id`.
- Agent preflight packet API: `GET /api/agent-preflight-packet`, required `projectId`, optional `changeId`, optional `agentRole=implementation|reviewer|verification|handoff`.
- Configured-project lookup API: `GET /api/configured-projects`, preferred compact `projectId` discovery before agent preflight requests.
- Project brief report API: `GET /api/project-brief-report`, optional `mode=daily|weekly`, optional `since=<iso>`.
- Agent/Codex usage and MCP runbook: `docs/AGENTS_USAGE.md`.
- MCP/API hardening plan and implementation notes: `docs/planning/MCP_CONTEXT_API_HARDENING_PLAN.md`.
- Archived OpenSpec hardening history: `openspec/changes/archive/2026-07-12-harden-mcp-context-api/`.
- AI runtime files: `app-data/ai.context.snapshot.json` and `app-data/ai.findings.generated.json`.
- Canonical tracked-project config: `app-data/projects.config.json`. Use **Manage Projects** or direct local edits, with `projects.config.example.json` as the empty schema reference.
- Empty config/no tracked projects is a valid state. Startup and scan should not add defaults or crash.
- API diagnostics needing headers/content type should use `curl.exe -i --max-time 10` against the same `127.0.0.1` URL.

## Safety Summary

- The app is local-only.
- Scanned projects are read-only inputs.
- Browser path input is accepted only by config-management endpoints that validate and save paths; scan and watcher code use saved enabled config paths only.
- The API scans only enabled paths from `app-data/projects.config.json`.
- Runtime tracked-project config comes only from `app-data/projects.config.json`; the versioned `projects.config.example.json` is a schema reference only.
- Root `projects.config.json` is not a runtime fallback or migration source.
- Unknown `/api/*` routes return JSON `404` errors, not the Vite HTML shell.
- MCP adapter calls reject non-JSON, malformed JSON, wrong response shapes, and non-`agent-preflight-packet` packet responses with explicit response evidence.
- AI context uses only `app-data/projects.generated.json` and saved tracked project ids; it does not accept arbitrary project paths.
- AI context changes-since compares saved compact context snapshots where available, rather than relying only on documentation modification times.
- AI findings are review-required derived runtime records under `app-data/`; they do not modify scanned project folders and do not trigger agent actions.
- Agent preflight packets are advisory and read-only: they reject arbitrary paths/selectors, action parameters, task/calendar parameters, remote/auth/model parameters, and agent-control parameters; they read existing runtime and local documentation/OpenSpec metadata, and do not write snapshots, findings, report history, scanned project files, task/calendar records, commits, shell command records, remote call records, or agent-work records.
- Project brief reports are advisory and read-only: they reject arbitrary paths/selectors, read existing runtime data, and do not write snapshots, findings, report history, scanned project files, tasks/calendar records, commands, commits, remote calls, or agent work.
- No cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning are part of the current design.
- Markdown files larger than 1 MB and unsafe folders such as `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, and `vendor` are skipped.
