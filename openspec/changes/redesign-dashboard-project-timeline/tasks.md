## 1. Trusted Timeline Presentation Model

- [ ] 1.1 Add failing tests for ordered phase/step mapping, stable non-index keys, explicit current IDs, model revision, progress basis, partial state, and integrity issues.
- [ ] 1.2 Define the timeline presentation-model types in a focused frontend module while preserving the existing public scanner contract.
- [ ] 1.3 Implement the pure project-to-timeline adapter without text scanning or fallback selection from arbitrary checkbox/prose signals.
- [ ] 1.4 Extend `phaseProgress` tests for cancelled/superseded denominator exclusion, blocked/deferred incomplete steps, unknown progress, and project-level known/unknown progress disclosure.
- [ ] 1.5 Run the focused presentation-model and progress tests and record the exact evidence.

## 2. Expansion And Navigation State

- [ ] 2.1 Add failing reducer/controller tests for default current expansion, no-current state, repeated-click collapse, exclusive phase switching, project/revision reset, and preserved state on compatible refresh.
- [ ] 2.2 Implement a pure timeline interaction state boundary with `expandedPhaseId`, focused phase/step identity, and originating detail-control identity.
- [ ] 2.3 Add failing keyboard tests for phase Left/Right/Home/End/Enter/Space/Escape/ArrowDown and step Left/Right/Home/End/Enter/Space/ArrowUp behavior.
- [ ] 2.4 Implement roving focus and deterministic scroll-into-view triggers without repeated automatic recentering after manual scroll.
- [ ] 2.5 Run the focused interaction and keyboard tests and record the exact evidence.

## 3. Phase Timeline Components

- [ ] 3.1 Split the current roadmap monolith into focused timeline shell, phase viewport, phase card, axis/node, legend, and fallback-state components with explicit prop contracts.
- [ ] 3.2 Add component tests for every supported `PhaseStatus`, current-versus-expanded distinction, visible non-color cues, confidence/issue disclosure, and known/unknown progress rendering.
- [ ] 3.3 Implement the single-row horizontal phase axis with existing theme tokens, semantic ordered-list/buttons, exclusive expansion, edge affordances, and `Jump to current`.
- [ ] 3.4 Preserve phase source/evidence access through the existing read-only detail drawer and verify drawer focus restoration.
- [ ] 3.5 Run focused phase component tests in dark and light theme contexts.

## 4. Nested Step Timeline

- [ ] 4.1 Add component tests for completed/current/planned, pending-acceptance, blocked, deferred, cancelled, and superseded step presentation.
- [ ] 4.2 Implement the phase-to-step bridge and independent single-row step viewport with smaller cards, parent context label, and explicit current-step identity.
- [ ] 4.3 Implement the no-steps child state with phase progress/status basis and `Open phase details`.
- [ ] 4.4 Wire step activation to the existing read-only detail drawer and verify evidence/source rendering plus return focus.
- [ ] 4.5 Run focused nested-step tests, including long names, missing display IDs, and stable source-derived keys.

## 5. Loading, Error, Scale, And Responsive Behavior

- [ ] 5.1 Add tests for loading without data, background refresh with retained data, empty, live retryable error, static non-retryable error, stale retained model, partial model, and integrity warning states.
- [ ] 5.2 Implement bounded skeleton, empty, error, stale, partial, and integrity-warning presentations without fabricated status or progress.
- [ ] 5.3 Add responsive tests for phase/step no-wrap behavior, overflow detection, visible neighbor/edge affordances, and card sizing at desktop, tablet, and mobile widths.
- [ ] 5.4 Implement proximity scroll snapping, manual-scroll preservation, current/focus centering triggers, compact metadata above twelve phases, and bounded rendering through scanner limits.
- [ ] 5.5 Verify the selected-project header and phase axis fit the first 1280x720 viewport and the mobile timeline precedes the full project list/detail navigation.

## 6. Accessibility And Motion

- [ ] 6.1 Add accessibility assertions for labelled ordered lists, semantic buttons, `aria-current`, `aria-expanded`, `aria-controls`, progress descriptions, live-region announcements, and scroll-container labels.
- [ ] 6.2 Implement visible focus, complete keyboard parity, expansion announcements, drawer focus transfer/return, and non-hover access to all essential information.
- [ ] 6.3 Verify WCAG 2.1 AA contrast for dark/light text, lifecycle tokens, axis states, and focus indicators.
- [ ] 6.4 Add reduced-motion coverage and implement immediate/minimal centering and expansion when `prefers-reduced-motion` is active.
- [ ] 6.5 Run the focused accessibility suite and record any automated-tool limitations for manual follow-up.

## 7. Dashboard Integration And Acceptance

- [ ] 7.1 Replace the vertical roadmap list inside the Roadmap surface while preserving existing details, source evidence, related decisions/audits, and read-only boundaries.
- [ ] 7.2 Verify that global project selection, refresh, live/static mode, search navigation, theme persistence, and drawer behavior remain stable.
- [ ] 7.3 Complete the scanner-state trust gate for current phase/step inputs before promoting the timeline into the primary selected-project overview.
- [ ] 7.4 Promote the accepted timeline below the compact selected-project state header and update the redesigned detail navigation only after trust/browser gates pass.
- [ ] 7.5 Run browser acceptance in dark and light themes at desktop, tablet, and mobile widths, checking overflow, touch/keyboard navigation, sticky layout, focus return, console errors, and page-level horizontal overflow.
- [ ] 7.6 Obtain human acceptance that completed/current/planned hierarchy, current step, phase expansion, and no-active-phase state are understandable at a glance.

## 8. Documentation And Final Verification

- [ ] 8.1 Update user-facing/project documentation with implemented component behavior, verification evidence, and any accepted deviations from this proposal.
- [ ] 8.2 Update `docs/CURRENT_PROJECT_AUDIT.md`, `docs/ROADMAP.md`, and the dashboard redesign plan with trust-gate and human-acceptance outcomes.
- [ ] 8.3 Run focused timeline tests, `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.
- [ ] 8.4 Re-run the live dashboard against representative projects with no phases, no active phase, one active phase, pending acceptance, blocked work, no steps, ambiguous data, and long roadmaps.
- [ ] 8.5 Commit intentional changes and leave the OpenSpec change ready for human review or archival only after all acceptance evidence is recorded.
