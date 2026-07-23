## Context

The scanner currently discovers documentation broadly and classifies blocker/gate candidates with contextual heuristics. Those heuristics protect many rule and template files but still let archives, audits, plans, and historical prose enter live state. Parsed phases may also be sourced from non-roadmap documents before the singular current phase is selected.

The dashboard uses derived signal groups for health, constraints, summaries, reports, and agent preflight packets. A source-policy error therefore propagates beyond the initial Project View panel.

## Goals / Non-Goals

**Goals:**

- Establish a small, deterministic source allowlist for live blockers and constraints.
- Require explicit current-work blocker language rather than matching `blocked` vocabulary alone.
- Preserve supersession as non-live evidence and expose a missing replacement only as documentation quality information.
- Select `summary.currentPhase` from the first unfinished roadmap phase while preserving its lifecycle.
- Retain source evidence and existing read-only scanner boundaries.

**Non-Goals:**

- Add configurable source paths, a UI for bug-list selection, or migrations of scanned projects.
- Rewrite existing archival, audit, or planning documents.
- Change the accepted lifecycle or generic specification-progress formula.

## Decisions

### Use an allowlist instead of expanding exclusions

Live state accepts `ROADMAP.md`, `docs/BUGS.md`, and active `openspec/changes/<change-id>/` only. The active OpenSpec path must not be under `openspec/changes/archive/`. This is safer than maintaining a growing blacklist because newly introduced documentation categories default to non-live.

Alternative: retain broad discovery with stronger path heuristics. Rejected because a new audit, evidence, or history naming convention can become a false live source.

### Separate source eligibility from content eligibility

The scanner first determines whether a document is eligible to affect live state, then verifies that a candidate is an explicit present-work blocker. Historical quotations, invariants, normative statements, conditionals, and bare state labels stay diagnostic-only even in an allowed source.

Alternative: make source eligibility alone sufficient. Rejected because roadmap and active-change prose can still explain rules or history.

### Treat supersession without replacement as quality evidence

Superseded work never enters live constraints or progress eligibility. If it lacks an explicit replacement reference, a non-live diagnostic records the documentation gap. The scanner never manufactures replacement work or a blocking state.

Alternative: promote the missing reference to a blocker. Rejected because documentation incompleteness does not prove current delivery is blocked.

### Select current phase from roadmap order at summary construction

Roadmap parsing remains the source of phase lifecycle data. `buildSummary` selects the first non-final roadmap phase in roadmap order, preserving its lifecycle such as `blocked`; only when every roadmap phase is final does it return `null`. This makes an explicitly blocked current phase visible instead of treating its lack of `in_progress` wording as no phase.

Alternative: require exactly one `in_progress` phase. Rejected because roadmap-authoritative projects such as ScanLab can truthfully mark the immediate phase `blocked` before work begins.

## Risks / Trade-offs

- [Existing projects use a different bug-list path] → The deliberately fixed `docs/BUGS.md` convention fails closed; teams can express current blockers in the roadmap or an active change until a separate configuration design is accepted.
- [Explicit language misses vague real blockers] → The UI avoids false critical state; authors can write a clear current-work statement with the cause.
- [Diagnostics increase] → Diagnostics remain non-live and disclose why a candidate was excluded.

## Migration Plan

1. Add regression fixtures before production code.
2. Apply the source and explicit-content policies in the scanner.
3. Validate focused fixtures, the full suite, TypeScript build, OpenSpec validation, and roadmap/OpenSpec ownership.
4. No data migration, deployment migration, or rollback action is required; reverting the implementation commit restores prior local derivation behavior.

## Open Questions

None.
