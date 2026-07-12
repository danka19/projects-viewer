## 1. Scanner Evidence Trust

- [x] 1.1 RED: extend `tests/scan-trust.test.mjs` with the exact 2026-07-12 false-positive shapes—checked `[x]` `checkbox blocker` and `hard-block pattern` tasks; a cross-line OpenSpec `WHEN` followed by `**THEN** its dependent remains blocked` and an adjacent normative `**AND**` continuation; explanatory `Next-action signals ...` prose containing an embedded `NEXT:` example; and a heading or descriptive label containing `next action`/`next-action` without active-work semantics—and prove they currently enter or can enter live blocker or next-action state.
- [x] 1.2 Add separate positive scanner controls for an unchecked explicitly blocked task, an ordinary unchecked active-task next action, and a standalone actionable next-action directive from a trusted planning source so the exclusions cannot erase any legitimate live evidence form required by the spec.
- [x] 1.3 GREEN: preserve checkbox completion and bounded OpenSpec scenario context through classification, reject completed/normative blocker candidates, and require structural active-work semantics for next-action candidates until all focused scanner fixtures pass.

## 2. Explainable Deduplicated Search

- [x] 2.1 RED: extend `tests/components/search-pure.test.tsx` with early/middle/late/long query matches using the audited late `preflight packet` shape, and prove the model does not yet expose match-aware presentation while stable keys, ranking, and navigation identity remain unchanged.
- [x] 2.2 RED: extend `tests/components/search-integration.test.tsx` to require the visible query-matching fragment or equivalent explanation in the rendered result and to cover keyboard/pointer activation of that retained result.
- [x] 2.3 GREEN: implement readable match-aware fragments in the pure search model and focused component, including accessible truncation boundaries, without changing the ranking, source-evidence identity, navigation, or result-limit contracts owned by `improve-dashboard-search-navigation`.
- [x] 2.4 Add a regression fixture where identical file/line/text evidence has Next action and Decision/task representations; verify one retained result visibly explains the match and query-dependent fragments never create duplicate results or unstable keys.

## 3. Verification And Durable Evidence

- [x] 3.1 Run focused scanner and search verification: `node --test tests/scan-trust.test.mjs` and `npm run test:components -- tests/components/search-pure.test.tsx tests/components/search-integration.test.tsx`; record RED/GREEN evidence and final counts, including explicit assertions that every audited false blocker is absent from live blocker signals and summaries and does not affect blocker-derived project health or status.
- [ ] 3.2 Run the full automated gates: `npm test`, `npm run build`, and `git diff --check`; record exact pass/fail counts and any residual risk.
- [ ] 3.3 Run a real configured-project rescan and inspect `projects-viewer` generated evidence to prove the three audited false positives no longer appear in `signalGroups.realBlockers`, `summary.mainBlocker`, or `summary.nextAction`, do not contribute to blocker counts, and do not affect blocker-derived project health or status, while legitimate blocker/action controls remain available; do not modify scanned project files.
- [ ] 3.4 Verify in the browser that querying `preflight packet` visibly explains every displayed match, retains a single representation for identical evidence, and preserves existing keyboard navigation; inspect desktop and the existing 390 px mobile acceptance viewport plus console output.
- [ ] 3.5 Update `docs/audits/API_UX_TRUST_AUDIT_2026-07-12.md` with implementation and verification status and update `docs/CURRENT_PROJECT_AUDIT.md` (plus roadmap/current-state documentation only where sequencing or state actually changes), keeping the API fallback remediation linked solely to `harden-mcp-context-api`.
- [ ] 3.6 Run `openspec status --change "improve-dashboard-evidence-trust"`, `openspec list`, `openspec list --specs`, and `openspec validate --all --strict`; keep the change open with checked tasks only for work actually completed during apply.
