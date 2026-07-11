# UX/UI Audit — Dashboard State Clarity

Status: pending_acceptance. Agent-verifiable remediation, including mixed-height axis geometry and UX-010 modal/focus behavior, is complete; UX-005 still requires explicit human clarity acceptance through timeline task 7.6.

Date: 2026-07-10.

## Purpose And Scope

This audit evaluates whether Projects Viewer lets the human owner understand project state, lifecycle phase, current step, blockers, decisions, and next action at a glance. It covers the live dashboard, selected-project overview, roadmap, tasks, search, detail drawer, responsive layout, accessibility-relevant code, and the generated data that drives the UI.

This audit does not approve implementation scope. Canonical proposed behavior for the Project Timeline / Roadmap component lives in `openspec/changes/redesign-dashboard-project-timeline/`; the broader sequencing and integration plan lives in `docs/planning/DASHBOARD_REDESIGN_PLAN.md`.

## Evidence Used

- Live dashboard at `http://127.0.0.1:5173` in live mode on 2026-07-10.
- Desktop browser inspection at 1280x720 and mobile inspection at 390x844.
- DOM/accessibility snapshots, screenshots, console log check, and interaction checks for project selection, search, Roadmap, Tasks, and the detail drawer.
- `GET /api/scan-status`, `GET /api/projects`, and `GET /api/agent-preflight-packet?projectId=projects-viewer&agentRole=reviewer`.
- Generated project summaries in `app-data/projects.generated.json`.
- `src/App.tsx`, `src/components/OverviewStats.tsx`, `ProjectSidebar.tsx`, `SelectedProjectHeader.tsx`, `ProjectTabs.tsx`, `FocusCards.tsx`, `RoadmapTimeline.tsx`, `TasksPanel.tsx`, `DetailDrawer.tsx`, `src/index.css`, `src/phaseProgress.ts`, `src/statusMeta.ts`, and `scan-projects.mjs`.
- Current tests under `tests/`; no component-level frontend/browser automation suite existed at the time of this baseline audit.

Follow-up implementation, automated evidence, measured breakpoint results, search/history/focus flows, and representative lifecycle states are recorded in `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md`.

## Executive Verdict

Projects Viewer is technically responsive and visually coherent, but the dashboard currently behaves more like a styled Markdown-parser inspector than a dependable project-control surface. The primary risk is not color or card styling: the UI gives strong visual authority to derived signals that can be stale, historical, instructional, or misclassified.

The human owner cannot reliably answer the following on the first screen:

- What is happening now?
- Which phase and step are current?
- What completed, and what is only awaiting acceptance?
- What is the one next human decision or execution action?
- Is a displayed blocker real, current, and evidenced?
- Which values are accepted facts versus low-confidence dashboard interpretations?

The redesign must therefore start with state trust and information hierarchy. A visual-only reskin would amplify incorrect status conclusions.

## 2026-07-11 Follow-up Status

| Finding | Follow-up |
|---|---|
| UX-001 | Closed: trusted source/current-state derivation was implemented and regression-tested before overview promotion. |
| UX-002 | Technically closed: compact freshness and the four-group attention brief are in the first viewport; renewed human at-a-glance acceptance remains coupled to task 7.6. |
| UX-003 | Closed: the old mixed metric bar was replaced by labelled attention actions that open matching cross-project sets. |
| UX-004 | Closed: one selected-project state header, primary timeline, and progressive detail surfaces replace repeated primary tiles. |
| UX-005 | Pending acceptance: mixed-height axis tasks 5.6-5.7 pass fresh regression/browser evidence; explicit human task 7.6 remains open. |
| UX-006 | Closed: deterministic ranking, stable identity, visible totals/truncation, keyboard control, and diagnostic opt-in are implemented and tested. |
| UX-007 | Closed: measured mobile order is project switcher, selected header, timeline, then detail tabs, without page-level overflow. |
| UX-008 | Closed: the compact responsive shell removes the measured header/sidebar collision at desktop and tablet breakpoints. |
| UX-009 | Closed: body prose uses system sans; semantic tokens and composited interaction tints pass automated AA checks in both themes. |
| UX-010 | Closed: safe versioned state, semantic tabs, search/history, Manage Projects modal behavior, and drawer isolation/trap/stable return focus are implemented and regression-tested. |
| UX-011 | Closed: Node plus component/accessibility/search/theme coverage and live-browser acceptance now exist. |

## Quantitative Observations

| Observation | Evidence | Consequence |
|---|---|---|
| Sticky header height | 157 px at 1280x720; 340 px at 390x844 | Scan operations consume too much first-screen space |
| Desktop interaction density | 54 buttons on the inspected project overview | Too many controls share the same visual priority |
| Long visible text | 20 text/button/list items over 120 characters | The overview requires reading rather than scanning |
| Desktop page height | About 1854 px for the overview fixture | Important content falls below the first viewport |
| Mobile selected-project position | Selected-project header began near y=1514 | User must pass all project cards before reaching selected-project state |
| Mobile detail navigation | Tablist began near y=2227 and its content width was about 983 px in a 340 px viewport | The primary project workflow is hidden behind long vertical and horizontal travel |
| Sticky sidebar collision | Sidebar top measured about 46 px while sticky header bottom was 157 px | About 111 px of sidebar content can sit beneath the header |
| Search saturation | Query `phase 3` returned the internal cap of 40 mixed results | No visible ranking, total, truncation notice, or separation of live work from diagnostics |
| Secondary text contrast | `--faint` measured about 3.74:1 on `--panel` and 3.40:1 on `--bg` | Ten-pixel metadata does not meet WCAG AA normal-text contrast |

## Findings

### UX-001 — Derived project state is not trustworthy enough for primary UI

Severity: P0.

Status: closed 2026-07-11; trust fixtures and overview evidence recorded in the follow-up acceptance audit.

Observed on `projects-viewer`:

- Dashboard status: `Needs attention` with health score 76.
- Current phase: `No active phase detected`.
- Next action: a reporting rule from `AGENTS.md`/verification documentation.
- Main real blocker: an unchecked test-plan step from `docs/superpowers/plans/2026-07-09-agent-preflight-packet.md`.
- Task view: 112 tasks, 98 open, 0 completed.
- Roadmap view: four phases correctly closed and Phase 4 planned.

Cross-project contradictions also exist:

- `teamSsdCli` is `Done` with score 100 while seven derived next actions exist.
- `vpn-and-router` reports no task/phase signals while twelve next actions contribute to the global count.
- `Recent decision` may contain a status line rather than a decision.
- TODO/FIXME/BUG examples and agent/process rules may become attention signals.

Cause evidence: generic checkbox and prose extraction in `scan-projects.mjs` does not sufficiently account for source authority, document lifecycle, active change, historical plan status, examples, or agent-rule context.

Required direction:

- Establish source authority and document lifecycle before overview promotion.
- Separate accepted facts, current proposed work, historical evidence, and low-confidence diagnostics.
- Require explicit current phase/step identity and integrity warnings.
- Do not use arbitrary rule/template/prose matches as primary next action or blocker.

### UX-002 — The main screen does not answer “what needs attention now?”

Severity: P0.

Status: closed 2026-07-11 after implementation, browser evidence, and human at-a-glance acceptance.

The most prominent header content is scanner telemetry: live/static mode, rescan, interval, status, files, skipped items, duration, trigger, and scan message. The main metrics emphasize totals and documentation presence but omit a ranked human brief: required decisions, real blockers, active work, pending acceptance, and between-phase projects.

Required direction:

- Collapse scan telemetry into a compact freshness control with details on demand.
- Make cross-project human decisions, true blockers, active work, and acceptance gates the primary summary.
- Surface the project brief/report output in a human-oriented view only after its underlying evidence is trustworthy.

### UX-003 — Global metrics perform local or inconsistent actions

Severity: P1.

Status: closed 2026-07-11.

`Next actions 108` and `Docs coverage 97%` are calculated across all projects, but their click behavior opens a tab for only the selected project. Status cards act as filters, while the Projects card resets filtering. Identical card styling therefore represents different interaction contracts.

Required direction: every global metric must open an aggregate view whose item count matches the displayed number, and filter/navigation actions must use distinct labels and affordances.

### UX-004 — Overview information is repeated and visually flat

Severity: P1.

Status: closed 2026-07-11.

Status, attention, next actions, blockers, coverage, and decisions repeat across the metric bar, filter chips, sidebar card, selected-project header, focus cards, and tabs. Most surfaces use the same border, radius, density, and typography, so primary and diagnostic information appear equally important.

Required direction: one primary project-state surface, one prioritized cross-project summary, and progressive disclosure for full evidence/diagnostics.

### UX-005 — Phase and step state is useful but hidden behind a secondary list view

Severity: P1.

Status: pending_acceptance. The straight-axis correction and fresh browser evidence pass; explicit task 7.6 acceptance remains open.

The existing Roadmap tab contains the best lifecycle data but renders it as another vertical list and is not visible on the first screen. `No active phase detected` hides the more useful state: closed prior phase, no active implementation phase, next planned phase, and required decision/gate.

Accepted human direction on 2026-07-10:

- Introduce a horizontal Project Timeline / Roadmap.
- Show completed phases left, the current phase with explicit emphasis, and future phases right.
- Expand one phase at a time and reveal its horizontal child-step timeline.
- Preserve the existing Projects Viewer palette and style; use the screenshot only for component mechanics/composition.

Canonical behavior and acceptance criteria: `openspec/changes/redesign-dashboard-project-timeline/specs/dashboard-project-timeline/spec.md`.

### UX-006 — Global search favors breadth over relevance

Severity: P1.

Status: closed 2026-07-11.

Search mixes roadmap entries, diagnostics, decisions, blockers, filtered process-policy candidates, and historical text in source iteration order. It silently stops at 40 results, has no relevance/current-state ranking, grouping, visible total, or full keyboard result-navigation contract.

Required direction: rank accepted/current sources first, group by project/type, disclose result total/truncation, exclude diagnostics by default, and preserve query/filter context after navigation.

### UX-007 — Mobile layout prioritizes operations and the full project list over selected-project state

Severity: P1.

Status: closed 2026-07-11.

At 390x844 the header occupies 340 px, the selected-project header begins around y=1514, and detail tabs begin around y=2227. This technically avoids page-wide horizontal overflow but fails task priority.

Required direction: compact system header; selected-project status and timeline immediately after it; project switcher as a compact control/drawer rather than a full pre-content list.

### UX-008 — Sticky sidebar is obscured by the actual sticky header

Severity: P1 bug.

Status: closed 2026-07-11.

`ProjectSidebar` uses a fixed `lg:top-[70px]` while the measured sticky header is 157 px at the audited desktop viewport. Scrolled sidebar content can appear beneath the header.

Required direction: one shared responsive sticky offset or remove nested sticky behavior in the redesigned shell; verify at each supported breakpoint.

### UX-009 — Typography and low-contrast metadata reduce readability

Severity: P2.

Status: closed 2026-07-11.

Fira Code is applied to all body prose. Long tasks, blockers, decisions, and explanations therefore read like terminal output. Ten-pixel faint metadata falls below WCAG AA normal-text contrast.

Required direction: use a readable sans-serif for prose and keep monospace for paths, IDs, commands, and compact technical values; raise contrast/size for meaningful metadata.

### UX-010 — Interaction state is not durable or fully accessible

Severity: P2.

Status: closed 2026-07-11. Selected-project navigation, Manage Projects modal semantics/focus lifecycle, and refresh-safe drawer return focus have automated and live-browser evidence.

Baseline finding: selected project, tab, filter, drawer item, and timeline context were not represented in a durable URL/state model. Tabs lacked the full arrow-key/ARIA relationship pattern. The detail drawer lacked a complete focus trap/return contract, and Manage Projects was visually modal without a fully specified dialog behavior.

Required direction: URL/local state for selected context where safe; semantic composite keyboard patterns; focus transfer/return; dialog background isolation; no hover-only essential information.

Closure evidence: Manage Projects is a named modal dialog with initial focus, Tab/Shift+Tab containment, Escape, inert background, and exact Manage-button return. Drawer focus origin is resolved through a stable source-derived ID; a real-App live-refresh regression replaces the opener node and confirms return focus reaches its replacement. Both dialogs passed keyboard checks at 1280x720, 1024x768, and 390x844 in dark and light themes.

### UX-011 — Frontend behavior lacks automated regression coverage

Severity: P2.

Status: closed 2026-07-11.

Current automated tests focus on scanner/server contracts and a pure phase-progress helper. There is no component-capable suite covering overview semantics, interaction, accessibility, sticky layout, search behavior, or responsive overflow.

Required direction: introduce the smallest compatible component test harness and retain real-browser acceptance for layout, focus, scrolling, themes, and console checks.

## Strengths To Preserve

- Cohesive existing dark/light theme tokens and restrained color palette.
- Status labels usually accompany color.
- Useful source, confidence, and normalization evidence in the existing roadmap/details workflow.
- Fast local interaction and working live/static boundaries.
- Read-only safety model and explicit configured-project path boundary.
- Existing reduced-motion handling.
- No browser console errors during the audited flows.
- Roadmap lifecycle normalization and `phaseProgress` regression tests provide a useful base for the new component.

## Acceptance And Closure Rules

- No UX finding may be closed by screenshots alone; record automated, browser, and where required human acceptance evidence.
- UX-001 and UX-002 are gates for overview promotion of the timeline.
- UX-005 is implemented only when the OpenSpec change passes its component, browser, documentation, and human acceptance criteria.
- UX-007/UX-008 require measured breakpoint verification, not only absence of page-wide overflow.
- Any accepted deviation from the OpenSpec timeline contract must update the change artifacts before implementation is declared complete.

## Recommended Next Decision

Keep `harden-mcp-context-api` as a separate operational hardening change. The dashboard redesign has 42/43 timeline tasks complete; only human-acceptance task 7.6 blocks OpenSpec archival/sync review.
