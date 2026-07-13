# Lifecycle Status And Progress Semantics Design

Status: approved direction; written design pending final human review before implementation planning.

Date: 2026-07-13.

## Problem

Projects Viewer currently reads the whole prose value of a roadmap `Status:` line. A line that starts with `ready` or `planned` can therefore be normalized to `accepted` when its explanation later mentions an accepted decision or says that something “has not been accepted yet.” The final-state progress rule then turns the incorrect status into 100% implementation progress.

Specs Canvas has a separate evidence problem: every living specification under `openspec/specs/` is classified as an accepted capability, and an accepted capability with no owned tasks is displayed as `0/0 tasks` and 100%. Requirement acceptance alone does not prove implementation completion.

The verified evidence and root causes are recorded in [`LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md`](../../audits/LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md).

## Scope

This change modifies Projects Viewer only.

In scope:

- roadmap phase status normalization and integrity evidence;
- phase status regression tests using the exact affected prose shapes;
- Specs Canvas progress for accepted living specs without task evidence;
- focused model/component tests and documentation reconciliation.

Out of scope:

- editing any configured/scanned project, including `teamSsdCli`;
- changing the canonical meaning of a genuinely final `accepted` phase;
- changing `pending_acceptance` phase implementation-progress semantics;
- inferring implementation state from dates, file order, prose outside the status value, or accepted requirements alone;
- adding new dependencies or configuration.

## Chosen Approach

Use the smallest source-aware fix at the two shared model boundaries.

### Roadmap status

When a `Status:` value begins with one exact supported lifecycle token, that leading token is authoritative:

```text
Status: ready. The transfer boundary is accepted.
        ^^^^^
        phase lifecycle
```

The explanation may provide decision or dependency context, but it cannot replace the declared lifecycle. If the remaining prose contains conflicting lifecycle vocabulary, the phase keeps the leading status and receives a visible documentation-integrity warning with reduced confidence.

Legacy status prose that does not begin with an exact supported token continues through the existing heuristic normalizer. This preserves compatibility while making the explicit machine-readable form deterministic.

Examples:

| Source | Normalized status | Integrity |
|---|---|---|
| `Status: ready. The boundary is accepted.` | `ready` | warning |
| `Status: planned. The plan has not been accepted yet.` | `planned` | warning |
| `Status: accepted. Human accepted the implemented result.` | `accepted` | none |
| `Status: completed but requires owner approval.` | `pending_acceptance` | none; legacy heuristic |

The existing rule that a genuinely `accepted` phase reports 100% implementation progress remains unchanged. The defect is incorrect status ingestion, not the final-state meaning.

### Accepted living specifications

`accepted-capability` means that the living requirement/specification is accepted. It does not by itself establish implementation progress.

When an accepted capability has no eligible owned tasks or other explicit implementation-final evidence:

- progress is `null`/unknown;
- the card displays `No tasks documented`;
- it does not display `0/0 tasks` or a 100% progress bar;
- it is excluded from the mean of known specification progress values;
- lifecycle remains visibly `accepted`.

Archived or explicitly final OpenSpec changes may retain 100% without tasks when their own lifecycle evidence establishes completion. This design changes only the ambiguous accepted living-spec case.

## Data Flow

Roadmap:

```text
Status: line
  -> exact leading-token recognition
  -> optional conflict evidence
  -> PhaseItem.status / confidence / issue
  -> existing phase progress and timeline presentation
```

Specs:

```text
openspec/specs/<id>/spec.md
  -> accepted-capability lifecycle
  -> no task evidence => progress unknown
  -> Specs Canvas lifecycle label + No tasks documented
```

No new contract object or dependency is needed. Existing `PhaseItem` integrity fields and nullable `SpecProgress` are sufficient.

## Error And Integrity Handling

- An exact supported leading status always wins over later prose.
- Conflicting later lifecycle vocabulary produces a documentation issue; it never silently changes the phase status.
- An unsupported leading token continues to the existing heuristic/default behavior and existing parser issue handling.
- Missing tasks do not produce an error; they produce unknown progress with an evidence explanation.
- Scanned projects remain read-only throughout scanning, testing, and browser verification.

## Verification Design

TDD regression coverage will be added before production changes.

Roadmap tests must prove:

- the exact `ready ... accepted boundary` line remains `ready`;
- the exact `planned ... has not been accepted yet` line remains `planned`;
- both conflicting lines expose documentation integrity evidence;
- a genuinely leading `accepted` status remains `accepted`;
- legacy completion/approval prose keeps its current normalization;
- structured project output yields the source-backed lifecycle matrix for the regression fixture.

Specs tests must prove:

- accepted capability + zero tasks has unknown progress;
- the card says `No tasks documented` and omits `0/0` and `100%`;
- accepted capability lifecycle remains `accepted`;
- final changes and task-backed specs keep their existing progress behavior;
- project Specs progress counts the no-task accepted capability as unknown.

Verification gates:

- focused scanner/status tests;
- focused Specs model and Canvas tests;
- full `npm test`;
- `npm run build`;
- a fresh configured-project rescan;
- local browser verification of `teamSsdCli` as read-only evidence;
- `openspec list`, `openspec list --specs`, and `openspec validate --all --strict`;
- `git diff --check`.

## Alternatives Rejected

### Make every accepted phase derive progress from child steps

Rejected because it changes the meaning of a genuinely accepted phase, expands scope, and is unnecessary for the reproduced Roadmap defect.

### Fix only the parser

Rejected because it leaves the separately confirmed Specs Canvas `0/0 · 100%` evidence defect.

### Fix only source documentation

Rejected for Projects Viewer because another configured repository can repeat the same valid leading-status plus explanatory-prose pattern. The dashboard must protect its own state boundary. Scanned-source cleanup remains a separate task for that repository.

## Acceptance Criteria

The change is acceptable when:

1. explicit leading `ready` and `planned` statuses cannot be overwritten by explanatory acceptance prose;
2. conflicts are visible as integrity warnings rather than hidden at high confidence;
3. genuinely accepted phases retain their existing final-state progress behavior;
4. accepted living specs without implementation evidence show unknown progress and `No tasks documented`;
5. the configured `teamSsdCli` Roadmap renders `closed`, `closed`, `ready`, `planned`, `planned` after its separate source-document task is applied, while Projects Viewer already handles the existing ambiguous lines safely;
6. all automated, build, OpenSpec, and browser gates pass without modifying scanned projects.
