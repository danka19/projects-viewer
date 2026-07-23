## Why

Project View can currently promote historical, audit, plan, or explanatory blocker vocabulary into live state and can lose a roadmap current phase to unrelated prose. The resulting false blockers and `null` current phase make the dashboard unreliable for projects such as ScanLab.

## What Changes

- Restrict live blocker and constraint evidence to `ROADMAP.md`, non-archived active OpenSpec changes, and `docs/BUGS.md`.
- Require an explicit current-work blocker statement rather than treating the word `blocked` alone as evidence.
- Exclude superseded items from progress and constraints; surface missing replacement references as quality-only warnings.
- Derive the current phase from roadmap order and explicit roadmap lifecycle, including a blocked first unfinished phase.

## Roadmap

- Execution phase: P4
- Related phases: none
- Lifecycle status: in_progress

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dashboard-state-derivation`: Canonicalize live blocker sources and roadmap-only current-phase derivation.
- `dashboard-evidence-trust`: Exclude historical and explanatory blocker vocabulary, including superseded evidence, from live project state.

## Impact

- `scan-projects.mjs` scanner-derived signal, constraint, summary, and diagnostic behavior.
- Scanner fixtures in `tests/scan-trust.test.mjs` and related source-trust coverage.
- No external API, persistence schema, configured-path, or scanned-project write behavior changes.
