## 1. Contract And Data Shape

- [ ] 1.1 Define TypeScript types for compact AI project context, all-project AI context, changes-since results, AI findings, evidence items, and finding review states.
- [ ] 1.2 Add a mapper from existing `ScanOutput` / `ProjectData` to compact AI context without including raw markdown document bodies.
- [ ] 1.3 Add source-evidence normalization helpers that preserve project-relative `file` and `line` fields where scan output provides them.
- [ ] 1.4 Add deterministic change-category comparison for status, status reason, current phase, next action, blocker summary, risk summary, gaps, and findings.

## 2. AI Context API

- [ ] 2.1 Add local-only API endpoint for all-project AI context derived from generated scan output.
- [ ] 2.2 Add local-only API endpoint for selected-project AI context using a saved tracked project identity, not arbitrary path input.
- [ ] 2.3 Add local-only API endpoint for AI context changes since a caller-provided timestamp or scan timestamp.
- [ ] 2.4 Return clear empty-state or error responses when generated scan output is missing or stale enough that context cannot be built confidently.

## 3. Findings Generation And Storage

- [ ] 3.1 Define deterministic finding identity rules so regenerated findings can be matched across scans.
- [ ] 3.2 Generate initial rule-based findings for suspected status contradictions, stale audits, stale active handoff pointers, unresolved human gates, unclear next actions, missing specs/design docs, and missing verification evidence where existing scan signals support them.
- [ ] 3.3 Store generated findings and review metadata under `app-data/` only.
- [ ] 3.4 Preserve dismissed and accepted review state across rescans when the underlying finding identity is unchanged.
- [ ] 3.5 Mark findings stale or remove them from unresolved views when source evidence no longer supports them.

## 4. Review Surface

- [ ] 4.1 Add API support for reading unresolved, accepted, dismissed, and stale findings.
- [ ] 4.2 Add API support for updating finding review state without writing to scanned project folders.
- [ ] 4.3 Optionally add a dashboard panel or tab section that displays review-required findings with evidence and state controls.

## 5. Verification And Documentation

- [ ] 5.1 Add tests for compact AI context shape, omitted raw markdown bodies, and evidence preservation.
- [ ] 5.2 Add tests that AI context endpoints reject arbitrary path input and use only saved generated scan data.
- [ ] 5.3 Add tests that finding generation and review-state updates write only under dashboard runtime data paths.
- [ ] 5.4 Add tests for changes-since field-category reporting and no-change reporting.
- [ ] 5.5 Update README/docs to describe AI context and findings behavior, safety boundaries, and local runtime data files.
- [ ] 5.6 Run `npm test`, `npm run build`, `openspec validate --all --strict`, and `git diff --check` before completion.
