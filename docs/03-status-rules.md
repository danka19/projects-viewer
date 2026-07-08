# Status Rules

Status: proposed, not implemented.
Last updated: 2026-07-07.

Two levels: **phase/item status** (normalized from prose) and **project status** (the dashboard badge). All thresholds are config values, defaults below.

## 1. Normalizing prose statuses (phase/work-item level)

Match keywords in `Status:` lines and work-item prose, case-insensitive, first match in this order:

| Normalized | Trigger phrases (observed in real docs) |
|---|---|
| `blocked` | "blocked", "rejected", "not accepted", "acceptance gap", "must not start until", "stays paused until ... accepted" |
| `done` | "complete and merged", "merged to `main`" |
| `done_pending_approval` | "complete on `branch`", "closed as", "gate verified", "closed by", "Done (" (handoffs) — combined with "requires explicit human approval" |
| `active` | "in progress", "implementation evidence" for recent items, "receiving ... review" |
| `paused` | "paused" |
| `planned` | "planned", "not planned in detail yet", "implementation not started", "scheduled after" |
| `unknown` | no `Status:` line found, or no phrase matched (keep raw text, flag for review) |

## 2. Project-level status (the five dashboard values)

Evaluate rules top-down; **first match wins**. Every match records `statusReasons[]` with evidence.

### `needs attention`
Any of:
1. An explicit **rejection or acceptance gap** is unresolved (audit with `resolution: open` of kind `acceptance_gap`, or "human owner rejected ... " with no later "accepted"/"closed by" evidence).
2. A **human gate is the only thing left**: phase status is `done_pending_approval` or a work item says "human must accept / final normal-browser acceptance" and everything agent-side is done — i.e. the project is waiting on the *user*, not on the agent.
3. **Blocked**: active/next phase is `blocked`, or a "Phase X must not start until Y" condition names an unmet prerequisite.
4. **Doc integrity defects** (from `doc-sync-audit` rules): `CLAUDE.md` Active Handoff points to a non-active handoff file; current git branch ≠ branch named in the active phase status; `Last updated:` of `CURRENT_PROJECT_AUDIT.md` older than the latest commit by more than `auditDriftDays` (default 14).
5. An **open decision/question** is explicitly marked blocking ("blocking questions", "human decision required before").

### `active`
Not needs-attention, and any of:
1. At least one phase normalized `active`, **and** last activity (max of doc dates, doc mtimes, last commit date) within `activeDays` (default 14).
2. An `Active` handoff exists with date within `activeDays`.
3. OpenSpec change with `tasks.md` checkbox progress modified within `activeDays`.
4. No phase structure, but tracked docs/repo modified within `activeDays` (plain-readme projects).

### `stalled`
Not the above, and:
1. There is open work (phase `active`/`paused`, open work items, open TODO checkboxes, or unarchived openspec change), **but** last activity is older than `stalledDays` (default 30).
2. Special case: phase `paused` with a resume condition that has been satisfiable for > `stalledDays` also lands here.

Between `activeDays` and `stalledDays` (15–29 days idle) a project stays `active` but the UI shows the idle-days counter; tune later.

### `done`
1. All phases are `done` (merged) or explicitly out of scope / future ("99-future-development" content does not count as open work), **and** no open audit findings, active handoffs, or open decisions. Or:
2. Plain project whose README/CHANGELOG declares completion ("archived", "final release") with no open TODO items.

`done_pending_approval` phases do **not** make a project done — they make it `needs attention` (rule 2), because the system's whole philosophy is that human acceptance is the real gate.

### `unknown`
1. No recognizable documentation (no README/ROADMAP/docs/), or
2. Docs exist but no status could be derived (no status lines, no dates, no git) — show with a "docs unreadable by dashboard" hint listing what's missing.

## 3. Freshness inputs, in priority order

1. Git last commit date on the current branch (most reliable).
2. Max ISO date (`20\d\d-\d\d-\d\d`) mentioned in ROADMAP / CURRENT_PROJECT_AUDIT / active phase plan — the docs are date-dense by convention.
3. Max mtime of scanned doc files (fallback; unreliable after bulk copies).

Disagreement between (1) and (2) beyond `auditDriftDays` is itself a `needs attention` signal ("docs drift behind code" — exactly what `doc-sync-audit` exists to catch).

## 4. Defaults

```jsonc
{
  "activeDays": 14,
  "stalledDays": 30,
  "auditDriftDays": 14
}
```

Per-project overrides live in the dashboard config, never in the scanned projects.
