# Current Project Audit

Status: active.

Last updated: 2026-07-11.

## Repository Baseline

| Item | Current State |
|---|---|
| Repository root | `C:\Users\danoc\Documents\projects\projects-viewer` |
| Current implementation worktree | `C:\Users\danoc\Documents\projects\projects-viewer` |
| Current branch | `dashboard-redesign/ui-rebuild` |
| Remote | `origin https://github.com/danka19/projects-viewer.git` |
| Latest implementation commit before this audit update | `32b9c68 feat: complete dashboard search and timeline integration` |
| Local divergence | Redesign branch contains intentional local commits over `main`; no push was performed. Documentation updates were pending at the start of this audit refresh. |

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
| Tests available | `npm test` passed on 2026-07-11: 97 Node tests plus 70 Vitest component/accessibility/search tests |
| Build available | TypeScript `npx tsc --noEmit` passed after the final timeline review fixes; final production build evidence is recorded in the redesign acceptance audit |
| Local app/server available | `npm run dev` started `http://127.0.0.1:5173`; `/api/scan-status` returned `success`, trigger `startup`, docs `53` |
| Production-like local server | `npm run server` started after `npm run build`; `/api/projects` returned 1 project and 53 docs; `/` returned HTTP 200 |
| Watcher behavior | Temporary markdown add produced watcher scan with 54 docs; delayed unlink scan returned 53 docs |
| Persistent config module | `npm test -- tests/project-config.test.mjs` passed: migration, project CRUD, duplicate handling, enabled filtering, workspace normalization |
| Workspace discovery module | `npm test -- tests/project-discovery.test.mjs` passed: default depth 1, explicit nested discovery, ignored internal folders, marker reasons, disabled workspace, and selected-path validation |
| Scanner config contract | `npm test -- tests/run-scan.test.mjs` passed: legacy config, enabled-project filtering, app-data generated output |
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
| MCP/API hardening follow-up | 2026-07-09 diagnostic found that `get_agent_preflight_packet` can return the Vite HTML shell with HTTP 200, `list_projects` is too large for convenient project-id selection, root `projects.config.json` can mislead agents with legacy `Example Project` data, and `Invoke-WebRequest` can produce low-value diagnostics. Planned remediation is recorded in `docs/planning/MCP_CONTEXT_API_HARDENING_PLAN.md`. |
| MCP/API hardening OpenSpec | Proposed change `openspec/changes/harden-mcp-context-api/` now captures the hardening work as formal OpenSpec artifacts: proposal, design, tasks, and delta specs for `local-project-config`, `mcp-context-api`, and `agent-preflight-packet`. The planning doc records why the OpenSpec was not created in the first documentation-only follow-up. |
| UX/UI live-browser audit | On 2026-07-10 the dashboard was inspected at 1280x720 and 390x844. Evidence recorded false current next-action/blocker/task promotion, repeated dense text, global-to-local metric actions, noisy 40-result search saturation, a 340 px mobile header, selected-project content below y=1500 on mobile, and a desktop sticky sidebar/header overlap. Full evidence is in `docs/audits/UX_UI_AUDIT_2026-07-10.md`. |
| Dashboard state-trust gate | `harden-dashboard-state-derivation` implemented trusted constraint filtering/current-state derivation before overview promotion; representative trust fixtures and the full suite pass. |
| Project Timeline implementation | `src/timeline/` now provides the trusted model/state, horizontal phase/step axes, current/expanded separation, edge states, keyboard/reduced-motion behavior, responsive overflow, integrity disclosure, and read-only drawer integration. Agent verification is complete; human OpenSpec task 7.6 remains open. |
| Dashboard overview implementation | The compact system bar, four-group attention brief, selected-project state header, primary timeline placement, four semantic detail surfaces, and mobile project switcher are implemented. |
| Search/navigation implementation | `src/search.ts`, `GlobalSearch.tsx`, and `src/uiState.ts` provide deterministic ranked search, explicit diagnostic opt-in, true totals/truncation, keyboard navigation, safe versioned local/history state, Back/Forward behavior, and stable drawer/timeline descriptors. |
| Dashboard browser acceptance | Dark/light desktop 1280x720, tablet 1024x768, and mobile 390x844 checks passed for page/local overflow, ordering, focus, drawer return, search/history, and representative lifecycle states. Evidence: `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md`. |
| Dashboard redesign plan | `docs/planning/DASHBOARD_REDESIGN_PLAN.md` records the completed bounded sequence and keeps MCP/API hardening and roadmap Phase 4 separate. |
| Documentation/phase status sync | On 2026-07-10 the stale audit branch baseline was corrected to `main`; Phase 0-3 work-item status lines were normalized from legacy `completed`/pending wording to explicit closed/accepted lifecycle wording supported by existing human gate evidence. No Phase 4 status was inferred. |

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
| AUDIT-008 | The owner selected the bounded UX-first sequence; state trust preceded overview promotion and MCP/API hardening remained separate. Detailed Phase 4 scope is still a future decision. | Human owner | closed for redesign sequencing 2026-07-11 |
| AUDIT-009 | Unrelated uncommitted UI/worktree changes were present during the earlier agent-preflight feature session; by 2026-07-10 `main` matched `origin/main` and the worktree was clean before new intentional documentation changes. | Human owner | closed 2026-07-10 |
| AUDIT-010 | MCP/API hardening is needed before agents can rely on preflight packet retrieval in everyday workflow: remove root legacy config fallback, expose compact saved project ids, prevent `/api/*` HTML fallback from masquerading as success, and improve local HTTP diagnostics. OpenSpec proposal now exists as `harden-mcp-context-api`; implementation remains open. | Next bounded change | open |
| AUDIT-011 | Dashboard trust filtering/current-state derivation is implemented and regression-tested before overview promotion. | Dashboard redesign | closed 2026-07-11 |
| AUDIT-012 | First-glance hierarchy, mobile selected-project ordering, and the primary phase/step timeline are implemented and browser-verified. Human clarity acceptance is still required before the timeline change can be archived. | Human owner | pending human acceptance |
| AUDIT-013 | Component, accessibility, search/state, responsive-contract, theme-contrast, and live-browser coverage now exists and passes. | Dashboard redesign | closed 2026-07-11 |
| AUDIT-014 | Human OpenSpec task 7.6 must confirm that completed/current/planned hierarchy, current step, phase expansion, and no-active-phase state are understandable at a glance. | Human owner | open |

## Audit Rules

- Update this file when a finding is fixed, invalidated by evidence, or moved.
- Do not mark a finding closed without verification evidence.
