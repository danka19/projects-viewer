# Dashboard JSON Data Model

Status: proposed, not implemented.
Last updated: 2026-07-07.

Design principles:

- **Read-only, derived, regenerable.** The scanner produces one `data/projects.json`; nothing writes back to project docs.
- **Evidence-preserving.** Every derived status carries `evidence[]` (file, line, quoted snippet) so the UI can show *why* a project is "stalled" and the human can verify against source.
- **Prose-tolerant.** Original status text is always kept (`statusText`) next to the normalized enum (`status`), because statuses are free prose.
- **Profile-based.** Each project is detected as one or more doc profiles (`codex-phase`, `openspec`, `adr`, `plain-readme`) and parsed accordingly.

## Top-level file

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-07T19:30:00+03:00",
  "scanRoots": ["C:/Users/danoc/Documents/projects"],
  "projects": [ /* Project[] */ ]
}
```

## Project

```jsonc
{
  "id": "autoparts",
  "name": "AutoParts",
  "path": "C:/Users/danoc/Documents/projects/AutoParts",
  "docProfiles": ["codex-phase"],           // codex-phase | openspec | adr | plain-readme
  "summary": "B2B tool for analyzing auto-parts inventory exported from 1C...", // first paragraph of docs/README.md or README.md
  "language": "en",

  "status": "needs_attention",              // derived enum, see 03-status-rules.md
  "statusReasons": [                        // ranked list, first = shown badge tooltip
    {
      "rule": "human_gate_pending",
      "label": "Nomenclature card rejected by owner; rebuild required before acceptance",
      "evidence": { "file": "docs/phases/PHASE_4_7_CHECKPOINT_UI_STATE_ACCEPTANCE.md", "line": 12, "snippet": "the nomenclature card is explicitly not accepted..." }
    }
  ],

  "activity": {
    "lastDocDate": "2026-07-05",            // max ISO date found in docs prose
    "lastDocMtime": "2026-07-05T22:10:00",  // max filesystem mtime of scanned docs
    "lastCommit": { "hash": "f6c44bd", "subject": "Document editor card IA feedback", "date": "2026-07-05" }, // from git if repo
    "currentBranch": "phase-4-7/checkpoint-ui-state-acceptance",
    "expectedBranch": "phase-4-7/checkpoint-ui-state-acceptance", // branch named in active phase status
    "branchMatchesActivePhase": true
  },

  "counts": {                               // for dashboard cards
    "phases": { "total": 13, "closed": 4, "accepted": 1, "inProgress": 1, "pendingAcceptance": 2, "planned": 5, "deferred": 1 },
    "openWorkItems": 3,
    "openDecisions": 4,
    "activeHandoffs": 0,
    "openAuditFindings": 2
  },

  "phases": [ /* Phase[] */ ],
  "workItems": [ /* WorkItem[] — flattened from phase plans */ ],
  "decisions": [ /* Decision[] */ ],
  "handoffs": [ /* Handoff[] */ ],
  "audits": [ /* AuditDoc[] */ ],
  "specs": [ /* SpecChange[] — openspec profile only */ ],
  "risks": [ /* Risk[] — from Risks sections and audit findings */ ],
  "docs": [ /* DocFile[] — inventory with purpose from README table */ ],
  "warnings": [ "docs/00_FILE_STRUCTURE.md missing", "CLAUDE.md points to stale handoff" ]
}
```

## Phase

```jsonc
{
  "id": "4.7",
  "name": "Checkpoint UI State And Acceptance",
  "sourceFile": "docs/ROADMAP.md",
  "detailPlanFile": "docs/phases/PHASE_4_7_CHECKPOINT_UI_STATE_ACCEPTANCE.md",
  "statusText": "in progress on `phase-4-7/checkpoint-ui-state-acceptance`; work items 4.7.1 through 4.7.4 ...",
  "status": "in_progress",                   // phase-status-audit lifecycle value
  "branch": "phase-4-7/checkpoint-ui-state-acceptance",
  "goal": "finish the employee-facing checkpoint workflow...",
  "lastMentionedDate": "2026-07-04",
  "humanGates": [
    { "text": "Merge to `main` requires explicit human approval", "satisfied": false }
  ],
  "qualityGateItems": [ { "text": "real-upload session routes are refresh/new-tab safe", "state": "unknown" } ],
  "order": 11                                // position in roadmap for sorting (4.7 > 4.6 etc.)
}
```

## WorkItem

```jsonc
{
  "id": "4.7.5",
  "phaseId": "4.7",
  "name": "Rebuild Nomenclature Card UX/UI",
  "sourceFile": "docs/phases/PHASE_4_7_CHECKPOINT_UI_STATE_ACCEPTANCE.md",
  "state": "open",                           // open | in_progress | done | transferred | superseded | blocked
  "stateEvidence": "Resume after 4.7.6. Human owner has rejected the current card...",
  "owner": "agent",                          // agent | codex | claude | human | unknown
  "requiresHuman": true,
  "commit": null,                            // "fdde4d3" when completion commit is cited
  "lastMentionedDate": "2026-07-04"
}
```

## Decision

```jsonc
{
  "date": "2026-07-04",
  "text": "Phase 4.8 runs after checkpoint backend work and before Phase 5",
  "kind": "human_decision",                  // human_decision | product_decision | rejection | adr | openspec_proposal
  "sourceFile": "docs/ROADMAP.md",
  "line": 32,
  "open": false                              // true when phrased as pending ("must decide", "blocking question")
}
```

## Handoff

```jsonc
{
  "file": "docs/handoffs/HANDOFF_2026-06-19_phase-4-5-ui.md",
  "topic": "Phase 4.5.10 Real-Data UI Tuning",
  "date": "2026-06-19",
  "status": "archived_stale",                // active | done | archived_stale | unknown
  "resultNote": "migrated out of CLAUDE.md on 2026-07-06...",
  "referencedFromClaudeMd": false            // true + status!=active => "stale pointer" warning
}
```

## AuditDoc

```jsonc
{
  "file": "docs/audits/NORMALIZATION_ACCEPTANCE_GAP_2026-06-20.md",
  "date": "2026-06-20",
  "title": "Normalization Acceptance Gap",
  "kind": "acceptance_gap",                  // audit | acceptance_gap | remediation
  "resolution": "transferred",               // open | closed | transferred | historical (from ROADMAP remediation tracking / "superseded by")
  "resolutionEvidence": "parser-contract work belongs to Phase 4.6 ..."
}
```

## SpecChange (openspec profile)

```jsonc
{
  "name": "add-user-auth",
  "root": ".openspec/changes/add-user-auth",
  "artifacts": { "proposal": "done", "design": "done", "tasks": "in_progress" },
  "tasksProgress": { "done": 3, "total": 9 } // from - [x] checkboxes in tasks.md
}
```

## DocFile

```jsonc
{
  "file": "docs/ROADMAP.md",
  "purpose": "Working MVP roadmap by phases and quality gates", // from docs/README.md Documents table when present
  "mtime": "2026-07-05T21:00:00",
  "sizeBytes": 48211,
  "maxDateInText": "2026-07-05"
}
```

## Notes

- `Risk` = `{ text, sourceFile, phaseId?, severity? }`, parsed from `## Risks` sections and open audit findings.
- Plain-readme projects fill only `summary`, `docs`, checkbox-derived `workItems` (from TODO.md), and `activity`; everything else stays empty and status derivation degrades gracefully (usually to `unknown` or mtime-based `active`/`stalled`).
- All file paths in the JSON are project-relative; the UI joins them with `project.path` for "open in editor" links.
