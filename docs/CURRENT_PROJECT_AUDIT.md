# Current Project Audit

Status: active.

Last updated: 2026-07-12.

## Repository Baseline

| Item | Current State |
|---|---|
| Repository root | `C:\Users\danoc\Documents\projects\projects-viewer` |
| Current implementation worktree | `C:\Users\danoc\Documents\projects\projects-viewer\.worktrees\harden-mcp-context-api` |
| Current branch | `harden-mcp-context-api` |
| Remote | `origin https://github.com/danka19/projects-viewer.git` |
| Latest known implementation commit | `b283500` (`fix API parser error boundary`) on `harden-mcp-context-api` |
| Local divergence | Feature branch/worktree `harden-mcp-context-api` contains the completed MCP/API hardening implementation, accepted-spec sync, and archived change history; PR integration to `main` is the remaining step |

## Useful Starting Points

- Agent rules: `AGENTS.md`.
- Product and operations overview: `README.md` and `docs/README.md`.
- Repository map: `docs/00_FILE_STRUCTURE.md`.
- Roadmap: `docs/ROADMAP.md`.
- Runtime commands: `README.md` and `docs/00_FILE_STRUCTURE.md`.
- Workflow skills are global under `~/.codex/skills`.

## Verified Environment Evidence

| Check | Evidence |
|---|---|
| Git installed | `git status --short --branch` succeeded on 2026-07-08 |
| Runtime installed | Node/npm commands succeeded on 2026-07-08 |
| Tests available | `npm test` passed: 31/31 Node tests on 2026-07-08 after AI context snapshot comparison fixes |
| Build available | `npm run build` passed on 2026-07-08 |
| Local app/server available | `npm run dev` started `http://127.0.0.1:5173`; `/api/scan-status` returned `success`, trigger `startup`, docs `53` |
| Production-like local server | `npm run server` started after `npm run build`; `/api/projects` returned 1 project and 53 docs; `/` returned HTTP 200 |
| Watcher behavior | Temporary markdown add produced watcher scan with 54 docs; delayed unlink scan returned 53 docs |
| Persistent config module | `npm test -- tests/project-config.test.mjs` passed: clean canonical `app-data/projects.config.json` creation, root `projects.config.json` ignored with no fallback/migration, compact configured-project identities, project CRUD, duplicate handling, enabled filtering, and workspace normalization |
| Workspace discovery module | `npm test -- tests/project-discovery.test.mjs` passed: default depth 1, explicit nested discovery, ignored internal folders, marker reasons, disabled workspace, and selected-path validation |
| Scanner config contract | Runtime config now reads only `app-data/projects.config.json`; root `projects.config.json` fallback/migration was removed. Empty config/no projects scan is valid and should not crash. |
| Project management API | `npm test -- tests/server-api.test.mjs` passed: add project validation/persistence, workspace discovery, track-discovered, and invalid selection rejection without partial adds |
| Frontend build | `npm run build` passed after adding `Manage Projects`; prebuild wrote `app-data/projects.generated.json` |
| Real workspace discovery check | `C:\Users\danoc\Documents\projects` returned top-level candidates AutoParts, autoparts-db, finance-sheets, projects-viewer, ScanLabMultiplatform, ScanLabTesting, teamSsdCli, and vpn-and-router; forbidden internal names were absent from candidates; `AnnaPh` was not present on disk during verification |
| Manual project-management UI verification | `npm run dev` on `http://127.0.0.1:5174` passed: opened **Manage Projects**, added one temp project, added one temp workspace, discovered two candidate projects, tracked selected candidates, disabled the temp single project, rescanned enabled projects, restarted server, and confirmed config persisted while generated data excluded the disabled project |
| AI context/findings tests | `npm test` passed: 31/31 Node tests after AI context snapshot comparison fixes on 2026-07-08 |
| OpenSpec accepted specs | `openspec list --specs` showed `ai-context` and `ai-findings`; `openspec validate --all --strict` passed with `change/add-persistent-project-management`, `spec/ai-context`, and `spec/ai-findings` on 2026-07-08 |
| Current phase planning | Phase 0 accepted and closed; Phase 1 plan created in `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md` on 2026-07-08 |
| Phase 1 user/workflow discovery | Work item 1.1 recorded primary users, daily/weekly decisions, workflow ranking, non-goals, and human-confirmation questions in `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md` on 2026-07-08 |
| Phase 1 data/trust inventory | Work item 1.2 recorded raw inputs, derived dashboard data, AI runtime stores, accepted decision records, and forbidden data flows in `docs/phases/PHASE_1_DISCOVERY_AND_REQUIREMENTS.md` and `docs/CONTEXT.md` on 2026-07-08 |
| Phase 1 AI workflow/review policy | Work item 1.3 ranked daily/weekly brief first, accepted AI preflight and reviewer/checker workflows as review support, defined finding review-state meanings, and recorded rejected/deferred AI behaviors on 2026-07-08 |
| Phase 1 OpenSpec conversion | Work item 1.4 created proposed change `openspec/changes/add-project-brief-report/` with proposal, design, delta spec, and tasks for the daily/weekly project brief/report workflow on 2026-07-08 |
| Phase 1 first-workflow selection | Work item 1.5 selected local daily/weekly project brief as API/report JSON first, dashboard UI later, and set Phase 2 architecture targets for the report contract, composition module, API surface, ranking rules, and storage boundaries on 2026-07-08 |
| Phase 2 planning | Human owner approved moving into Phase 2 on 2026-07-09; `docs/phases/PHASE_2_ARCHITECTURE_AND_DATA_MODEL.md` now defines the architecture work items for `add-project-brief-report` |
| Phase 2 work item 2.1 | Project brief/report JSON contract defined in `openspec/changes/add-project-brief-report/design.md`, sharpened in the delta spec, and recorded in the Phase 2 plan on 2026-07-09; `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check` passed |
| Phase 2 work item 2.2 | Report composition module boundary defined on 2026-07-09: future `server/project-brief-report.mjs` is a pure deterministic composer over provided scan/config/findings/change inputs, while route IO, snapshot IO, findings persistence, and HTTP behavior stay outside the module |
| Phase 2 work item 2.3 | Local API surface defined on 2026-07-09: future `GET /api/project-brief-report` returns report JSON, accepts only `since` and metadata-only `mode`, rejects unknown/path-like/repeated scalar query parameters, returns `404` for missing generated scan data, and does not write snapshot, findings, report-history, scanned-project, or external-action artifacts |
| Phase 2 work item 2.4 | Ranking, empty-state, and baseline rules defined on 2026-07-09: report ranks review items deterministically without creating accepted decisions/actions, handles no-attention and missing-data states, and keeps report retrieval read-only for AI context snapshots and report history |
| Phase 2 work item 2.5 | Phase 3 implementation plan created in `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md` on 2026-07-09; plan maps `add-project-brief-report` OpenSpec tasks to shared types, pure report composition, local API route, focused tests, docs, final verification, and OpenSpec follow-through |
| Phase 3 work item 3.1 | Shared `ProjectBriefReport` TypeScript contract types added to `src/types.ts`; `tests/project-brief-report-types.ts` contract check and `npm run build` passed on 2026-07-09 |
| Phase 3 work items 3.2-3.3 | Pure `server/project-brief-report.mjs` composition module implemented with ranking, safe states, evidence, derived labels, and advisory recommendation guards; focused module tests and `npm test` passed on 2026-07-09 |
| Phase 3 work item 3.4 | `GET /api/project-brief-report` implemented in `server.mjs`; API tests cover safe params, missing scan data, no arbitrary paths, no snapshot/finding/report-history writes, and unchanged scanned project sentinel files; `npm test` and `npm run build` passed on 2026-07-09 |
| Phase 3 review fix | Independent review found invalid generated-scan JSON and loose parseable `since` values could violate the API contract; `0cd3eb5` added regression tests and fixed both boundaries on 2026-07-09 |
| Phase 3 acceptance | Human owner accepted closing Phase 3 on 2026-07-09 after project brief/report API implementation, verification, push, and review-fix evidence |
| Agent preflight packet intake | Human owner requested a separate `agent-preflight-packet` OpenSpec proposal on 2026-07-09 so agent preflight behavior does not mix into the daily/weekly human brief; routing decision was `create_openspec_change` |
| Agent preflight packet implementation | `GET /api/agent-preflight-packet` implemented on branch `codex/agent-preflight-packet` with shared `AgentPreflightPacket` types, pure `server/agent-preflight-packet.mjs` composition, strict saved-project query validation, read-only local API retrieval, unknown-change safe state without fabricated proposed requirements/tasks, and contract-separation regression coverage |
| Agent preflight packet focused verification | `npm test -- tests/agent-preflight-packet.test.mjs` passed 20/20 after adding explicit local negative side-effect artifact assertions for task/calendar/commit/shell/remote/agent-work records |
| MCP/API hardening follow-up | 2026-07-09 diagnostic found historical failure modes: `get_agent_preflight_packet` could return the Vite HTML shell with HTTP 200, `list_projects` was too large for convenient project-id selection, root `projects.config.json` could mislead agents with legacy `Example Project` data, and `Invoke-WebRequest` could produce low-value diagnostics. Remediation context is recorded in `docs/planning/MCP_CONTEXT_API_HARDENING_PLAN.md`. |
| MCP/API hardening OpenSpec | Completed change history is archived at `openspec/changes/archive/2026-07-12-harden-mcp-context-api/`; accepted requirements are synced to main specs for `local-project-config`, `mcp-context-api`, and `agent-preflight-packet`. The planning doc records why the OpenSpec was not created in the first documentation-only follow-up. |
| MCP/API hardening implementation facts | Runtime tracked-project config source is only `app-data/projects.config.json`; `projects.config.example.json` is a versioned empty schema reference; `GET /api/configured-projects` and MCP `list_configured_projects` provide compact saved project identities for `projectId` lookup; unknown `/api/*` routes return JSON `404`; the MCP adapter rejects non-JSON, malformed JSON, wrong response shapes, and wrong packet kind with explicit status/content-type/path/preview details; diagnostics should prefer `curl.exe -i --max-time 10` when headers or content type matter. |

## Known Risks And Gaps

| ID | Risk | Owner | Status |
|---|---|---|---|
| AUDIT-001 | Phase 2 architecture/data model planning was accepted when the human owner approved starting Phase 3; Phase 3 implementation followed `docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md`. | Human owner / Phase 3 | closed 2026-07-09 |
| AUDIT-002 | Environment and verification commands are recorded in README and this audit; keep them current as scripts change. | Phase 0 | monitored |
| AUDIT-003 | Architecture decisions are partially documented in README/docs, but no ADR/OpenSpec exists for server/API/watcher contracts. | Phase 1/2 | open |
| AUDIT-004 | Local branch had commits ahead of GitHub remote during early foundation work; `main` later matched `origin/main` before Phase 1 planning. | Human owner | closed 2026-07-08 |
| AUDIT-005 | Manual browser verification for add project, restart persistence, workspace discovery, track selected, disable, and rescan. | Current feature | closed 2026-07-08 |
| AUDIT-006 | Phase 3 project brief/report API is implemented, verified, reviewed, pushed, and accepted as closed; `add-project-brief-report` remains ready for OpenSpec archival after branch review/merge. | Human owner / next OpenSpec archival step | closed 2026-07-09 |
| AUDIT-007 | `agent-preflight-packet` is implemented separately from `project-brief-report`; final acceptance still requires full verification evidence and human review before archiving the OpenSpec change. | Current feature | monitored |
| AUDIT-008 | Next implementation step remains a human/product decision: archive `add-project-brief-report`, accept/archive `agent-preflight-packet` after final verification, or continue with dashboard/brief UI. | Human owner | open |
| AUDIT-009 | Unrelated uncommitted UI/worktree changes were present while implementing `agent-preflight-packet`; they were not reverted or included in feature commits, and final verification must distinguish them from this change. | Human owner / current session | monitored |
| AUDIT-010 | MCP/API hardening implementation, verification, independent review, accepted-spec sync, and OpenSpec archival are complete on branch `harden-mcp-context-api`: root legacy config fallback is removed, compact saved project ids are exposed, `/api/*` parser and routing failures stay JSON, MCP response validation is hardened, and local HTTP diagnostics guidance is updated. | Human owner / archive and PR workflow | closed 2026-07-12 |

## Audit Rules

- Update this file when a finding is fixed, invalidated by evidence, or moved.
- Do not mark a finding closed without verification evidence.
