# Status Rules

Status: implemented.
Last updated: 2026-07-13.

Two levels are intentionally separate:

- **Phase/step lifecycle status** uses the exact `phase-status-audit` values.
- **Project status** is the dashboard badge (`active`, `needs-attention`, `done`, etc.).

## Phase And Step Lifecycle

Allowed phase/step statuses:

`draft`, `planned`, `ready`, `in_progress`, `blocked`, `pending_acceptance`, `accepted`, `closed`, `deferred`, `cancelled`, `superseded`.

Parser mapping:

| Normalized | Trigger phrases |
|---|---|
| `draft` | no `Status:` line, unrecognized status prose, "draft", "not ready" |
| `planned` | "planned", "not planned in detail yet", "implementation not started", "scheduled after" |
| `ready` | "ready", "unblocked" |
| `in_progress` | "in progress", "currently working" |
| `blocked` | "blocked", "rejected", "not accepted", "acceptance gap", "must not start until", "waiting on" |
| `pending_acceptance` | "pending acceptance", "approval pending", "requires approval", "human acceptance required", "needs review", "under review" |
| `accepted` | "accepted", "human accepted", "owner accepted" |
| `closed` | "accepted and closed", "closed", "complete", "completed", "complete and merged", "merged to `main`" without an approval gate |
| `deferred` | "deferred", "paused", "on hold", "resume later", "planned later" |
| `cancelled` | "cancelled", "canceled" |
| `superseded` | "superseded", "replaced by" |

Machine-readable precedence:

- When a `Status:` value starts with one exact allowed lifecycle value, that leading value is authoritative.
- Explanatory decision, dependency, or acceptance prose must not replace the leading lifecycle.
- Conflicting later lifecycle vocabulary creates a documentation integrity warning and reduces confidence.
- Numbered step headings affect a phase only when their source contains recognized roadmap phase structure or explicitly identifies itself as a phase plan; matching numbers in a generic planning document do not establish ownership.

Phase progress display treats `closed`, `accepted`, and `pending_acceptance` phases as 100% implementation progress even when historical detailed phase-plan steps are stale, incomplete, or only describe objectives. The segmented roadmap summary counts only `closed` as fully reconciled.

Specification progress is evidence-based: `accepted-capability` identifies an accepted living specification, not implementation completion. Without eligible owned tasks or explicit implementation-final evidence, progress is unknown and Specs Canvas reports `No tasks documented` instead of `0/0 tasks` or 100%. The active OpenSpec change [`fix-lifecycle-status-progress-semantics`](../openspec/changes/fix-lifecycle-status-progress-semantics/) is the canonical proposed contract until sync and archival.

Specification lifecycle, delivery planning, and implementation progress are separate concepts:

- specification lifecycle answers whether the requirements or decision are accepted;
- delivery planning answers whether implementation work has an evidenced task breakdown and is ready to enter delivery;
- implementation progress is calculated only from eligible task evidence or explicit implementation-final evidence.

An accepted living specification under `openspec/specs/` may legitimately have no owned tasks because OpenSpec tasks normally belong to a concrete change package. Task absence alone therefore does not prove either incomplete planning or completed implementation. For display purposes, zero eligible tasks means unknown progress unless explicit source evidence establishes a final change lifecycle. If implementation is explicitly unnecessary, the eventual presentation should use `not applicable`, not 100%.

A follow-up product change is queued to add an evidence-backed delivery-planning presentation without overloading lifecycle status. The intended derived states are `planning required`, `planned`, and `not applicable`; they are not part of the implemented status contract yet and must not be inferred from task count alone. The intake and acceptance boundary are recorded in [`CURRENT_PROJECT_AUDIT.md`](CURRENT_PROJECT_AUDIT.md#change-intake-specification-delivery-planning-state-2026-07-13).

## Project Status

Evaluate rules top-down; first match wins.

### `needs-attention`

Any of:

1. Unresolved rejection or acceptance-gap signal.
2. Real blocker: active/next phase is `blocked`, or a prerequisite is explicitly unmet.
3. Doc integrity defect from doc-sync-audit rules.
4. Blocking open decision/question.

### `needs-review`

Review or validation signals remain, but no higher-priority rejection, hard blocker, or acceptance-gap signal was found.

### `pending-approval`

Any phase is `pending_acceptance`, or approval-gate signals say the remaining action is human/owner acceptance.

### `active`

Not needs-attention, needs-review, or pending-approval, and at least one phase is `in_progress` with recent activity, or no phase structure exists but tracked docs/repo changed within `activeDays`.

### `paused`

The current phase is `deferred`.

### `stalled`

Open work exists but last activity is older than the configured active window.

### `done`

No open work remains and relevant phases are `accepted`/`closed`, or explicitly `deferred`/`cancelled`/`superseded` with reasons.

### `unknown`

No recognizable documentation exists, or docs exist but no project-level status can be derived.

## Freshness Inputs

1. Git last commit date on the current branch.
2. Max ISO date (`20\d\d-\d\d-\d\d`) mentioned in roadmap, audit, or active phase plan.
3. Max mtime of scanned doc files.

## Defaults

```jsonc
{
  "activeDays": 14,
  "stalledDays": 30,
  "auditDriftDays": 14
}
```

Per-project overrides live in the dashboard config, never in scanned projects.
