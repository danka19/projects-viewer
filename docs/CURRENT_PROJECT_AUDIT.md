# Current Project Audit

Status: in_progress.

Last updated: 2026-07-13.

## Lifecycle Status And Progress Semantics (2026-07-13)

[`LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md`](audits/LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md) confirms three status-trust defects against configured project `teamSsdCli`:

- source phases 2-4 are `ready`, `planned`, and `planned`, but conflicting acceptance vocabulary on their `Status:` lines combines with permissive parser precedence to emit `accepted`, `accepted`, and `accepted` at high confidence;
- the deliberate final-state progress rule amplifies that parser error into a false 100% project implementation value and a false `Phase 4 accepted` summary;
- accepted living specs with no owned task evidence render as `0/0 tasks` and 100%, despite the approved design also requiring no-task specification progress to remain unknown.

No parser, UI, OpenSpec, or scanned-project source was changed during the audit. Remediation requires an explicit product/change decision. The source-backed expected roadmap matrix is `closed`, `closed`, `ready`, `planned`, `planned`, which produces 40% under the current mean-of-known-phases formula.

The owner approved the recommended Projects Viewer-only direction on 2026-07-13. The written design is [`2026-07-13-lifecycle-status-progress-semantics-design.md`](superpowers/specs/2026-07-13-lifecycle-status-progress-semantics-design.md): exact leading phase status is authoritative, contradictory explanatory lifecycle prose becomes an integrity warning, genuine accepted-phase progress remains unchanged, and accepted living specs without task evidence report unknown progress. Implementation planning remains gated on final review of that written design. `teamSsdCli` remains read-only and will receive only a textual follow-up task.

## Phase And OpenSpec Status Reconciliation (2026-07-12)

| Item | Status | Evidence / blocker |
|---|---|---|
| Roadmap Phases 0-3 | `closed` | Human acceptance and phase-gate evidence are recorded in their phase plans. |
| Roadmap Phase 4 | `draft` | Detailed scope has not been accepted; the timeline and MCP workstreams do not silently activate the phase. |
| `add-persistent-project-management` | `accepted` | Implemented and included in the accepted Phase 0 foundation, but the OpenSpec change remains unarchived. |
| `add-project-brief-report` | `accepted` | Phase 3 was explicitly accepted and closed; archival remains a separate action. |
| `agent-preflight-packet` | `pending_acceptance` | Tasks are complete and verification evidence exists; the audit still records human acceptance as outstanding. |
| `harden-dashboard-state-derivation` | `accepted` | The trust gate was implemented and included in the accepted redesign evidence; archival remains separate. |
| `improve-dashboard-search-navigation` | `accepted` | Implementation and verification are included in the accepted redesign evidence; archival remains separate. |
| `redesign-dashboard-project-timeline` | `accepted` | All 43/43 tasks are complete. Commit `9cfb550` and fresh six-viewport/theme geometry evidence close tasks 5.6-5.7; the owner explicitly authorized integration on 2026-07-13, closing task 7.6. Archival remains separate. |
| `add-selectable-specs-canvas` | `accepted` | OpenSpec artifacts validate strictly; scanner/config/model/layout/routing/state/search/UI implementation is complete with 107 Node + 91 component tests, production build, and dark/light 1280×720, 1024×768, 390×844 browser evidence. The owner authorized integration on 2026-07-13; archival remains separate. |
| `harden-mcp-context-api` | `archived` | Implementation, verification, accepted-spec sync, and archival are complete at `openspec/changes/archive/2026-07-12-harden-mcp-context-api/`. |
| [`improve-dashboard-evidence-trust`](../openspec/changes/improve-dashboard-evidence-trust/) | `accepted` | All 13/13 implementation tasks are checked, verification passes, and the owner authorized integration on 2026-07-13. The change is intentionally unsynced and unarchived pending the separate explicit lifecycle workflow. |
| Accepted specs `ai-context`, `ai-findings`, `agent-preflight-packet`, `local-project-config`, `mcp-context-api` | `accepted` | Present under `openspec/specs/` and validated by OpenSpec. |

Sequential work: the owner authorized integration of the complete dashboard branch on 2026-07-13, closing timeline task 7.6 and accepting the selectable Specs Canvas. MCP/API hardening is complete and archived independently of timeline geometry. Dashboard evidence-trust implementation, acceptance evidence, documentation/task-state reconciliation, and strict OpenSpec CLI gate are complete as the follow-on hardening slice. Active dashboard changes remain unsynced and unarchived until separate explicit lifecycle workflows.

## Repository Baseline

| Item | Current State |
|---|---|
| Repository root | `C:\Users\danoc\Documents\projects\projects-viewer` |
| Current implementation worktree | `C:\Users\danoc\Documents\projects\projects-viewer` |
| Current branch | `main` |
| Remote | `origin https://github.com/danka19/projects-viewer.git` |
| Current commit | `295185e` (`docs: record dashboard integration acceptance`) |
| Local divergence | `main` matched `origin/main` at audit start; the working tree was clean before this documentation-only audit. |

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
| Tests available | `npm test` passed on 2026-07-11: 97 Node tests plus 71 Vitest component/accessibility/search tests. The focused timeline component suite passed 40/40 through `npx vitest run tests/components/project-timeline.test.tsx`. |
| Build available | TypeScript `npx tsc --noEmit` passed after the final timeline review fixes; final production build evidence is recorded in the redesign acceptance audit |
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
| UX/UI live-browser audit | On 2026-07-10 the dashboard was inspected at 1280x720 and 390x844. Evidence recorded false current next-action/blocker/task promotion, repeated dense text, global-to-local metric actions, noisy 40-result search saturation, a 340 px mobile header, selected-project content below y=1500 on mobile, and a desktop sticky sidebar/header overlap. Full evidence is in `docs/audits/UX_UI_AUDIT_2026-07-10.md`. |
| Dashboard state-trust gate | `harden-dashboard-state-derivation` implemented trusted constraint filtering/current-state derivation before overview promotion; representative trust fixtures and the full suite pass. |
| Project Timeline implementation | `src/timeline/` provides the trusted model/state, horizontal phase/step axes, current/expanded separation, edge states, keyboard/reduced-motion behavior, responsive overflow, integrity disclosure, and read-only drawer integration. Commit `9cfb550` adds the equal-height card contract; current status is accepted with 43/43 tasks complete. |
| Dashboard overview implementation | The compact system bar, four-group attention brief, selected-project state header, primary timeline placement, four semantic detail surfaces, and mobile project switcher are implemented. |
| Search/navigation implementation | `src/search.ts`, `GlobalSearch.tsx`, and `src/uiState.ts` provide deterministic ranked search, explicit diagnostic opt-in, true totals/truncation, keyboard navigation, safe versioned local/history state, Back/Forward behavior, and stable drawer/timeline descriptors. |
| Dashboard browser acceptance | Fresh dark/light checks at 1280x720, 1024x768, and 390x844 measured 0 px axis deviation, one shared card height per row, zero clipped phase cards, zero page-level overflow, and no console warnings/errors. Manage Projects and drawer focus containment, Escape, inert background, and exact return focus passed at all six matrix points. |
| Dashboard modal/focus remediation | Manage Projects now implements named modal semantics and a complete keyboard/focus lifecycle. Drawer return focus uses source-derived opener IDs, and a real-App polling integration test proves focus survives replacement of the opener during live refresh. |
| Dashboard redesign plan | `docs/planning/DASHBOARD_REDESIGN_PLAN.md` records the bounded sequence and the reopened axis acceptance gate while keeping MCP/API hardening and roadmap Phase 4 separate. |
| Dashboard evidence-trust remediation | Active change `improve-dashboard-evidence-trust` excludes completed checkbox blockers, cross-line OpenSpec normative blocker text, and non-action next-action prose; search exposes query-centered fragments and deduplicates source-equivalent result representations. Final review found that one unchecked scanner source line could still appear as blocker text with `[ ]` and task text without it. Search now uses a narrow internal canonical evidence identity (project path, file, line, and text with only a leading Markdown checkbox marker removed) while preserving kind-specific result keys, public schemas, scanner output, and safety boundaries. The final gates passed 18/18 focused search tests, 19/19 scanner/run-scan tests, 133/133 Node plus 105/105 Vitest full tests, production build, and strict OpenSpec validation; the fresh 83-file rescan and corrected 1280x720/390x844 browser acceptance remain valid. The dated API/UX trust audit owns exact commands, root causes, counts, and residual limitations. |
| Documentation/phase status sync | On 2026-07-10 the stale audit branch baseline was corrected to `main`; Phase 0-3 work-item status lines were normalized from legacy `completed`/pending wording to explicit closed/accepted lifecycle wording supported by existing human gate evidence. No Phase 4 status was inferred. |

## Change Intake: Selectable Roadmap And Specs Views (2026-07-11)

- Idea: let the primary project visualization switch between roadmap phases and specification-led work so a project remains useful when no canonical roadmap exists.
- Source: human owner. `teamSsdCli` is the representative spec-first analytics project; analytics documentation is expected to contain specifications rather than a custom roadmap, while developer roadmaps may exist separately beside implementation code.
- Type: `new_feature`, `architecture_change`, `data_contract_change`.
- Decision: `create_openspec_change` after the view semantics and source boundaries are approved through design discovery.
- Reason: the current primary Timeline is built only from `project.phases`; generic spec documents are available only in the secondary Knowledge surface, and the current `SpecItem` contract does not preserve structured requirements, tasks, hierarchy, or source scope needed for an equivalent primary view.
- Affected specs: the new change must define selectable primary views, spec/task lifecycle mapping, roadmap/spec relationships, empty and mixed-source behavior, persistence, navigation, accessibility, and source evidence. It must reference rather than silently extend the accepted timeline behavior.
- Affected architecture: scanner normalization, generated project data, primary-view presentation model, persisted UI state, drawer/search navigation, and optional per-project documentation-source boundaries.
- Data contract impact: add a structured spec-work model instead of coercing specs into `PhaseItem`; preserve source kind and evidence, attach tasks to their owning spec when evidenced, and keep unowned tasks explicit rather than fabricating a roadmap hierarchy.
- Verification impact: cover roadmap-only, spec-only, mixed roadmap/spec, task-only, and no-structured-work fixtures, including the representative `teamSsdCli` source layout.
- Human source-boundary decision: support both configured per-view documentation roots and mixed repositories. A project may map `Specs` and `Roadmap` to separate roots when analytics and developer documentation are separated, while the same views must also classify and filter co-located documents when both kinds live in one repository. These are complementary source strategies, not mutually exclusive project modes.
- Human hierarchy decision: in `Specs` view, one specification or OpenSpec change is the top-level work unit analogous to a roadmap phase, and its tasks are nested steps. Specifications are not placed on one implied sequential line. They are independent and may proceed in parallel unless source documentation explicitly declares a dependency.
- Dependency rule: represent an evidenced dependency as a directed `dependsOn` edge. A dependent specification is blocked only while a declared prerequisite is unsatisfied. File order, numbering, directory order, timestamps, semantic similarity, or an agent inference must never create a dependency. Every edge must preserve source evidence; missing or contradictory evidence is disclosed instead of guessed.
- Human view-state decision: remember the selected primary view separately for each project. On a project's first visit, use its configured `defaultView` when that view has data; after an explicit user switch, the valid per-project choice overrides the configured default for subsequent visits. A selection from one project must never leak into another, and a saved selection whose source disappeared must fall back safely instead of rendering a false empty state.
- Human first-visit decision: when both Roadmap and Specs contain data but neither `defaultView` nor a valid saved per-project choice exists, open Roadmap. This is a deterministic backward-compatible tie-breaker, not a claim that Roadmap is more canonical than Specs.
- Rejected presentation: the first layered dependency-graph mockup was too schematic and looked like a data-diagram wireframe rather than a finished product interface. Its visual direction is rejected; the accepted spec/task and dependency semantics remain valid.
- Human presentation direction: `Specs` view should feel like a polished hybrid of Trello cards and a mindboard canvas. Specifications remain substantial work cards with status, progress, ownership/source context, and task summary; the canvas communicates clusters and spatial relationships, while restrained connectors appear only for explicit dependencies. The result must look native to the existing Projects Viewer visual system rather than like a generic graph editor.
- Human composition refinement: combine the promising parts of the `Board Canvas` and `Focus Constellation` sketches into one `Canvas Focus` direction. Dependency relationships must be drawn as dedicated connector lines behind the cards, anchored to visible edge ports and routed through free canvas space. A connector must never pass through or visually merge with a card; arrow direction and optional short labels communicate prerequisite semantics. Independent cards have no connector.
- Status: source-boundary, spec/task hierarchy, dependency semantics, primary-view selection, Trello-card treatment, mindboard canvas, and non-overlapping connector rules are accepted. A complete draft covering final composition, interaction, source configuration, dense/mobile fallback, errors, accessibility, safety, and acceptance criteria is recorded in `docs/superpowers/specs/2026-07-11-selectable-roadmap-specs-canvas-design.md`; human document review remains required before OpenSpec proposal or implementation planning. No implementation is authorized until the design is approved.

## Change Intake: Safe Modal Backdrop Dismissal (2026-07-11)

- Idea: Manage Projects should close when the user clicks the backdrop only if the modal has no unsaved changes.
- Source: human owner.
- Type: `scope_refinement`, `new_feature`, `verification_change`.
- Decision: `create_openspec_change` as a small modal-interaction change rather than broadening the Project Timeline specification.
- Reason: the current modal has no dirty-state model, does not handle backdrop clicks, and always closes on Escape or the Close button. Dismissal paths need one consistent safety contract before backdrop dismissal is added.
- Affected specs: modal dismissal, dirty-state definition, busy-state behavior, discard confirmation or blocked-dismissal feedback, exact focus return, and keyboard/pointer parity.
- Affected architecture: local Manage Projects presentation state only; no scanned-project writes or remote behavior are introduced.
- Data contract impact: no persisted server contract is expected; the UI must derive ephemeral dirty state from unsaved form and selection values while distinguishing already-saved API mutations.
- Verification impact: cover clean backdrop dismissal, clicks inside the panel, dirty backdrop behavior, Escape and Close parity, busy operations, focus containment, and exact return focus.
- Human dismissal decision: use one confirmation contract for every dismissal path. When the modal is clean, backdrop click, Escape, and Close dismiss immediately. When it is dirty, each path opens an accessible confirmation with explicit **Discard changes** and **Continue editing** actions; no path may discard silently. Clicking inside the panel never requests dismissal.
- Status: dismissal behavior accepted; exact dirty-state inputs and busy-state handling remain to be specified before implementation.

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
| AUDIT-010 | MCP/API hardening implementation, verification, independent review, accepted-spec sync, and OpenSpec archival are complete: root legacy config fallback is removed, compact saved project ids are exposed, `/api/*` parser and routing failures stay JSON, MCP response validation is hardened, and local HTTP diagnostics guidance is updated. | Completed hardening slice | closed 2026-07-12 |
| AUDIT-011 | Dashboard trust filtering/current-state derivation is implemented and regression-tested before overview promotion. | Dashboard redesign | closed 2026-07-11 |
| AUDIT-012 | First-glance hierarchy, mobile ordering, and corrected straight-axis geometry are implemented, browser-verified, and covered by explicit owner integration acceptance. | Dashboard redesign | closed 2026-07-13 |
| AUDIT-013 | Component, accessibility, search/state, responsive-contract, theme-contrast, and live-browser coverage now exists and passes. | Dashboard redesign | closed 2026-07-11 |
| AUDIT-014 | Previous task 7.6 acceptance was inferred too broadly. Corrected geometry was verified in `9cfb550`; the owner then explicitly authorized merge to `main` and push on 2026-07-13. | Human owner | closed 2026-07-13 |
| AUDIT-015 | Manage Projects now has `role="dialog"`, `aria-modal`, an accessible name, initial focus, bidirectional focus containment, Escape dismissal, inert background, and exact focus return. Four component scenarios and all six dark/light browser matrix points pass. | Dashboard redesign | closed 2026-07-11 |
| AUDIT-016 | Drawer focus return now resolves a stable source-derived opener ID instead of retaining a DOM element. A real-App polling integration test replaces the phase-details opener during live refresh and proves Escape focuses its replacement; all six browser matrix points also pass. | Dashboard redesign | closed 2026-07-11 |
| AUDIT-017 | [`API_UX_TRUST_AUDIT_2026-07-12.md`](audits/API_UX_TRUST_AUDIT_2026-07-12.md) records four remediated and verified trust findings. Archived `harden-mcp-context-api` solely owns the completed API fallback remediation. Active [`improve-dashboard-evidence-trust`](../openspec/changes/improve-dashboard-evidence-trust/) owns the implemented and verified scanner/search remediation; all 13/13 tasks and the strict OpenSpec CLI gate are complete, while accepted-spec sync and archival remain a separate explicit workflow. Timeline clarity and selectable Specs Canvas integration were accepted by the owner on 2026-07-13. | Phase 4 hardening changes | remediation_verified; integration_accepted 2026-07-13 |

## Audit Rules

- Update this file when a finding is fixed, invalidated by evidence, or moved.
- Do not mark a finding closed without verification evidence.
