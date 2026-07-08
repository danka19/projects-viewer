## 1. Data Contract And Core Module

- [ ] 1.1 Define project brief report TypeScript types for metadata, safe states, project items, attention reasons, findings summary, evidence, derived labels, and recommended human decisions.
- [ ] 1.2 Add a focused server report composition module that accepts generated scan data, saved config, AI context changes, and findings data without reading arbitrary request paths.
- [ ] 1.3 Implement report item ranking/grouping for changed projects, unresolved findings, likely blockers, approval gates, and changed next actions.
- [ ] 1.4 Implement safe empty-state handling for missing generated scan data, missing previous AI context snapshot, empty findings, and no attention items.

## 2. Local API Or Report Surface

- [ ] 2.1 Add a local-only API endpoint or equivalent retrieval surface for generating the current project brief report.
- [ ] 2.2 Ensure the endpoint accepts only safe report parameters, such as an optional `since` timestamp, and never accepts arbitrary project paths.
- [ ] 2.3 Ensure report generation does not write to scanned project folders, create tasks/calendar items, run commands, create commits, call remote model providers, or trigger agent work.

## 3. Verification

- [ ] 3.1 Add tests proving the report is generated from saved config and generated scan data only.
- [ ] 3.2 Add tests for changed-project categories, unresolved findings, blockers, approval gates, recommended human decisions, evidence preservation, and derived labels.
- [ ] 3.3 Add tests for missing generated data, missing previous snapshot, empty findings, and no-attention empty state.
- [ ] 3.4 Add negative tests for arbitrary path input and unauthorized side effects.
- [ ] 3.5 Run `npm test`, `npm run build`, `openspec validate --all --strict`, and `git diff --check`.

## 4. Documentation And Phase Follow-Through

- [ ] 4.1 Update README/docs to describe the project brief/report behavior, endpoint or retrieval surface, safety boundaries, and manual usage.
- [ ] 4.2 Update `docs/00_FILE_STRUCTURE.md` if new files or modules are added.
- [ ] 4.3 Update `docs/CURRENT_PROJECT_AUDIT.md` and the active phase plan with implementation evidence and remaining risks.
