# Dashboard Redesign Acceptance Evidence

Status: technical acceptance passed after the mixed-height axis correction; explicit human clarity acceptance remains open as OpenSpec task 7.6.

Date: 2026-07-11.

## Scope And Outcome

The bounded dashboard redesign is implemented on `dashboard-redesign/ui-rebuild`. The work covers trusted state presentation, the compact overview shell, the horizontal phase/step timeline, ranked global search, versioned local/history presentation state, responsive ordering, local overflow containment, keyboard/focus behavior, and dark/light contrast.

The redesign preserves the existing local-only and read-only boundaries: projects are selected from saved config, browser requests do not introduce arbitrary filesystem paths, scanned project folders are not modified, and no cloud, auth, remote model, task/calendar, or command-execution behavior was added.

The timeline OpenSpec change remains active and unarchived. Tasks 5.6 and 5.7 now have fresh regression and browser evidence; task 7.6 remains human-owned and is not inferred from an instruction to continue work.

## Implemented UX

- The compact system bar keeps global search, freshness, management, and theme controls together.
- The cross-project brief prioritizes owner decisions, real blockers, active work, and between-phase projects.
- The selected-project state header precedes an always-visible timeline; Status, Work, Decisions, and Knowledge follow as secondary semantic tabs.
- Parent phases and child steps are independent labelled horizontal viewports. Current, expanded, selected, and lifecycle status remain separate states.
- Phase cards share the tallest card height in their row, so variable content cannot bend the phase axis; the implementation uses the existing flex contract rather than a fixed height.
- Ranked search exposes true totals and forty-result truncation, excludes diagnostics by default, supports full keyboard navigation, and preserves query/filter context when opening evidence.
- Versioned presentation state restores valid selection, filters, tabs, query, compatible timeline expansion, and stable-kind drawer descriptors through local storage and browser history without putting local paths in the URL.
- The read-only drawer transfers focus to Close, contains focus, isolates background content, supports related navigation, and returns focus to a stable source-derived origin even when live refresh replaces the invoking DOM node.
- Manage Projects is a named modal dialog with initial focus transfer, bidirectional focus containment, Escape dismissal, inert background content, and exact focus return to the Manage control.
- Body prose uses the system sans stack; display/technical text retains the established display/mono styling. Dark/light semantic tokens and composited interaction tints pass automated AA checks.

## Automated Evidence

| Check | Result |
|---|---|
| Timeline component suite | 40/40 passed, including the red-green equal-height regression |
| Search/state/navigation focused suites | 26/26 passed |
| Manage Projects modal suite | 4/4 passed |
| Navigation accessibility suite | 9/9 passed, including generated-origin cleanup and real-App live-refresh focus return |
| Theme contrast suite | 4/4 passed |
| TypeScript | `npx tsc --noEmit` passed |
| Independent search review | PASS; no Critical, Important, or Minor findings |
| Independent timeline/accessibility review | PASS after loading-to-ready centering, pointer centering, descriptor priority, and composite-contrast fixes |
| Full test suite | `npm test`: 97 Node + 78 Vitest passed |

## Browser Matrix

The live dashboard was inspected in the in-app browser. Geometry values use CSS pixels; document width compares `documentElement.clientWidth` with `scrollWidth`.

| View | Theme evidence | Page overflow | Timeline/local overflow and ordering |
|---|---|---|---|
| Desktop 1280x720 | Dark and light DOM/geometry checks | 1270 / 1270; none | Selected header precedes timeline y=398-712 and tabs y=728. Fourteen cards all measured 131.25 px, zero clipped, with 0 px axis deviation. Phase viewport 884 / 3896 retains local scroll. |
| Tablet 1024x768 | Dark and light DOM/geometry checks | 1014 / 1014; none | Timeline y=443-757 and tabs y=773. Fourteen cards all measured 131.25 px, zero clipped, with 0 px axis deviation. |
| Mobile 390x844 | Dark and light DOM/geometry checks | 380 / 380; none | Project switcher y=330-365, selected header y=390-751, timeline y=767-1093, tabs y=1109. Fourteen cards all measured 112.25 px, zero clipped, with 0 px axis deviation; phase viewport 314 / 3569 retains local scroll. |

The page-level overflow regression caused by screen-reader-only absolute elements was reproduced and fixed by containing each phase card. The document now remains viewport-bounded while phase/step axes retain their own horizontal scrolling and edge affordances.

At every dark/light matrix point, Manage Projects and the detail drawer transferred initial focus to their Close control, kept Shift+Tab inside the dialog, restored focus to the exact stable opener on Escape, and isolated the background with `inert` plus `aria-hidden`. The console produced no warnings or errors.

## Search, History, And Focus

- Query `Parsed Relationship Evidence` produced two ranked results. ArrowDown kept DOM focus on the combobox and set a stable `aria-activedescendant`; Enter opened the phase drawer.
- Drawer focus moved to Close. Shift+Tab from Close wrapped to the last related action. Escape closed the drawer and returned focus to the search input.
- A real-App polling integration test replaced the open phase-details control during live refresh, kept the drawer open, then verified Escape returned focus to the replacement control through the same source-derived ID rather than a stale element reference.
- Manage Projects exposed `role="dialog"`, `aria-modal="true"`, and the `Manage Projects` accessible name; Close received initial focus, Tab/Shift+Tab stayed contained, Escape and Close restored exact focus to Manage, and background semantics were restored after dismissal.
- Browser Back reopened the exact phase drawer with query/project context intact; Forward closed it and restored the search state.
- Query `status` disclosed `Showing 40 of 60 results` with `87 matching diagnostics available`. Enabling diagnostics changed the truthful total to `Showing 40 of 147 results`.
- Semantic project/detail tab navigation was exercised with ArrowRight; the selected tab and tabpanel changed together.
- Fresh count-to-result verification opened `Owner decisions · 27` and measured exactly 27 rendered result items.

## Representative Lifecycle States

- Live configured data: `vpn-and-router` covered no roadmap phases; `AutoParts` covered a fourteen-phase long roadmap, no active phase, pending acceptance, real blockers, and local overflow.
- A separate safe live scanner fixture, without changing the user's project config or scanned projects, covered exactly one in-progress phase with an explicit current step, planned/pending-acceptance/blocked phases, a no-steps phase, long phase/step names, and two simultaneous in-progress phases.
- The active fixture auto-expanded and centered the explicit current phase/step. The no-steps state exposed lifecycle/progress basis and opened source evidence; Escape returned focus to the exact `Open phase details` origin.
- The ambiguous fixture displayed `Current phase ambiguous`, listed both conflicting phase IDs, and rendered zero `aria-current` markers rather than fabricating a current item.

## Console And Runtime Notes

- The primary live dashboard produced only normal Vite connect/HMR and React development messages; no warning or error entries were present during the acceptance flows.
- The temporary second development server exposed an expected Vite HMR WebSocket collision because the primary dev server already owned the HMR port. Product state checks were repeated against the production build before completion so this environment-only message was not treated as an application regression.
- The primary local development server remains running at `http://127.0.0.1:5173` as required by the project runbook.

## Technical Acceptance Matrix

| Requirement / redesign intent | Status | Evidence / remaining gap |
|---|---|---|
| Trusted lifecycle state before visual promotion | Passed | Explicit current IDs, integrity handling, state-trust fixtures, and no prose inference pass automated coverage. |
| First-screen information hierarchy | Passed technically | Compact system bar, four-group attention brief, selected-project header, timeline, then secondary tabs; renewed human clarity judgment remains task 7.6. |
| Completed/current/planned and exceptional lifecycle vocabulary | Passed | All phase and step statuses have visible text/icon cues and semantic connectors; ambiguous current state fabricates no marker. |
| Exclusive phase expansion and nested steps | Passed | Click/re-click/switch, no-steps, current-step, independent child viewport, and focus preservation have component/browser evidence. |
| Deterministic implementation progress | Passed | Lifecycle and step-derived calculations, unknown evidence, exclusions, and project averaging pass pure tests. |
| Loading/refresh/error/stale/partial/empty states | Passed | Component suites cover every required fallback without fabricated progress or status. |
| Large-roadmap geometry and responsive overflow | Passed | Commit `9cfb550`; 0 px axis deviation, no clipping, and local-only overflow in all six dark/light viewport checks. |
| Timeline keyboard, ARIA, motion, and drawer semantics | Passed | Component/accessibility tests, all six browser matrix points, and the real-App refresh-while-drawer-open regression pass with source-derived focus identity. |
| Ranked search and count-to-result integrity | Passed | Pure/integration tests, two-result keyboard flow, true totals/truncation, diagnostic opt-in, and fresh 27-to-27 browser evidence. |
| Durable safe UI state and history | Passed | Versioned state, stable descriptors, Back/Forward, invalid-state rejection, and no local paths in the URL pass tests/browser checks. |
| Existing visual identity, dark/light contrast, and readable prose | Passed | Existing theme/status tokens retained; semantic/composite contrast tests pass both themes. |
| Manage Projects dialog accessibility | Passed | Named modal semantics, initial focus, bidirectional focus trap, Escape, inert background, exact return focus, four component scenarios, and all six live-browser matrix points pass. |
| Human at-a-glance clarity | Pending acceptance | OpenSpec task 7.6 can be closed only by explicit owner acceptance after reviewing the corrected axis. |
| OpenSpec sync/archive and integration to `main` | Not performed | Intentionally requires separate authorization and remains blocked by task 7.6. |

## Human Acceptance And Residual Risks

- OpenSpec timeline task 7.6 remains `pending_acceptance`; the agent can accept the technical implementation but cannot substitute for explicit human clarity acceptance.
- `redesign-dashboard-project-timeline` has 42/43 tasks complete and is not ready for archival/sync review until task 7.6 is explicitly accepted.
- The previously observed Manage Projects modal gap is closed by component and six-point live-browser evidence.
- The previously observed live-refresh drawer race is closed by a real-App polling regression that proves return focus is resolved by stable source identity after opener replacement.
- Browser layout evidence is representative rather than a replacement for future automated end-to-end visual regression infrastructure.

## Next Step

The next required action is explicit human acceptance or rejection of task 7.6 after reviewing the corrected straight axis. OpenSpec archival/sync and integration remain blocked until task 7.6 closes.
