## Why

Global search currently returns source-order results, silently stops at forty items, mixes parser diagnostics into ordinary work, and clears the user's query when a result opens. The redesigned dashboard also loses selected project, detail surface, and filter context on reload, so the next requested redesign slice must make search trustworthy and safe UI context durable.

## What Changes

- Rank current and accepted project sources ahead of historical documents and filtered parser diagnostics using a deterministic, testable search model.
- Exclude diagnostics by default, expose an explicit opt-in, and disclose the true result total plus truncation.
- Add a keyboard-operable search results pattern with stable result identity and visible project/type context.
- Preserve the query and filter while navigating to a result instead of clearing the user's search context.
- Persist selected project, project-status filter, active detail surface, knowledge subview, query, diagnostic opt-in, revision-scoped timeline expansion, and a resolvable drawer descriptor in local browser storage and validated browser history state.
- Restore only values that match the current saved scan data and supported UI enums; ignore corrupt, stale, or arbitrary stored values.
- Complete composite tab keyboard semantics plus drawer focus transfer, containment, and return so restored/navigation state remains keyboard usable.
- Keep drawer navigation and all search behavior read-only, with no API path input, scanned-project writes, remote calls, or new dependency.

## Capabilities

### New Capabilities

- `dashboard-search-navigation`: Deterministic global search, diagnostic disclosure, keyboard result navigation, and validated local restoration of safe dashboard UI context.

### Modified Capabilities

None.

## Impact

- Frontend: `src/search.ts`, `src/App.tsx`, a focused global-search component, a focused UI-state module, timeline state integration, project tab semantics, and the existing detail drawer.
- Tests: pure ranking/state tests plus component keyboard, disclosure, and navigation-context tests in the existing Vitest harness.
- Documentation: dashboard redesign plan, UX audit, current audit, docs home/map, and OpenSpec status evidence.
- APIs and safety: no server endpoint or scanner contract changes; stored project paths are used only after exact matching against already loaded configured projects and are never submitted as arbitrary API input.
