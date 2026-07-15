# Add Roadmap Specification Cards

## Why

Projects Viewer now records bidirectional roadmap/OpenSpec phase ownership, but the Roadmap view still shows phases and steps without the specifications that implement them. This makes large specs appear detached from lifecycle work and forces the user to switch views to understand ownership.

## Roadmap

- Execution phase: P4
- Execution step: none
- Related phases: none
- Lifecycle status: accepted

## What Changes

- Add explicit optional `Roadmap step` / `Execution step` ownership metadata to supported specifications and active changes.
- Extend the generated spec-work contract with exact phase/step ownership and source evidence.
- Render phase-level and step-owned specifications as interactive cards nested in the Roadmap timeline.
- Preserve large specs as single work units with nested tasks.
- Provide explicit unassigned/integrity rendering for invalid or missing ownership evidence.
- Navigate from a Roadmap spec card to source details and the corresponding Specs Canvas card.

## Capabilities

### New Capabilities

- `roadmap-spec-cards`: Exact phase/step ownership, nested Roadmap spec cards, bidirectional navigation, and integrity handling.

### Modified Capabilities

- `selectable-primary-work-view`: Roadmap spec-card activation may target the matching Specs Canvas card without changing view truth or persistence safety.

## Impact

- Scanner/model: spec-work ownership metadata and integrity evidence.
- Frontend: timeline model, phase/step lanes, spec-card presentation, and existing drawer/Specs navigation.
- Documentation: roadmap inverse tables, OpenSpec metadata contract, current audit, and verification evidence.
- Safety: no scanned-project writes, arbitrary path input, remote calls, or automatic actions.
