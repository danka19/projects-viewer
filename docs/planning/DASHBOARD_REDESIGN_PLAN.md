# Dashboard Redesign Plan

Status: pending_acceptance on `dashboard-redesign/ui-rebuild`. Commit `9cfb550` closes mixed-height axis tasks 5.6-5.7; the remaining Manage Projects and refresh-safe drawer focus gaps are technically closed; explicit human acceptance task 7.6 remains open.

Date: 2026-07-10. Implementation evidence updated 2026-07-11.

## Goal

Redesign Projects Viewer so the human owner can understand cross-project attention, selected-project lifecycle position, current phase/step, next trusted action, blockers, acceptance gates, and evidence without reading a dense Markdown-derived dashboard.

The Project Timeline / Roadmap is the central visual component of the selected-project experience. Its canonical behavior is defined by `openspec/changes/redesign-dashboard-project-timeline/`.

## Inputs And Sources Of Truth

- UX evidence and findings: `docs/audits/UX_UI_AUDIT_2026-07-10.md`.
- Timeline proposal/design/tasks: `openspec/changes/redesign-dashboard-project-timeline/`.
- Normative timeline requirements: `openspec/changes/redesign-dashboard-project-timeline/specs/dashboard-project-timeline/spec.md`.
- Search/navigation proposal and requirements: `openspec/changes/improve-dashboard-search-navigation/`.
- Implementation/browser evidence: `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md`.
- Existing lifecycle vocabulary: `docs/03-status-rules.md`, `src/types.ts`, and `src/statusMeta.ts`.
- Implemented timeline: `src/timeline/`, `src/phaseProgress.ts`, and `src/components/ProjectTabs.tsx`.
- Existing product boundaries: `AGENTS.md`, `docs/CONTEXT.md`, and accepted OpenSpec specs.
- Visual reference: horizontal parent phases, exclusive expansion, and nested horizontal steps only. Reference palette, people, dates, application shell, zoom controls, and sample data are excluded.

## Product Principles

1. **Truth before polish.** Primary UI must not amplify historical plans, agent rules, templates, examples, or low-confidence text matches as current work.
2. **Decision before inventory.** First-screen content answers what needs a human decision/action, not how many Markdown artifacts were parsed.
3. **Lifecycle before document count.** Phase, step, gate, and evidence are more useful than raw task/decision/document totals.
4. **Progressive disclosure.** Show one concise state summary and one expanded phase; keep full evidence and diagnostics behind details.
5. **Global values lead to global views.** A dashboard-wide count must open the matching dashboard-wide result set.
6. **Status, current, selected, and expanded are separate concepts.** Visual styling and state management must not conflate them.
7. **Responsive priority, not only responsive fit.** Selected-project state appears before the full project inventory on narrow screens.
8. **Read-only by design.** The redesign does not add project/task edits, commands, auth, cloud behavior, or scanned-project writes.

## Target Information Architecture

### 1. Compact system bar

Primary content:

- Projects Viewer identity.
- Global search.
- Data freshness/mode summary.
- Project switcher and settings/theme access.

Progressive details:

- Rescan action.
- Auto interval.
- scanned/skipped file counts.
- duration, trigger, full scan message, and diagnostics.

The system bar must not consume more vertical space than the project state it supports.

### 2. Cross-project attention brief

Show four prioritized aggregate groups rather than seven equal metrics:

- Requires owner decision/acceptance.
- Real blockers/acceptance gaps.
- Active work.
- Between phases / no active work item.

Each group opens a global result view with matching count/evidence. Documentation coverage and scan health move to secondary diagnostics.

### 3. Selected-project state header

Show:

- Project name and normalized project status.
- Current lifecycle sentence: for example, prior phase closed, no active phase, next phase planned.
- One trusted next human decision/action.
- One real blocker/gate when present.
- Confidence/integrity/freshness disclosure.
- Compact source access.

Remove repeated six-tile prose. Do not show an unexplained health score as the primary state.

### 4. Project Timeline / Roadmap

Always-visible phase axis:

- Resolved phases on the left in muted form.
- Explicit current phase centered and emphasized.
- Eligible future phases on the right.
- One expanded phase at a time.
- Nested horizontal steps beneath the axis.
- Source/confidence/integrity access through the read-only details flow.

The timeline appears after the state header and before secondary details. It was promoted after the state-trust and initial browser gates passed. The owner accepted the delivered hierarchy and interaction, but later reported a visible mixed-height broken-axis defect. Corrected geometry now has fresh evidence; task 7.6 remains open only for explicit owner acceptance.

### 5. Secondary detail navigation

Recommended consolidation from eight tabs to four conceptual surfaces:

- **Status:** state header, timeline, focused evidence.
- **Work:** next actions, real blockers, approval gates, review, deferred work, and diagnostics disclosure.
- **Decisions:** dated/current decisions and required owner decisions.
- **Knowledge:** specs, audits, documentation coverage, and activity.

Exact labels may be localized later; conceptual separation is the requirement. Parser diagnostics must not be mixed into normal work by default.

## Decomposition Into Implementable Changes

### Change A — Harden dashboard state derivation

Implemented OpenSpec change: `harden-dashboard-state-derivation`.

Scope:

- Define source authority order and document lifecycle.
- Exclude historical plans, agent rules, examples, templates, and archived changes from primary current-work signals.
- Reconcile task/checklist state with phase/change lifecycle.
- Produce explicit `currentPhaseId`, `currentStepId`, next decision/action, blocker/gate, confidence, integrity issues, and evidence.
- Add representative cross-project fixtures for contradictions found in UX-001.

Gate:

- `projects-viewer` no longer treats reporting rules or old implementation-plan checkboxes as current next actions/blockers.
- Done projects cannot contribute unexplained live next-action counts.
- Generated state and roadmap phase/step model agree for tested fixtures.

This change must precede authoritative overview promotion of the timeline.

### Change B — Project Timeline / Roadmap

Pending-acceptance proposal with 42/43 tasks complete: `openspec/changes/redesign-dashboard-project-timeline/`.

Scope:

- Presentation model and deterministic progress.
- Horizontal phase axis and nested step axis.
- Exclusive expansion and keyboard state.
- Loading/empty/error/stale/partial/no-steps states.
- Long-list overflow, responsive behavior, accessibility, and read-only evidence drawer integration.
- Component/browser/human acceptance.

Gate:

- All OpenSpec requirements and scenarios have corresponding evidence.
- Timeline passed automated and browser acceptance before overview promotion; human at-a-glance acceptance followed on 2026-07-11.
- Dark/light and desktop/tablet/mobile browser checks pass.

### Change C — Redesign dashboard overview

Implemented overview slice on the redesign branch.

Scope:

- Compact system bar and diagnostics disclosure.
- Cross-project attention brief.
- Compact selected-project state header.
- Global metric/result consistency.
- Timeline promotion into Status/Overview.
- Consolidated secondary navigation.

Gate:

- At 1280x720, selected-project state and phase axis are visible on first load.
- Every global count opens the exact matching global set.
- Human owner can identify current phase/step, next action/decision, and real blocker in under ten seconds for representative fixtures. The owner accepted the delivered first-glance hierarchy on 2026-07-11; this outcome is recorded as human evidence rather than an agent-completed claim.

### Change D — Search and durable navigation state

Implemented proposal: `openspec/changes/improve-dashboard-search-navigation/`.

Scope:

- Current/accepted-source ranking.
- Project/type grouping and diagnostic opt-in.
- Total/truncation disclosure and full result keyboard pattern.
- Durable selected project, tab/surface, filters, expanded phase, and drawer identity where safe.
- Refresh/back/forward behavior without arbitrary path exposure.

Gate:

- Search does not silently cap results without disclosure.
- Current roadmap/state results outrank historical diagnostics.
- Refresh preserves safe selected context.

### Change E — Responsive and accessibility acceptance

Implemented across B-D; agent verification passed and the human clarity gate remains separate.

Scope:

- Mobile selected-project-first ordering.
- Shared sticky offset or removal of colliding sticky containers.
- Prose typography and WCAG AA contrast.
- Dialog focus/background isolation.
- Responsive layout tests and real-browser evidence.

Gate:

- No sidebar/header overlap at supported breakpoints.
- Selected-project state and timeline appear before the full project list on mobile.
- Keyboard-only use can select projects, navigate phases/steps, inspect details, search, and return focus.

## Recommended Execution Order

| Order | Work | Why |
|---|---|---|
| 0 | Finish or explicitly reprioritize `harden-mcp-context-api` | Existing operational hardening remains a separate open Phase 4 candidate |
| 1 | Change A: state derivation trust | Prevents visual amplification of wrong project state |
| 2 | Change B: timeline behind current Roadmap surface | Builds and verifies the reusable visual component in isolation |
| 3 | Change C: overview integration | Promotes accepted trusted state into the first screen |
| 4 | Change D: search/navigation state | Makes the redesigned information retrievable and durable |
| 5 | Change E gate and pilot acceptance | Confirms mobile, accessibility, sticky layout, and human clarity |

If the human owner prioritizes visible UX before MCP hardening, Change A remains non-negotiable before Change C; Change B may run in parallel only as an isolated Roadmap-surface implementation using explicit fixture/current IDs.

Implementation result on 2026-07-11: the owner requested the UX-first sequence. Change A landed before overview promotion; B and C established the trusted primary timeline/overview; D added ranked search and safe presentation-state persistence; E passed automated and live-browser checks. MCP/API hardening remains an independent change and was not silently folded into the redesign.

## Affected Files And Boundaries

Primary implemented files:

- `src/App.tsx`: shell, aggregate attention brief, selected-project/mobile ordering, durable view state.
- `src/components/AttentionBrief.tsx`: prioritized cross-project attention groups.
- `src/components/ProjectSidebar.tsx`: compact/mobile project switcher and sticky behavior.
- `src/components/SelectedProjectHeader.tsx`: compact trusted lifecycle summary.
- `src/components/ProjectTabs.tsx`: detail-navigation consolidation and timeline placement.
- `src/timeline/`: trusted presentation model, interaction state, phase/step components, legend, and fallback states.
- `src/components/GlobalSearch.tsx`, `src/search.ts`: ranked accessible search and diagnostic opt-in.
- `src/uiState.ts`: versioned local/history presentation state and safe descriptor restoration.
- `src/phaseProgress.ts`: deterministic progress semantics.
- `src/statusMeta.ts` and `src/index.css`: existing semantic tokens, contrast, typography, responsive/sticky variables.
- `src/types.ts`: explicit presentation/current/integrity contract when upstream support is added.
- `scan-projects.mjs`: source authority, lifecycle reconciliation, trusted current/next/blocker derivation.
- `tests/`: scanner contract, timeline model/state/component, accessibility, responsive, and browser acceptance coverage.

Safety boundaries remain unchanged: saved project IDs/paths only, scanned projects read-only, no arbitrary browser paths, no task/calendar writes, no commands/commits from dashboard behavior, no remote model/auth/cloud additions.

## Verification Strategy

### Automated

- Pure scanner/source-authority fixtures for known false-positive cases.
- Presentation-model/progress/reducer tests.
- Component DOM, keyboard, ARIA, focus, loading/error/empty, and long-list tests.
- Full existing Node test suite and TypeScript/Vite production build.
- OpenSpec strict validation and whitespace checks.

### Browser

- Dark and light themes.
- Desktop 1280x720 and a wider desktop.
- Tablet around 768-1024 px.
- Mobile around 390x844.
- Search, selected-project change, timeline expand/collapse/switch, step drawer, refresh, manual horizontal scroll, `Jump to current`, keyboard-only traversal, reduced motion, and stale/error states.
- Console error/warning check and page-level horizontal-overflow check.

### Human acceptance

For representative projects, the human owner must be able to identify without opening source documents:

1. previous resolved phase;
2. explicit current phase or between-phase state;
3. current step or absence of documented steps;
4. next planned phase;
5. pending acceptance/required decision;
6. real blocker versus diagnostic warning;
7. source/confidence when state is uncertain.

Outcome 2026-07-11: the earlier acceptance inference was superseded by the owner's visible broken-axis report. Commit `9cfb550` closes tasks 5.6-5.7 with a red-green regression and six dark/light viewport checks. A subsequent bounded pass closed Manage Projects modal semantics/focus and the live-refresh drawer return-focus race with component, integration, and six-point browser evidence. Explicit human task 7.6 remains open.

## Redesign Acceptance Matrix

| Audit finding | Required closure evidence |
|---|---|
| UX-001 | Source-authority fixtures and corrected representative generated state |
| UX-002 | First-screen attention brief and human ten-second comprehension check |
| UX-003 | Count-to-result contract tests for every global metric |
| UX-004 | First-viewport hierarchy browser evidence and removal of repeated primary signals |
| UX-005 | `dashboard-project-timeline` OpenSpec automated/browser/human acceptance |
| UX-006 | Search ranking/grouping/total/keyboard tests |
| UX-007 | Mobile selected-project-first screenshots and interaction evidence |
| UX-008 | Measured sticky header/sidebar non-overlap at supported breakpoints |
| UX-009 | Contrast report and prose typography browser review |
| UX-010 | URL/state, tab/timeline keyboard, dialog focus and return-focus tests |
| UX-011 | Component-capable automated suite plus live browser gate |

## Out Of Scope

- No Figma asset, image generation, new brand system, or palette replacement.
- No calendar/Gantt scheduling, dependencies, owners, avatars, date editing, zoom controls, or draggable phases copied from the reference.
- No cloud, auth, collaboration, remote models, notifications, external task systems, or scanned-project writes.
- No silent roadmap Phase 4 activation; detailed phase planning still requires a human decision and the phase template.

## Human Acceptance Outcome

OpenSpec task 7.6 remains open. The completed/current/planned hierarchy, current step, exclusive phase expansion, no-active-phase state, corrected mixed-height straight-axis geometry, modal keyboard lifecycle, and refresh-safe drawer focus now have agent evidence. `redesign-dashboard-project-timeline` remains active at 42/43 tasks; archival and integration are blocked only until explicit human acceptance.
