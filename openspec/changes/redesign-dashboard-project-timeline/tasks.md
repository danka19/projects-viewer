## 1. Trusted Timeline Presentation Model

- [x] 1.1 Add failing tests for ordered phase/step mapping, stable non-index keys, explicit current IDs, model revision, progress basis, partial state, and integrity issues.
- [x] 1.2 Define the timeline presentation-model types in a focused frontend module while preserving the existing public scanner contract.
- [x] 1.3 Implement the pure project-to-timeline adapter without text scanning or fallback selection from arbitrary checkbox/prose signals.
- [x] 1.4 Extend `phaseProgress` tests for cancelled/superseded denominator exclusion, blocked/deferred incomplete steps, unknown progress, and project-level known/unknown progress disclosure.
- [x] 1.5 Run the focused presentation-model and progress tests and record the exact evidence.
      Evidence 2026-07-11: `npm test -- tests/phase-progress.test.mjs tests/timeline-model.test.mjs` — 21/21 pass; module `src/timeline/model.ts`, adapter `buildProjectTimelineModel`.

## 2. Expansion And Navigation State

- [x] 2.1 Add failing reducer/controller tests for default current expansion, no-current state, repeated-click collapse, exclusive phase switching, project/revision reset, and preserved state on compatible refresh.
- [x] 2.2 Implement a pure timeline interaction state boundary with `expandedPhaseId`, focused phase/step identity, and originating detail-control identity.
- [x] 2.3 Add failing keyboard tests for phase Left/Right/Home/End/Enter/Space/Escape/ArrowDown and step Left/Right/Home/End/Enter/Space/ArrowUp behavior.
- [x] 2.4 Implement roving focus and deterministic scroll-into-view triggers without repeated automatic recentering after manual scroll.
- [x] 2.5 Run the focused interaction and keyboard tests and record the exact evidence.
      Evidence 2026-07-11: `npm test -- tests/timeline-state.test.mjs` — 7/7 pass; `npx vitest run` keyboard suite — pass (`src/timeline/state.ts`, `tests/components/project-timeline.test.tsx`).

## 3. Phase Timeline Components

- [x] 3.1 Split the current roadmap monolith into focused timeline shell, phase viewport, phase card, axis/node, legend, and fallback-state components with explicit prop contracts.
- [x] 3.2 Add component tests for every supported `PhaseStatus`, current-versus-expanded distinction, visible non-color cues, confidence/issue disclosure, and known/unknown progress rendering.
- [x] 3.3 Implement the single-row horizontal phase axis with existing theme tokens, semantic ordered-list/buttons, exclusive expansion, edge affordances, and `Jump to current`.
- [x] 3.4 Preserve phase source/evidence access through the existing read-only detail drawer and verify drawer focus restoration.
- [x] 3.5 Run focused phase component tests in dark and light theme contexts.
      Evidence 2026-07-11: components use theme tokens only (no theme-conditional logic); live browser checked in dark and light at 1280x720 on the Roadmap surface.

## 4. Nested Step Timeline

- [x] 4.1 Add component tests for completed/current/planned, pending-acceptance, blocked, deferred, cancelled, and superseded step presentation.
- [x] 4.2 Implement the phase-to-step bridge and independent single-row step viewport with smaller cards, parent context label, and explicit current-step identity.
- [x] 4.3 Implement the no-steps child state with phase progress/status basis and `Open phase details`.
- [x] 4.4 Wire step activation to the existing read-only detail drawer and verify evidence/source rendering plus return focus.
- [x] 4.5 Run focused nested-step tests, including long names, missing display IDs, and stable source-derived keys.
      Evidence 2026-07-11: `tests/timeline-model.test.mjs` (source-derived keys for id-less steps), `tests/components/project-timeline.test.tsx` step suites — pass.

## 5. Loading, Error, Scale, And Responsive Behavior

- [x] 5.1 Add tests for loading without data, background refresh with retained data, empty, live retryable error, static non-retryable error, stale retained model, partial model, and integrity warning states.
- [x] 5.2 Implement bounded skeleton, empty, error, stale, partial, and integrity-warning presentations without fabricated status or progress.
- [x] 5.3 Add responsive tests for phase/step no-wrap behavior, overflow detection, visible neighbor/edge affordances, and card sizing at desktop, tablet, and mobile widths.
- [x] 5.4 Implement proximity scroll snapping, manual-scroll preservation, current/focus centering triggers, compact metadata above twelve phases, and bounded rendering through scanner limits.
- [x] 5.5 Verify the selected-project header and phase axis fit the first 1280x720 viewport and the mobile timeline precedes the full project list/detail navigation. (Gated on the overview redesign slice.)
      Evidence 2026-07-11: component geometry contracts pass; live browser at 1280x720 measured the header at y=183-382, timeline at y=398-712, and detail tabs at y=728. At 390x844 the project switcher, selected header, timeline, and tabs appeared in that order; document width remained 380/380 while the phase row scrolled only inside its 314 px viewport.
- [x] 5.6 Add a failing regression test and stretch every phase card to the tallest card in its row without fixed heights or clipping.
      Evidence 2026-07-11: the new component test failed with `Expected flex-1` against the pre-fix `PhaseCard`, then passed 40/40 after the card adopted the existing equal-height flex contract. No fixed height or overflow clipping was added.
- [x] 5.7 Verify in dark/light at 1280x720, 1024x768, and 390x844 that mixed-content phase cards share one axis baseline with no more than 1 px node deviation.
      Evidence 2026-07-11: all six dark/light viewport combinations measured 0 px phase-axis deviation, one shared card height per row, zero vertically clipped phase cards, and zero page-level horizontal overflow. Desktop/tablet card height was 131.25 px; mobile was 112.25 px.

## 6. Accessibility And Motion

- [x] 6.1 Add accessibility assertions for labelled ordered lists, semantic buttons, `aria-current`, `aria-expanded`, `aria-controls`, progress descriptions, live-region announcements, and scroll-container labels.
- [x] 6.2 Implement visible focus, complete keyboard parity, expansion announcements, drawer focus transfer/return, and non-hover access to all essential information.
- [x] 6.3 Verify WCAG 2.1 AA contrast for dark/light text, lifecycle tokens, axis states, and focus indicators.
- [x] 6.4 Add reduced-motion coverage and implement immediate/minimal centering and expansion when `prefers-reduced-motion` is active.
- [x] 6.5 Run the focused accessibility suite and record any automated-tool limitations for manual follow-up.
      Evidence 2026-07-11: timeline tests pass 39/39; navigation/drawer tests pass 6/6; theme contrast tests pass 4/4. Browser keyboard checks covered timeline/tab/search movement, modal focus containment, exact-origin return, and Back/Forward restoration. Automated contrast math does not replace the still-open human clarity gate.

## 7. Dashboard Integration And Acceptance

- [x] 7.1 Replace the vertical roadmap list inside the Roadmap surface while preserving existing details, source evidence, related decisions/audits, and read-only boundaries.
      Evidence 2026-07-11: `ProjectTabs` renders `ProjectTimeline`; `phaseDrawer` now carries related decisions/audits; `RoadmapTimeline.tsx` removed.
- [x] 7.2 Verify that global project selection, refresh, live/static mode, search navigation, theme persistence, and drawer behavior remain stable.
      Evidence 2026-07-11: full `npm test` (93 node + 18 component) and live browser interaction checks pass.
- [x] 7.3 Complete the scanner-state trust gate for current phase/step inputs before promoting the timeline into the primary selected-project overview.
      Evidence 2026-07-11: OpenSpec change `harden-dashboard-state-derivation` implemented with UX-001 fixtures.
- [x] 7.4 Promote the accepted timeline below the compact selected-project state header and update the redesigned detail navigation only after trust/browser gates pass.
- [x] 7.5 Run browser acceptance in dark and light themes at desktop, tablet, and mobile widths, checking overflow, touch/keyboard navigation, sticky layout, focus return, console errors, and page-level horizontal overflow.
      Evidence 2026-07-11: `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md` records dark/light 1280x720, 1024x768, and 390x844 checks, local-versus-page overflow, focus/history flows, console inspection, and edge-state fixtures. Promotion followed the implemented state-trust gate; task 7.6 remained human-owned until explicit acceptance.
- [ ] 7.6 Obtain human acceptance that completed/current/planned hierarchy, current step, phase expansion, no-active-phase state, and the corrected straight-axis geometry are understandable at a glance.
      Reopened 2026-07-11: the previous evidence inferred acceptance from an instruction to continue. The owner then reported a visible broken-axis defect, so final human acceptance must follow the corrected implementation and fresh evidence.

## 8. Documentation And Final Verification

- [x] 8.1 Update user-facing/project documentation with implemented component behavior, verification evidence, and any accepted deviations from this proposal.
- [x] 8.2 Update `docs/CURRENT_PROJECT_AUDIT.md`, `docs/ROADMAP.md`, and the dashboard redesign plan with trust-gate and human-acceptance outcomes.
- [x] 8.3 Run focused timeline tests, `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.
- [x] 8.4 Re-run the live dashboard against representative projects with no phases, no active phase, one active phase, pending acceptance, blocked work, no steps, ambiguous data, and long roadmaps.
      Evidence 2026-07-11: live configured projects covered no phases (`vpn-and-router`) and a long no-active/pending-acceptance timeline (`AutoParts`). A separate safe live scanner fixture covered exactly one active phase/current step, blocked and pending-acceptance phases, a no-steps phase with drawer focus return, and two simultaneous in-progress phases with no fabricated current marker.
- [x] 8.5 Commit intentional changes and leave the OpenSpec change ready for human review or archival only after all acceptance evidence is recorded.
      Evidence 2026-07-11: focused timeline/modal/navigation suites 53/53; final `npm test` 97 Node + 78 Vitest; production build passed; OpenSpec lists succeeded; strict validation passed 9/9; `git diff --check` passed. Commits `32b9c68` and `9cfb550` record the integrated redesign and mixed-height axis correction. The 42/43 change is ready for explicit human review, not archival; task 7.6 remains open.
