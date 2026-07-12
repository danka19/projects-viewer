# Final Review Fix Report: canonical search evidence identity

## Root cause

A real `runScan()` fixture containing `- [ ] Release is blocked by the missing signing key.` produced two representations of the same source line:

- `openTasks`: `Release is blocked by the missing signing key.`
- `signalGroups.realBlockers`: `[ ] Release is blocked by the missing signing key.`

Both records retained the same project, `docs/ROADMAP.md`, and line 5. The scanner intentionally strips the checkbox marker for task text while its blocked/gated path builds `bulletText` that retains `[ ]`. Search then used an evidence key for the task but the blocker's kind-specific stable key, so the candidate map treated one raw source line as separate Blocker and Task results.

## RED / GREEN evidence

- RED: `npx vitest run tests/components/search-pure.test.tsx` failed the new regression with `expected 5 to be 4`; the other 17 search tests passed.
- GREEN: the same focused search suite passed 18/18 after the fix.
- Focused scanner verification: `node --test tests/scan-trust.test.mjs tests/run-scan.test.mjs` passed 19/19.
- Full verification: `npm test` passed 133/133 Node tests and 105/105 Vitest tests.
- Build: `npm run build` completed TypeScript checking and the Vite production build successfully.
- OpenSpec: `openspec list`, `openspec list --specs`, and `openspec validate --all --strict` completed; strict validation passed 13/13 items.
- Diff hygiene: `git diff --check` passed.

## Implementation

- `src/search.ts` now derives internal evidence identity from project path, source file, source line, and text with only a leading markdown checkbox marker (`[ ]` or `[x]`) removed.
- Blocker and signal candidates now use that canonical evidence identity for deduplication, matching the existing next-action, task, decision, and line-backed specification-task paths.
- Kind-specific stable result keys are unchanged. The higher-ranked blocker/signal representation therefore remains the winner with its existing key, score, drawer navigation, and ranking behavior.
- No scanner or public schema expansion was needed.

## Regression controls

`tests/components/search-pure.test.tsx` covers the scanner-derived blocker/task mismatch and proves that evidence with a different file, different line, or different normalized text remains distinct. The retained result is the Blocker with its pre-existing stable key and score.

## Files changed

- `src/search.ts`
- `tests/components/search-pure.test.tsx`
- `.superpowers/sdd/final-fix-report.md`

## Documentation and concerns

`docs/CURRENT_PROJECT_AUDIT.md` was not changed because the implementation now fully satisfies its intended deduplication claim. The active change remains unsynced and unarchived, and unrelated human acceptance gates were not altered.

The full test run emitted non-fatal `Port 24678 is already in use` Vite WebSocket warnings in API tests; all affected tests passed. Canonicalization is deliberately narrow: it does not fold case, whitespace, punctuation, file, line, or arbitrary text, limiting collision risk to alternate task/signal representations of the same markdown checkbox source.
