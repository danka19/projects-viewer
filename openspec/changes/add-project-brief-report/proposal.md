## Why

Projects Viewer already exposes local AI context and review-required findings, but the first end-to-end workflow is still prose-only in Phase 1 notes. A project brief/report capability turns those scan signals into a concrete, reviewable daily or weekly decision aid without granting AI authority to act.

## What Changes

- Add a local project brief/report capability that summarizes changed projects, unresolved findings, blockers, approval gates, and recommended human decisions.
- Generate the brief only from saved local config, generated scan data, AI context changes, and findings review state.
- Preserve the current safety model: scanned projects stay read-only, reports stay advisory, and no commands, commits, task/calendar writes, remote model calls, or scanned-project edits are triggered.
- Define safe missing-data behavior for first-run or missing-snapshot cases.
- Keep a full findings-review UI out of scope until the brief/report contract is implemented and validated.

## Capabilities

### New Capabilities

- `project-brief-report`: Local advisory daily/weekly project brief/report generated from AI context, changes-since data, and review-required findings.

### Modified Capabilities

- None. Existing `ai-context` and `ai-findings` capabilities are reused as inputs without changing their accepted requirements.

## Impact

- Server/API: add a local report endpoint or report generation module that composes existing scan, AI context, changes-since, and findings data.
- Data contracts: introduce a report shape for brief metadata, project items, evidence, recommended human decisions, and safe empty states.
- Frontend or CLI/report surface: optional display or retrieval path for the generated brief after the contract is implemented.
- Tests: add contract tests for report composition, evidence labeling, missing data, unresolved finding handling, and no unauthorized side effects.
- Documentation: update README/docs once implementation exists; keep Phase 1 and OpenSpec artifacts as the source of proposed behavior until then.
