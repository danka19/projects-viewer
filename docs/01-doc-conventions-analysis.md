# Documentation Conventions Analysis

Status: reference document for the projects-viewer dashboard.
Last updated: 2026-07-07.
Sources analyzed: global skills in `C:\Users\danoc\.codex\skills` and the example project `C:\Users\danoc\Documents\projects\AutoParts`.

## 1. Overall Documentation System

The user's projects follow a Codex-first, agent-operated documentation system defined by global skills and enforced per-project. The canonical layout (fully realized in AutoParts):

```text
<project>/
├── AGENTS.md                     # canonical agent operating guide (read order, rules, branching)
├── CLAUDE.md                     # thin pointer: "read AGENTS.md" + optional "## Active Handoff" line
├── CONTEXT.md                    # domain glossary ONLY (terms + "Avoid" anti-terms), no implementation
└── docs/
    ├── README.md                 # project summary, key decisions, Documentation Rules, Documents table (file -> purpose)
    ├── ROADMAP.md                # phase-level working plan; one "## Phase N. Name" section per phase
    ├── CURRENT_PROJECT_AUDIT.md  # ACTIVE planning input: repo baseline, verified evidence, open findings, remediation tracking
    ├── 00_FILE_STRUCTURE.md      # repository map, must track file/folder additions
    ├── AI_STEP_VERIFICATION_CHECKLIST.md  # mandatory agent self-check before claiming completion
    ├── NN-topic.md               # numbered topic docs (01-mvp-scope..., 03-source-trust-policy..., 99-future-development)
    ├── phases/
    │   ├── PHASE_PLAN_TEMPLATE.md          # mandatory template for detailed phase plans
    │   └── PHASE_<N>_<NAME>.md             # detailed plans with work items
    ├── planning/*.md             # bounded plans / architecture notes (draft or accepted direction)
    ├── audits/<NAME>_<YYYY-MM-DD>.md       # dated audit findings (UX, parsing, alignment, acceptance gaps)
    ├── discovery/*.md            # accepted decisions & data contracts (e.g. PHASE_1_DECISIONS.md)
    └── handoffs/HANDOFF_<YYYY-MM-DD>_<topic>.md  # bounded Codex->Claude task handoffs
```

Other layouts to expect across projects (from skills, not present in AutoParts):

- **OpenSpec** (`openspec-*` skills): change folders with `proposal.md` (what & why), `design.md` (how), `tasks.md` (implementation steps), managed by the `openspec` CLI; specs synced via `openspec-sync-specs`. Location resolved by `.openspec.yaml` / planning home — expect `.openspec/` or `openspec/` directories.
- **ADRs** (`grill-with-docs` skill): `docs/adr/NNNN-kebab-title.md`, created only for hard-to-reverse, surprising, real-tradeoff decisions. Multi-context repos use root `CONTEXT-MAP.md` pointing to per-context `CONTEXT.md` + `docs/adr/`.
- Simple projects may only have `README.md` / `TODO.md` / `CHANGELOG.md`.

## 2. How Things Are Written

### 2.1 Roadmap items (phases)

`docs/ROADMAP.md` sections follow this shape:

```md
## Phase 4.7. Checkpoint UI State And Acceptance

Status: in progress on `phase-4-7/checkpoint-ui-state-acceptance`; ...
Detailed plan: `phases/PHASE_4_7_CHECKPOINT_UI_STATE_ACCEPTANCE.md`.
Goal: ...
Results: (bullet list of expected/delivered outcomes)
Quality gate: (bullet list of objective acceptance conditions)
```

Key facts:
- The `Status:` line is **free prose**, not an enum. Observed values: `in progress on \`branch\``, `complete on \`branch\`; merge to main requires explicit human approval`, `complete and merged to main`, `paused on \`branch\``, `closed as an implementation-evidence checkpoint ... on 2026-06-30`, `parser-core implementation gate verified ... on 2026-07-02`, `planned; implementation not started`, `planned after Phase 4.7 ...`, `not planned in detail yet`.
- Branch names are embedded in status lines (`phase-4-7/checkpoint-ui-state-acceptance`) and mirror the AGENTS.md branching convention `phase-N/topic`.
- ISO dates (`2026-06-30`) are embedded in prose everywhere and are the primary freshness signal.
- Phase completion is *gated*: "merge to `main` requires explicit human approval" is a recurring human-gate marker. "Complete" ≠ "accepted".

### 2.2 Detailed work items (open/completed tasks)

`docs/phases/PHASE_*.md` follows `PHASE_PLAN_TEMPLATE.md`: Purpose, Status, Source Evidence, Scope, Non-Scope, Current Repository Baseline, Branch And Commit Plan, Work Items, Phase Gate, Human Decisions, Risks, Documentation Completeness Check.

Work items are `### N.x Work Item Name` with fields: Objective, Evidence, Expected files, Verification, Documentation updates, Recommended subagents, Owner, Exit criteria, Completion documentation.

**There are almost no `- [ ]` checkboxes.** Task state is expressed in prose:
- Open: "remains open", "pending", "required before", "still requires", "not planned in detail yet", "implementation evidence still required for ...".
- Done: "have implementation evidence", "closed by `<doc>`", "verified and committed in `fdde4d3 ...`", "passed the updated automated gate", "gate evidence: ... passed".
- Partial/transferred: "moved to Phase 4.6", "superseded by", "carries forward to", "historical evidence".
- One commit per work item; commit hashes cited in docs are completion evidence.

### 2.3 Decisions

- Inline in ROADMAP/audit files as dated prose: "Human decisions 2026-06-29: ...", "2026-06-24 product decision: ...", "human owner direction on 2026-06-30".
- Dedicated decision docs: `docs/discovery/PHASE_1_DECISIONS.md`, `## Human Decisions` sections in phase plans, `## Key Decisions` in `docs/README.md`.
- ADR format available via `grill-with-docs` but not used in AutoParts.
- Rejections are decisions too: "the human owner rejected the current nomenclature card as unreadable" — these are strong *needs attention* signals.

### 2.4 Statuses and evidence

- `docs/CURRENT_PROJECT_AUDIT.md` starts with `Status: active.` and `Last updated: <date>.`, holds a Repository Baseline table (branch, remote, latest commit), Verified Environment Evidence table, and an Audit Remediation Tracking list mapping each finding to `-> closed by <doc>` or "implementation evidence still required".
- Handoffs: `Status: Active | Done (<one line result>) | Archived stale (...)` on line ~3; `CLAUDE.md ## Active Handoff` must contain either "None." or a single path — a stale pointer there is an explicit defect per `doc-sync-audit`.
- Audits are dated in the filename (`UX_UI_AUDIT_2026-06-18.md`) and act as findings queues until "fixed or invalidated by evidence".

### 2.5 Language and safety rules that matter for the dashboard

- All project documentation is English; user-facing reports are Russian (dashboard UI copy can be RU, parsed content is EN).
- Private customer data lives in ignored `imports/`, `tmp/`, `exports/` — the dashboard must never read or display those, only doc references to them.
- `doc-sync-audit` defines the trust rule: docs older than ~20 commits or contradicting the repo are suspect — the dashboard should surface doc-vs-filesystem freshness, not assume docs are true.

## 3. Parsing Signals Summary (for the scanner)

| Signal | Where | Regex/heuristic |
|---|---|---|
| Phase heading | ROADMAP.md | `^## Phase ([0-9.]+)\.? (.+)$` |
| Status line | ROADMAP, phase plans, audits, handoffs | `^Status: (.+)$` (prose; classify by keywords) |
| Branch | status lines | `` `[a-z0-9-]+/[a-z0-9-]+` `` |
| Dates | everywhere | `\b20\d{2}-\d{2}-\d{2}\b` (max = last activity) |
| Commit evidence | phase plans, audit | `` `[0-9a-f]{7,}` `` + verb (committed/verified) |
| Human gate | everywhere | `requires explicit human approval`, `human acceptance`, `owner-approved`, `blocked` |
| Rejection | audits, roadmap | `rejected`, `not accepted`, `not employee-ready`, `acceptance gap` |
| Work item | phase plans | `^### ([0-9.]+) (.+)$` + field bullets |
| Handoff status | docs/handoffs/*.md | `^Status: (Active|Done|Archived...)` |
| Active handoff pointer | CLAUDE.md | line under `## Active Handoff` |
| Checkboxes (fallback) | any md | `- [ ]` / `- [x]` |
| Doc purpose table | docs/README.md | `| \`file\` | purpose |` rows |
