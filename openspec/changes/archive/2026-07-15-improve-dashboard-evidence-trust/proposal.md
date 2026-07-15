## Why

## Roadmap

- Execution phase: P4
- Related phases: none
- Lifecycle status: accepted

The 2026-07-12 API and UX trust audit confirmed that completed task text, cross-line OpenSpec normative scenarios, and explanatory next-action prose can be promoted as current project state, while search results can hide the fragment that caused a match. These gaps make scanner-derived evidence and otherwise-correct search results look authoritative without being explainable.

## What Changes

- Exclude checked `[x]` tasks from live blocker derivation, even when their completed text contains blocker terminology.
- Treat cross-line OpenSpec `WHEN`/`THEN` normative scenarios as diagnostic or specification context rather than live project blockers.
- Require active-work semantics before headings or explanatory prose containing `next-action` terminology or embedded marker examples can become a current next action.
- Expose a match-aware fragment, or an equivalent visible query-to-result explanation, for every search result.
- Preserve the existing source-evidence deduplication contract while adding match visibility.
- Add regression evidence using the exact false-positive shapes recorded in the 2026-07-12 audit.
- Keep the unknown `/api/*` HTML fallback outside this change; `harden-mcp-context-api` remains its sole requirement and implementation owner.

## Capabilities

### New Capabilities

- `dashboard-evidence-trust`: Supplemental scanner and search evidence rules that exclude the newly audited false-positive shapes and make each search match visibly explainable without duplicating identical evidence.

### Modified Capabilities

None. The related `dashboard-state-derivation` and `dashboard-search-navigation` capabilities are active change contracts rather than accepted base specs; this change adds a narrowly scoped supplemental capability and references their existing ownership instead of restating it.

## Impact

- Scanner extraction and classification in `scan-projects.mjs`, including source-line context needed to distinguish normative scenarios from live blockers.
- Search presentation/model code in `src/search.ts` and the focused global-search component, without changing ranking or evidence identity ownership.
- Regression fixtures and focused scanner/search component tests based on the dated audit evidence.
- Generated project data and dashboard presentation become more trustworthy; no API shape, configuration, scanned-project write, cloud, auth, or dependency change is introduced.
- API fallback remediation remains exclusively in `openspec/changes/harden-mcp-context-api/`.
