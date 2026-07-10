## 1. Pure Search And State Contracts

- [x] 1.1 Add failing tests for source ranking, source-aware deterministic tie-breakers, evidence deduplication, diagnostic/task overlap suppression, stable hit identity, diagnostic opt-in, true scanner-bounded totals, and forty-result truncation.
- [x] 1.2 Complete the pure search module and make all search-contract tests pass without changing scanner or server behavior.
- [x] 1.3 Add failing tests for versioned local/history UI-state restore, exact loaded-project matching, enum validation, revision-scoped timeline expansion, stable-kind exact-one drawer descriptors, corrupt/foreign/stale input, and unavailable storage.
- [x] 1.4 Implement the pure UI-state module and make all restoration/persistence tests pass.
      Evidence 2026-07-11: initial focused RED failed on duplicate next/open evidence, diagnostic leakage, false pre-limit total `300` versus `405`, missing stable keys, and missing `src/uiState.ts`; stable-kind refinement also failed before the helper signature changed. Final focused `npm run test:components -- tests/components/search-pure.test.tsx tests/components/ui-state-pure.test.tsx` passed 13/13; fresh final-head `npm test` passed 93 Node + 38 Vitest; independent review of commit `b045ba1` found no Critical, Important, or Minor issues.

## 2. Accessible Search Integration

- [ ] 2.1 Add failing component tests for combobox/listbox semantics, result grouping/context, Arrow/Home/End/Enter/Escape behavior, diagnostics disclosure, preserved query/filter navigation context, both tablists, and drawer focus transfer/trap/return.
- [ ] 2.2 Implement the focused global-search component with controlled popup state and stable result option identity.
- [ ] 2.3 Replace the inline `App.tsx` search, restore/persist validated local/history state with safe `popstate`, resolve selection independently from sidebar filters, preserve the query/filter when a result opens, and restore only valid timeline/drawer descriptors.
- [ ] 2.4 Complete tab/tabpanel keyboard relationships plus drawer focus transfer, containment, background isolation, and return focus.
- [ ] 2.5 Run the focused search/state/component suite and record exact passing evidence.

## 3. Browser, Documentation, And Final Verification

- [ ] 3.1 Verify mouse/keyboard search, diagnostic opt-in, result total/truncation, target navigation, and state restoration after reload in dark and light themes without console errors.
- [ ] 3.2 Update the dashboard redesign plan, UX audit, docs home/map, current audit, and OpenSpec evidence without closing unrelated human acceptance gates.
- [ ] 3.3 Run `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.
- [ ] 3.4 Commit the completed search/navigation slice while preserving local-only and read-only safety boundaries.
