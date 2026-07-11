# Dashboard Redesign Acceptance Evidence

Status: agent verification and human timeline acceptance complete; OpenSpec change intentionally unarchived.

Date: 2026-07-11.

## Scope And Outcome

The bounded dashboard redesign is implemented on `dashboard-redesign/ui-rebuild`. The work covers trusted state presentation, the compact overview shell, the horizontal phase/step timeline, ranked global search, versioned local/history presentation state, responsive ordering, local overflow containment, keyboard/focus behavior, and dark/light contrast.

The redesign preserves the existing local-only and read-only boundaries: projects are selected from saved config, browser requests do not introduce arbitrary filesystem paths, scanned project folders are not modified, and no cloud, auth, remote model, task/calendar, or command-execution behavior was added.

The timeline OpenSpec change remains active and unarchived. The human owner accepted the delivered redesign in direct response to this acceptance report on 2026-07-11, closing task 7.6 without requesting any contract deviation.

## Implemented UX

- The compact system bar keeps global search, freshness, management, and theme controls together.
- The cross-project brief prioritizes owner decisions, real blockers, active work, and between-phase projects.
- The selected-project state header precedes an always-visible timeline; Status, Work, Decisions, and Knowledge follow as secondary semantic tabs.
- Parent phases and child steps are independent labelled horizontal viewports. Current, expanded, selected, and lifecycle status remain separate states.
- Ranked search exposes true totals and forty-result truncation, excludes diagnostics by default, supports full keyboard navigation, and preserves query/filter context when opening evidence.
- Versioned presentation state restores valid selection, filters, tabs, query, compatible timeline expansion, and stable-kind drawer descriptors through local storage and browser history without putting local paths in the URL.
- The read-only drawer transfers focus to Close, contains focus, isolates background content, supports related navigation, and returns focus to the exact origin.
- Body prose uses the system sans stack; display/technical text retains the established display/mono styling. Dark/light semantic tokens and composited interaction tints pass automated AA checks.

## Automated Evidence

| Check | Result |
|---|---|
| Timeline component suite | 39/39 passed |
| Search/state/navigation focused suites | 26/26 passed |
| Theme contrast suite | 4/4 passed |
| TypeScript | `npx tsc --noEmit` passed |
| Independent search review | PASS; no Critical, Important, or Minor findings |
| Independent timeline/accessibility review | PASS after loading-to-ready centering, pointer centering, descriptor priority, and composite-contrast fixes |
| Full test suite | `npm test`: 97 Node + 70 Vitest passed |

## Browser Matrix

The live dashboard was inspected in the in-app browser. Geometry values use CSS pixels; document width compares `documentElement.clientWidth` with `scrollWidth`.

| View | Theme evidence | Page overflow | Timeline/local overflow and ordering |
|---|---|---|---|
| Desktop 1280x720 | Dark and light screenshots/DOM checks | 1270 / 1270; none | Selected header y=183-382, timeline y=398-712, tabs y=728. Phase viewport 884 / 3896 with local scroll; timeline precedes tabs and remains visible in the first viewport. |
| Tablet 1024x768 | Dark and light screenshots/DOM checks | 1014 / 1014; none | Sidebar x=20 width 300; timeline x=340 y=443 width 654; tabs y=773. Phase viewport 628 / 3484 with local scroll. |
| Mobile 390x844 | Dark and light screenshots/DOM checks | 380 / 380; none | Project switcher y=321-373, selected header y=389-751, timeline y=767-1093, tabs y=1109. Phase viewport 314 / 3569; order is switcher, header, timeline, tabs. |

The page-level overflow regression caused by screen-reader-only absolute elements was reproduced and fixed by containing each phase card. The document now remains viewport-bounded while phase/step axes retain their own horizontal scrolling and edge affordances.

## Search, History, And Focus

- Query `Parsed Relationship Evidence` produced two ranked results. ArrowDown kept DOM focus on the combobox and set a stable `aria-activedescendant`; Enter opened the phase drawer.
- Drawer focus moved to Close. Shift+Tab from Close wrapped to the last related action. Escape closed the drawer and returned focus to the search input.
- Browser Back reopened the exact phase drawer with query/project context intact; Forward closed it and restored the search state.
- Query `status` disclosed `Showing 40 of 60 results` with `87 matching diagnostics available`. Enabling diagnostics changed the truthful total to `Showing 40 of 147 results`.
- Semantic project/detail tab navigation was exercised with ArrowRight; the selected tab and tabpanel changed together.

## Representative Lifecycle States

- Live configured data: `vpn-and-router` covered no roadmap phases; `AutoParts` covered a fourteen-phase long roadmap, no active phase, pending acceptance, real blockers, and local overflow.
- A separate safe live scanner fixture, without changing the user's project config or scanned projects, covered exactly one in-progress phase with an explicit current step, planned/pending-acceptance/blocked phases, a no-steps phase, long phase/step names, and two simultaneous in-progress phases.
- The active fixture auto-expanded and centered the explicit current phase/step. The no-steps state exposed lifecycle/progress basis and opened source evidence; Escape returned focus to the exact `Open phase details` origin.
- The ambiguous fixture displayed `Current phase ambiguous`, listed both conflicting phase IDs, and rendered zero `aria-current` markers rather than fabricating a current item.

## Console And Runtime Notes

- The primary live dashboard produced only normal Vite connect/HMR and React development messages; no warning or error entries were present during the acceptance flows.
- The temporary second development server exposed an expected Vite HMR WebSocket collision because the primary dev server already owned the HMR port. Product state checks were repeated against the production build before completion so this environment-only message was not treated as an application regression.
- The primary local development server remains running at `http://127.0.0.1:5173` as required by the project runbook.

## Human Acceptance And Residual Risks

- OpenSpec timeline task 7.6 is complete: the owner accepted the delivered completed/current/planned hierarchy, current step, exclusive expansion, and no-active-phase presentation on 2026-07-11.
- `redesign-dashboard-project-timeline` is ready for later OpenSpec archival/sync review but remains active and unarchived because archival was explicitly excluded from this work session.
- Manage Projects still has the older visually-modal implementation; the redesign fixed drawer semantics but did not claim a separate Manage Projects dialog/focus contract.
- Browser layout evidence is representative rather than a replacement for future automated end-to-end visual regression infrastructure.

## Next Step

No dashboard-redesign implementation or acceptance task remains. The next bounded action, only when explicitly requested, is OpenSpec archival/sync review followed by integration into `main`; it is not performed in this work session.
