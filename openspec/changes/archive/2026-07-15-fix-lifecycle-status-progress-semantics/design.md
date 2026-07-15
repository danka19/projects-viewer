## Context

Projects Viewer currently normalizes a whole multiline `Status:` value as free prose. Later words such as `accepted` can therefore override an exact leading `ready` or `planned` lifecycle, including negated acceptance prose. Separately, accepted living specifications with no owned tasks are treated as final implementation evidence and displayed as `0/0 tasks` at 100%.

The affected data flows already have sufficient contracts: `PhaseItem` exposes lifecycle, confidence, issue, and issue-note fields, while specification progress is nullable. Scanned projects are read-only inputs and cannot be repaired by the dashboard.

## Goals / Non-Goals

**Goals:**

- Keep an exact supported lifecycle token at the start of a phase status authoritative.
- Expose contradictory later lifecycle prose through existing integrity evidence.
- Keep accepted living-spec implementation progress unknown when no eligible task evidence exists.
- Preserve existing final progress for genuinely accepted phases and explicitly final OpenSpec changes.

**Non-Goals:**

- Changing accepted-phase or pending-acceptance phase progress semantics.
- Inferring implementation completion from dates, names, file order, or requirement acceptance.
- Adding status fields, dependencies, APIs, or write access to scanned projects.
- Editing `teamSsdCli` or any other configured project.

## Decisions

### Exact leading phase lifecycle is authoritative

The shared phase normalizer will recognize an exact allowed lifecycle token at the start of the normalized status value. It will return that canonical lifecycle before applying legacy free-prose heuristics. The established compound final forms `accepted and closed` and `closed and accepted` remain on the legacy path so existing meaning is unchanged.

The remaining explanation will be evaluated only for integrity evidence. If it independently suggests a different lifecycle, the phase keeps the leading lifecycle, receives a documentation issue, and drops to low confidence. This uses existing `PhaseItem` fields and fixes the root boundary once for all consumers.

Alternative rejected: expanding negation patterns. That would remain grammar-dependent and would not prevent positive decision-acceptance prose from overriding a phase lifecycle.

### Numbered phase steps require phase-owned source structure

The scanner will accept `N.N` step headings only when the same document contains a recognized phase heading or its title explicitly identifies a phase plan. A generic planning document may use numbered sections that resemble phase steps but does not establish ownership merely through matching numbers.

Alternative rejected: filtering the reproduced NIS filename or section titles. That would patch one source instead of fixing the ownership boundary shared by all scanned projects.

### Accepted living specifications need implementation evidence

The specification model will return null progress for `accepted-capability` items with no eligible tasks. The Canvas will explain this state as `No tasks documented` while retaining the existing accessible `progress unknown` wording. Lifecycle remains `accepted`; only the unsupported implementation percentage is removed.

Taskless closed or archived OpenSpec changes retain the existing final-progress rule because those item kinds carry explicit change-lifecycle completion evidence.

Alternative rejected: making every final lifecycle with zero tasks unknown. That would erase explicit final evidence for closed changes and expand the change beyond the reproduced inconsistency.

## Risks / Trade-offs

- Conflicting explanatory prose may produce more documentation warnings than before. This is intentional; the authoritative lifecycle remains stable and the warning identifies source cleanup work.
- Legacy statuses without an exact leading token remain heuristic and may retain existing ambiguity. Focused compatibility tests protect current behavior while future cases can be addressed separately.
- Generic planning documents that previously contributed accidental phase steps will stop affecting roadmap progress. Explicit roadmap and phase-plan structures retain their existing step extraction.
- Some repositories may treat an accepted living specification as proof of implementation. Without explicit task or implementation-final evidence, Projects Viewer cannot safely make that inference.

## Migration Plan

1. Add failing regression scenarios for the exact reproduced phase prose and no-task accepted capability.
2. Apply the minimal shared normalizer and nullable-progress changes.
3. Verify focused and full suites, a configured read-only rescan, and the browser presentation.
4. Roll back the implementation commits if verification exposes incompatible legacy behavior; no persisted data migration is required.

## Open Questions

None. The owner approved the design direction on 2026-07-13.
