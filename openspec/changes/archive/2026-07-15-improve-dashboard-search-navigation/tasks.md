## 1. Pure Search And State Contracts

- [x] 1.1 Add failing tests for source ranking, source-aware deterministic tie-breakers, evidence deduplication, diagnostic/task overlap suppression, stable hit identity, diagnostic opt-in, true scanner-bounded totals, and forty-result truncation.
- [x] 1.2 Complete the pure search module and make all search-contract tests pass without changing scanner or server behavior.
- [x] 1.3 Add failing tests for versioned local/history UI-state restore, exact loaded-project matching, enum validation, revision-scoped timeline expansion, stable-kind exact-one drawer descriptors, corrupt/foreign/stale input, and unavailable storage.
- [x] 1.4 Implement the pure UI-state module and make all restoration/persistence tests pass.
      Evidence 2026-07-11: initial focused RED failed on duplicate next/open evidence, diagnostic leakage, false pre-limit total `300` versus `405`, missing stable keys, and missing `src/uiState.ts`; stable-kind refinement also failed before the helper signature changed. Final focused `npm run test:components -- tests/components/search-pure.test.tsx tests/components/ui-state-pure.test.tsx` passed 13/13; fresh final-head `npm test` passed 93 Node + 38 Vitest; independent review of commit `b045ba1` found no Critical, Important, or Minor issues.

## 2. Accessible Search Integration

- [x] 2.1 Add failing component tests for combobox/listbox semantics, result grouping/context, Arrow/Home/End/Enter/Escape behavior, diagnostics disclosure, preserved query/filter navigation context, both tablists, and drawer focus transfer/trap/return.
- [x] 2.2 Implement the focused global-search component with controlled popup state and stable result option identity.
- [x] 2.3 Replace the inline `App.tsx` search, restore/persist validated local/history state with safe `popstate`, resolve selection independently from sidebar filters, preserve the query/filter when a result opens, and restore only valid timeline/drawer descriptors.
- [x] 2.4 Complete tab/tabpanel keyboard relationships plus drawer focus transfer, containment, background isolation, and return focus.
- [x] 2.5 Run the focused search/state/component suite and record exact passing evidence.
      Evidence 2026-07-11: search integration, UI-state, and navigation accessibility suites pass 26/26. Full `npm test` passes 97 Node + 70 Vitest. Independent review found no remaining Critical, Important, or Minor issues.

## 3. Browser, Documentation, And Final Verification

- [x] 3.1 Verify mouse/keyboard search, diagnostic opt-in, result total/truncation, target navigation, and state restoration after reload in dark and light themes without console errors.
- [x] 3.2 Update the dashboard redesign plan, UX audit, docs home/map, current audit, and OpenSpec evidence without closing unrelated human acceptance gates.
      Evidence 2026-07-11: `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md` records the two-result keyboard flow, exact drawer focus return, Back/Forward restoration, dark/light checks, `40 of 60` core results, `87` diagnostic matches, and `40 of 147` after opt-in. Timeline human task 7.6 remains open.
- [x] 3.3 Run `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.
- [x] 3.4 Commit the completed search/navigation slice while preserving local-only and read-only safety boundaries.
      Evidence 2026-07-11: final `npm test` passed 97 Node + 70 Vitest; `npm run build` passed; OpenSpec lists succeeded; strict validation passed 9/9; `git diff --check` passed. Implementation commit `32b9c68` preserves configured-project selection, read-only scanned inputs, and local-only presentation state.
