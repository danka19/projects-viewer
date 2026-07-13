## Why

Explicit `ready` and `planned` phase statuses are overwritten by explanatory acceptance prose, and accepted living specifications without task evidence display false 100% implementation progress.

## What Changes

- Make an exact leading supported phase status authoritative.
- Expose conflicting explanatory lifecycle prose as documentation integrity evidence.
- Attach numbered phase steps only from a roadmap with phase headings or an explicit phase-plan document.
- Keep genuine accepted-phase progress semantics unchanged.
- Make accepted living-spec progress unknown without eligible tasks or explicit implementation-final evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dashboard-state-derivation`: Preserve explicit leading lifecycle status and disclose contradictory explanatory prose.
- `spec-work-model`: Distinguish accepted specification lifecycle from evidenced implementation progress when no tasks exist.

## Impact

- `scan-projects.mjs` phase-status normalization and existing phase integrity fields.
- Specification progress derivation and Specs Canvas no-task presentation.
- Scanner/model/component regression coverage and status-rule documentation.
- No scanned project files, dependencies, APIs, or security boundaries change.
