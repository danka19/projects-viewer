# projects-viewer Documentation

Read-only dashboard over the user's local projects, driven entirely by their markdown documentation conventions (Codex phase system, OpenSpec, ADRs, plain READMEs). Nothing here writes to scanned projects.

Repo: https://github.com/danka19/projects-viewer

## Documents

| File | Purpose |
|---|---|
| `01-doc-conventions-analysis.md` | How the user's documentation system works (skills + AutoParts example); parsing signals table |
| `02-dashboard-data-model.md` | Proposed JSON data model for the scanner output (`data/projects.json`) |
| `03-status-rules.md` | Rules deriving active / stalled / done / needs attention / unknown, with thresholds |
| `04-implementation-plan.md` | Short implementation plan, v1 acceptance criteria, open questions |

## Current State

v3 implemented (2026-07-07): interactive "project radar" UI with progressive disclosure — clickable metric bar, sidebar with health scores, per-project summary panel (health ring, current phase, next action, main blocker, recent decision), focus cards (max 3 items + View all), 8 tabs (Overview/Roadmap timeline/SDD-Specs/Tasks/Decisions/Audits/Documentation coverage map/Activity), right-side detail drawer with `file:line` + copy-path + related items, and global search across all item types (`/` shortcut). Scanner v3 adds: doc categories via fuzzy filename patterns (roadmap/spec/audit/decision/handoff), risks & open questions, audit docs with derived status, and a per-project summary object with a 0–100 health score. The v2 prose-status intelligence (phases, decisions, blockers with actor/conditional guards, handoff lifecycle, gaps) is unchanged underneath. See root `README.md` for the interaction model.
