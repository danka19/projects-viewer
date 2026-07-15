## Context

The current search implementation lives inline in `src/App.tsx`. It iterates source arrays, pushes at most forty hits, includes filtered parser diagnostics in ordinary results, uses array indexes as React keys, and clears the query after navigation. The unfinished `src/search.ts` begins the correct separation by introducing a pure ranked result model, but it is not integrated or tested. Dashboard selection, filter, tab, and search state currently initialize from defaults on every reload.

Projects Viewer is local-only and read-only. Any restored project path must be treated as untrusted browser state until it exactly matches a project already present in the loaded scan; it must never become an API scan path. The existing drawer factories remain the only result-to-detail mapping, and the current React/Vitest stack is sufficient.

## Goals / Non-Goals

**Goals:**

- Make ranking, diagnostic exclusion, totals, truncation, and stable result identity pure and testable.
- Provide a semantic combobox/listbox interaction with deterministic Arrow/Home/End/Enter/Escape behavior.
- Keep project and result type visible and group results without disturbing score order.
- Preserve query and status-filter context when a result is opened.
- Restore validated local UI context, revision-scoped timeline expansion, and resolvable drawer identity after reload while discarding corrupt or stale values safely.
- Complete the existing detail tab and drawer keyboard/focus contracts used by search navigation.
- Keep all behavior inside the existing local/read-only frontend boundary.

**Non-Goals:**

- No server-side search, full-text index, fuzzy matching, remote provider, analytics, or search-history service.
- No arbitrary URL/project path input and no persistence into project configuration or scanned files.
- No persistence of drawer contents, arbitrary drawer objects, or DOM focus across a full browser restart; only a source descriptor may be restored.
- No attempt to close the separate timeline human-clarity gate through search behavior.

## Decisions

### Keep ranking and state restoration in pure modules

`src/search.ts` owns hit construction, evidence-key deduplication, scoring, sorting, result totals, truncation, diagnostics availability, stable keys, and lightweight grouping metadata. It searches the complete scanner-bounded arrays before applying the forty-result render limit. `src/uiState.ts` owns versioned parse/restore/serialize behavior for localStorage and namespaced `history.state`. React components consume those outputs without duplicating business rules.

Alternative: leave the logic in `App.tsx`. Rejected because source-order behavior, limits, and validation become hard to test and the app shell is already responsible for data loading and layout.

### Use controlled local state plus versioned localStorage

The app persists selected project path, project-status filter, active detail surface, knowledge subview, query, diagnostic opt-in, a timeline descriptor (`projectId`, `revision`, `expandedPhaseKey`), and a drawer descriptor (`projectPath`, stable `kind`, `file`, optional `line`) under one versioned localStorage key and one namespaced browser-history field. Human-facing `DrawerItem.type` is not identity. On restore, enum values must be from fixed allowlists and the selected path must exactly match the current loaded project list. Timeline expansion is accepted only by the matching model revision and existing phase key. A drawer descriptor is accepted only when project/kind/file/optional-line resolves to exactly one current loaded project item through existing drawer factories. Invalid JSON, foreign/unknown history state, unknown versions, removed projects, unsupported enum values, stale revisions, ambiguous evidence, and missing evidence fall back independently to defaults.

Meaningful project/tab/filter/drawer/timeline navigation pushes a same-URL history entry; transient query typing replaces the current entry. A `popstate` restoration runs through the same validation as localStorage. Raw project paths therefore never enter the URL or an API request.

Alternative: place raw project paths in URL parameters. Rejected because the current frontend has no stable saved project ID in `ProjectData`, raw local paths should not be exposed in navigation URLs, and browser-supplied paths must not become scan inputs.

### Persist identity, never stale drawer contents

Drawer restoration stores only a minimal source/stable-kind descriptor. Resolution searches the already loaded project model and recreates the current `DrawerItem` through existing factories only for an exact single match, so localized type labels, status, related evidence, and text cannot be revived from a stale serialized object. Timeline restoration follows the same identity rule and additionally requires the exact model revision.

Alternative: serialize the full drawer and timeline reducer state. Rejected because derived text/status can become stale and DOM-focused/origin controls are not meaningful after reload.

### Preserve search context but close the result popup after activation

Opening a result updates the selected project and requested surface/drawer while retaining the query and status filter. The controlled search popup closes so it does not cover the target; focusing the input reopens the same ranked results. Selected-project resolution uses the full configured project list rather than the filtered sidebar list, so a preserved filter cannot redirect search navigation to a fallback project.

Alternative: reset the filter and clear the query. Rejected because it destroys the user's retrieval context and caused the audited navigation-state problem.

### Use one semantic listbox with visible type/project grouping

The search input uses the ARIA combobox pattern, the popup is one listbox, and every hit is a stable option. Visual group headings or badges follow first appearance in ranked order; option labels still include project context. The flat score-sorted option order is canonical for rendering and keyboard selection, so grouping metadata must never reorder options.

Alternative: separate independent lists per group. Rejected because assistive-technology and arrow-key traversal would become fragmented.

### Complete the tab and drawer patterns at the navigation boundary

Both project-detail tablists use roving `tabIndex`, ArrowLeft/ArrowRight/Home/End, stable tab/tabpanel IDs, and `aria-controls`/`aria-labelledby`. The drawer captures the real origin, moves focus to its close control, traps Tab/Shift+Tab while modal, and restores origin focus on close; background dashboard content becomes inert while the drawer is open.

Alternative: treat click support and `role="tab"`/`role="dialog"` as sufficient. Rejected because search result activation can move users into these surfaces and the audited keyboard/focus contract would remain incomplete.

## Risks / Trade-offs

- [Saved local paths become stale after config changes] -> Restore only exact matches in the current loaded project list and fall back to the first project.
- [Persistent queries can surprise the user on reload] -> Restore the text but keep the popup closed until the input is focused; Escape clears the controlled query.
- [History entries could restore foreign or stale objects] -> Read only the namespaced versioned field and pass it through the same exact-match validation as localStorage.
- [A fixed forty-item render limit can still hide matches] -> Compute the true total first and show `Showing 40 of N`; diagnostics availability is disclosed separately.
- [The same evidence is present in `nextTasks` and `openTasks`] -> Deduplicate by stable project/source/line/text identity and retain the highest-ranked representation.
- [Filtered diagnostic evidence also appears in task extraction] -> Build diagnostic evidence identities first and suppress the task representation; opt-in emits only the explicitly labelled diagnostic hit.
- [Score constants can become accidental policy] -> Cover ordering and deterministic tie-breakers with pure tests and document the source classes in code.
- [Grouping can obscure global ranking] -> Order groups by their first ranked hit and preserve the ranked flat order within the keyboard model.

## Migration Plan

1. Add failing pure tests for search ranking, deduplication, diagnostic opt-in, totals/truncation, stable identity, and state restoration.
2. Complete the pure modules, then add failing component tests for combobox keyboard behavior, preserved navigation context, tablists, and drawer focus.
3. Replace the inline search block in `App.tsx`, initialize/persist validated local/history UI state, integrate `popstate` plus revision-scoped timeline/drawer restoration, and verify search navigation against existing drawers.
4. Run focused component tests, the full test suite, build, strict OpenSpec validation, and browser acceptance with storage reload.

Rollback restores the prior inline search and removes the versioned storage key reader. Existing saved localStorage data is inert if the reader is removed; no runtime data or scanned project migration is required.

## Open Questions

None. A future saved project ID in the public dashboard data could replace path-based local identity, but exact-match local restoration is safe for this slice.
