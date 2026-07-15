# Roadmap Spec Cards Design

## Goal

Make roadmap-to-specification ownership visible in the dashboard without forcing large specifications to be split into artificial fragments.

## User-visible behavior

The Roadmap primary view remains a lifecycle timeline of phases. When a phase is expanded, its content includes specification cards owned by that phase. Specifications may be attached to a specific phase step or remain phase-level:

```text
Phase 4
├── Step 7.1
│   └── Spec card
└── Phase-level specs
    └── Large spec card
        ├── Task 1
        └── Task 2
```

Each spec card is a real interactive work card, not a count or a text-only link. It shows the specification name, lifecycle status, implementation progress when evidenced, task summary, and source evidence. Selecting the card opens the existing read-only drawer; a dedicated action can switch to Specs view and focus the same specification card.

Large specifications are valid phase-level work units. They are not split solely for presentation. Their owned tasks remain nested under the spec card. A specification is split only when its parts have independent lifecycle, acceptance, dependencies, or ownership.

Specifications without a valid phase ownership record are displayed in an explicit `Unassigned specs` region and produce an integrity signal. The scanner and UI never infer ownership from file order, names, numbering, timestamps, or semantic similarity.

## Source contract

Accepted capability specs and active changes declare one primary roadmap phase and optional related phases. The primary phase owns the card; related phases provide traceability only.

Optional step metadata makes step ownership explicit:

```md
## Roadmap

- Roadmap phase: P4
- Roadmap step: 7.1
- Related phases: none
```

```md
## Roadmap

- Execution phase: P4
- Execution step: 7.1
- Related phases: none
- Lifecycle status: accepted
```

`Roadmap step` and `Execution step` are optional and mutually exclusive by artifact kind. A missing step means phase-level ownership. A reference to a missing phase or step is preserved as an integrity issue and does not create a guessed attachment.

The inverse tables in `docs/ROADMAP.md` gain a matching step column. Every accepted spec and active change must have exactly one row, and metadata and inverse-row values must match exactly.

## Model and data flow

1. The existing scanner reads supported OpenSpec metadata from configured project documentation.
2. The spec-work model normalizes each artifact into a stable work identity, primary phase, optional step, related phases, lifecycle, progress, tasks, and source evidence.
3. The roadmap presentation adapter joins phases and steps with specs by exact normalized phase/step identity.
4. The adapter exposes separate collections for step-owned specs, phase-level specs, and unassigned/integrity cases.
5. The timeline renders spec cards from that model and uses existing drawer/search/Specs Canvas descriptors for navigation.

The roadmap presentation model remains read-only and must not change lifecycle truth, phase status, task status, or accepted decisions. Specs Canvas continues to be the canonical detailed specification graph; Roadmap shows ownership context and concise nested work.

## Layout and interaction

- Phase cards retain the existing horizontal axis and status semantics.
- Expanded phase content keeps the current step timeline.
- Each step lane may render a bounded row of spec cards; overflow uses the existing local scroll affordances and never creates page-level horizontal overflow.
- Phase-level specs render in a labelled section after the step lane.
- A spec card supports keyboard focus, Enter/Space activation, visible focus, accessible status/progress text, and source drawer access.
- “Open in Specs” preserves the selected project and targets the matching spec descriptor. If Specs view is unavailable, the card remains usable through the drawer and shows a non-blocking reason.
- Dense phases use the same bounded rendering and overflow conventions as the existing timeline; cards do not silently disappear.

## Integrity and fallback behavior

- No roadmap phases: the existing no-roadmap state remains authoritative; specs are available through Specs view when present.
- No specs: the phase timeline renders unchanged.
- Large spec with no tasks: render lifecycle and `Progress unknown` / `No tasks documented`; never show `0/0` as 100%.
- Invalid phase or step reference: render in `Unassigned/Integrity` with source evidence and a warning.
- Duplicate logical identity from accepted and active artifacts: preserve source-specific stable keys, show the relationship as duplicate/parallel lifecycle evidence, and do not silently merge or drop either artifact.
- Partial or stale scan: retain existing data-state labels and disclose that spec ownership may be incomplete.

## Verification

Automated coverage must include:

- exact phase and step ownership joins;
- phase-level specs and large task-bearing specs;
- missing/invalid phase or step references;
- accepted capability and active change source-specific stable keys;
- no ownership inference from order, names, or related phases;
- Roadmap card rendering, keyboard activation, drawer navigation, Specs Canvas focus handoff, dense overflow, mobile layout, and no page-level horizontal overflow;
- unchanged no-roadmap, no-spec, stale, partial, and unknown-progress states.

The final gate remains `npm test`, the focused scanner/model/component suites, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, `git diff --check`, and the existing dark/light browser matrix at 1280×720, 1024×768, and 390×844.

## Explicit non-goals

- Automatically splitting large specifications.
- Inferring phase or step ownership from prose, directory order, filenames, or task numbering.
- Replacing Specs Canvas with the Roadmap view.
- Editing scanned projects or changing lifecycle/acceptance decisions.
