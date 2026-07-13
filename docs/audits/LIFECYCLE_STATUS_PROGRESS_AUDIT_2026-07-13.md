# Lifecycle Status And Progress Semantics Audit

Status: verification complete; three defects are confirmed and remediation is pending human authorization.

Date: 2026-07-13 (Asia/Vladivostok).

## Boundary And Outcome

This audit checks how Projects Viewer interprets roadmap phases and specification work for the configured read-only project `teamSsdCli`. It compares the global phase-status workflow contract, the scanned source documentation, Projects Viewer parser and progress code, OpenSpec/design intent, focused automated tests, structured local API output, and the rendered local dashboard.

The audit confirms that the screenshots do not represent the intended `teamSsdCli` lifecycle:

- source documentation says Phases 2-4 are `ready`, `planned`, and `planned`;
- the scanner/API instead emits all three as `accepted`;
- the timeline deliberately treats `accepted` as resolved implementation and therefore displays all three at 100%;
- the project summary consequently reports `Phase 4 accepted` and 100% implementation despite 31 unchecked OpenSpec tasks and Phase 2 work item 2.1 not having started;
- Specs Canvas separately treats every accepted OpenSpec living spec with zero owned tasks as `0/0 tasks` and 100%, even though the approved design also says a specification without tasks has unknown progress.

This was a diagnostic and documentation session. No scanner, model, UI, OpenSpec, or scanned-project source was changed.

## Criteria And Classification

The evaluation criteria were:

1. lifecycle terms agree with the global `phase-status-audit` contract;
2. machine-readable `Status:` lines have one unambiguous primary lifecycle value;
3. scanner output agrees item-by-item with the source roadmap and detailed phase plan;
4. progress represents implementation evidence rather than plan or requirement acceptance;
5. structured API output and rendered UI agree without silently hiding parser/integrity issues;
6. OpenSpec, design notes, implementation, and tests describe the same behavior.

Results use these classifications:

- **Confirmed defect:** directly reproduced with source, implementation, and runtime evidence.
- **Verified limitation:** a proven boundary or ambiguity that is not by itself classified as a defect.
- **Pass:** exercised behavior meets the criterion.
- **Unverified suspicion:** plausible but not established.

Severity expresses state-trust impact:

- **high:** materially misstates whether work is implemented or ready;
- **medium:** makes lifecycle/progress evidence ambiguous or hides integrity problems;
- **low:** limited presentation or maintenance impact.

## Canonical Lifecycle Contract

The global `phase-status-audit` skill defines the relevant states as follows:

| Status | Canonical meaning |
|---|---|
| `planned` | Accepted as intended work, but not ready to start |
| `ready` | Unblocked and ready to start |
| `in_progress` | Actively being worked |
| `pending_acceptance` | Implementation or planning is ready for human review, but not accepted |
| `accepted` | Human accepted the result or decision |
| `closed` | Accepted and fully reconciled in docs/specs/checklists/PR state |

The same skill requires exact machine-readable syntax when a consumer exists and explicitly warns against putting conflicting lifecycle vocabulary on the same status line. Dependency or decision acceptance must be placed on a separate line so it cannot override the declared phase status.

Practical consequence: a phase that has been accepted **for future implementation** is `planned`; if it is unblocked and may start, it is `ready`. The lifecycle value `accepted` is not the synonym for “approved to implement.”

## Environment And Reproducible Evidence

- Projects Viewer repository: `C:\Users\danoc\Documents\projects\projects-viewer`
- Projects Viewer branch/commit during audit: `main` at `295185e`
- Scanned project: `C:\Users\danoc\Documents\projects\teamSsdCli`
- Scanned project branch/commit: `codex/phase-2-transfer-readiness-plan` at `c6957dc`
- Local URL: `http://127.0.0.1:5173`
- Scan status: `success`, startup scan at `2026-07-13T07:14:03.196Z`, 318 scanned files, 150 skipped entries
- Source project working tree contained pre-existing untracked `.claude/` and `.vite/`; this audit did not modify them.

Evidence commands and surfaces included:

```powershell
git status --short
git branch --show-current
git log -10 --oneline --decorate
curl.exe -sS --max-time 5 http://127.0.0.1:5173/api/scan-status
curl.exe -sS --max-time 5 http://127.0.0.1:5173/api/configured-projects
Invoke-RestMethod http://127.0.0.1:5173/api/projects
node --test tests/run-scan.test.mjs tests/phase-progress.test.mjs tests/spec-work-scan.test.mjs
npx vitest run tests/components/spec-model.test.tsx tests/components/project-timeline.test.tsx tests/components/specs-canvas.test.tsx
```

The in-app browser then selected `teamSsdCli`, inspected Roadmap and Specs, and read the rendered accessible state. The browser showed the same statuses and percentages as the API.

Focused verification result:

| Check | Result | Classification |
|---|---|---|
| Scanner/progress/spec-work Node tests | 23/23 passed | Pass for the currently specified behavior |
| Spec model/timeline/canvas component tests | 49/49 passed | Pass for the currently specified behavior |
| Local API and rendered Roadmap | Both report 2 closed, 3 accepted, 100% implemented | Confirmed reproduction, not a correctness pass |
| Local API and rendered Specs | Eight accepted living specs show 0/0 tasks and 100% | Confirmed reproduction, not a correctness pass |

Passing tests demonstrate that the current behavior is intentional or uncovered, not that the displayed project state is correct.

## Expected Versus Actual Roadmap Matrix

The expected lifecycle comes from `teamSsdCli/docs/ROADMAP.md`, `docs/phases/PHASE_2_TRANSFER_READY_PROCESS_PACKAGE.md`, `docs/CURRENT_PROJECT_AUDIT.md`, and the 31 unchecked tasks in `openspec/changes/define-transfer-ready-process-package/tasks.md`.

| Phase | Source status | Child/work evidence | Expected progress | API/UI status | API/UI progress | Result |
|---|---|---:|---:|---|---:|---|
| 0 | `closed` | 2 closed steps | 100% | `closed` | 100% | Pass |
| 1 | `closed` | accepted Phase 1 baseline | 100% | `closed` | 100% | Pass |
| 2 | `ready` | 1 ready + 7 planned phase items; 31/31 OpenSpec tasks unchecked | 0% | `accepted` | 100% | Confirmed defect |
| 3 | `planned` | no detailed accepted phase plan; depends on accepted Phase 2 release candidate | 0% | `accepted` | 100% | Confirmed defect |
| 4 | `planned` | post-pilot work only | 0% | `accepted` | 100% | Confirmed defect |

With the current mean-of-known-phases formula, the source-backed phase values would produce 40% overall implementation progress: `(100 + 100 + 0 + 0 + 0) / 5`. The dashboard reports 100% because all five phases are first normalized to resolved statuses.

No parser or integrity issue is emitted for Phases 2-4. The UI labels them high confidence with “No integrity issue reported,” which makes the wrong state more authoritative.

## Data Flow And Verified Root Causes

```text
teamSsdCli Status: prose
  -> scan-projects.mjs readMultilineStatus/normalizePhase
  -> /api/projects PhaseItem.status
  -> phaseProgress.ts
  -> timeline model and header
  -> accepted + 100% + resolved checkmark
```

For Specs:

```text
openspec/specs/<capability>/spec.md
  -> server/spec-work.mjs forces kind=accepted-capability, lifecycle=accepted
  -> src/specs/model.ts treats accepted as FINAL
  -> zero eligible tasks becomes { completed: 0, total: 0, percent: 100 }
  -> Specs Canvas shows 0/0 tasks and 100%
```

## Findings

### STATUS-001 — Machine-readable phase status lines mix lifecycle and decision acceptance

- **Classification / severity:** confirmed documentation defect / medium.
- **Affected behavior and impact:** `teamSsdCli` declares the correct leading states but adds different acceptance vocabulary to the same `Status:` value. A free-prose consumer can therefore confuse a ready/planned phase with an accepted result.
- **Reproducible evidence:** Phase 2 says `Status: ready. The transfer boundary is accepted...`; Phases 3-4 say `Status: planned. A detailed phase plan has not been accepted yet.` The detailed Phase 2 plan likewise says `Status: ready. The human owner accepted the transfer boundary...`.
- **Verified root cause:** explanatory dependency/decision state was appended to the machine-readable lifecycle line instead of being placed under `Dependency status:`, `Decision evidence:`, or ordinary prose.
- **Residual uncertainty:** none for the affected lines.
- **Recommended next action:** in `teamSsdCli`, keep the lines exactly `Status: ready.` / `Status: planned.` and move acceptance explanations to separate fields or paragraphs. Because `teamSsdCli` is a read-only scanned input for Projects Viewer, this audit did not edit it.

### STATUS-002 — Parser overrides the declared leading status and reports high confidence

- **Classification / severity:** confirmed application defect / high.
- **Affected behavior and impact:** Projects Viewer turns Phases 2-4 into final `accepted` phases and feeds false lifecycle truth to the header, timeline, project progress, state counts, axis visuals, and accessibility text.
- **Reproducible evidence:** the source/API/UI matrix above reproduces the disagreement item by item.
- **Verified root cause:** `normalizePhase()` scans the entire status prose. It recognizes `accepted` before `ready`/`planned`; its conflict detector excludes `ready` and `planned`; and its negation only handles the exact phrase `not accepted`, not `has not been accepted`. Therefore Phase 2 matches positive `accepted`, while Phases 3-4 also match positive `accepted` despite the intervening `been`.
- **Residual uncertainty:** other prose variants may produce related false final states; this audit did not exhaust every grammar form.
- **Recommended next action:** make the exact leading lifecycle token authoritative, treat any later lifecycle vocabulary as separate explanatory evidence, and emit an integrity issue for ambiguous/conflicting prose. Add regression fixtures using the exact three `teamSsdCli` lines before changing the parser.

### STATUS-003 — Final-state progress amplifies a parser error into false completion

- **Classification / severity:** verified design coupling / high impact.
- **Affected behavior and impact:** once the scanner misclassifies a phase as `accepted`, `phaseProgress.ts` unconditionally returns 100% with `explicit-lifecycle` basis and the timeline renders a resolved checkmark. The header then describes the last false final state as `Phase 4 accepted`.
- **Reproducible evidence:** `src/phaseProgress.ts`, the Project Timeline OpenSpec, its design document, and passing focused tests all explicitly define `closed`, `accepted`, and `pending_acceptance` as 100% implementation progress.
- **Verified root cause:** this behavior was deliberately planned. It is compatible with the global skill only when `accepted` means the phase result was accepted; it is incompatible with using `accepted` to mean a plan was approved for implementation.
- **Residual uncertainty:** changing phase progress semantics is not required to correct this exact Roadmap screenshot if STATUS-001 and STATUS-002 are fixed. A broader product decision is still needed on whether `pending_acceptance` should remain 100% implementation progress.
- **Recommended next action:** preserve the canonical distinction (`planned`/`ready` for approved future work; `accepted` for accepted result) and fix status ingestion first. Consider a separate product decision only if the owner wants progress to require child evidence even for an explicit final phase status.

### STATUS-004 — Accepted living specs with no tasks display 0/0 and 100%

- **Classification / severity:** confirmed specification/design inconsistency and application defect / high.
- **Affected behavior and impact:** an accepted requirement baseline is presented as completed implementation without task evidence. This can tell the user that a capability is implemented when only its specification has been accepted.
- **Reproducible evidence:** eight `teamSsdCli` files under `openspec/specs/` render as accepted cards with `0/0 tasks` and `100%`. `server/spec-work.mjs` forces these files to `accepted`; `src/specs/model.ts` treats accepted as final and creates 100% for an empty eligible-task set.
- **Verified root cause:** the Specs OpenSpec says accepted/closed/archived evidence *may* establish 100%, while the approved design also says “Specification without tasks: show `No tasks documented`; progress remains unknown.” The implementation chose the 100% branch for all accepted living specs and does not distinguish requirement acceptance from implementation acceptance.
- **Residual uncertainty:** some repositories may intentionally use an accepted living spec as proof of implemented capability, but the scanner currently has no evidence field that establishes that meaning.
- **Recommended next action:** treat `accepted-capability` as requirement/spec acceptance, keep implementation progress unknown without eligible task or explicit implementation evidence, and display `No tasks documented` instead of `0/0 · 100%`. Reserve 100% without tasks for an explicit implementation-final signal whose evidence is visible.

## Statuses Checked And Fixed

Checked in `teamSsdCli`:

- Phases 0-4;
- Phase 2 dependency gate and work items 2.1-2.8;
- the active `define-transfer-ready-process-package` change and its 31 unchecked tasks;
- eight archived changes and eight accepted living specs shown by Specs Canvas.

No scanned-project status was changed. The correct source states already exist (`ready`, `planned`, `planned`); their machine-readable formatting and the consumer behavior need remediation.

Safe Projects Viewer documentation reconciliation performed with this audit:

- recorded this dated audit in the documentation map;
- refreshed the current repository baseline from the obsolete feature-worktree reference to `main` at `295185e`;
- normalized the clearly evidenced `improve-dashboard-evidence-trust` audit-table status from the non-contract value `implemented_verified` to `accepted` while preserving its separate unsynced/unarchived lifecycle note.

## Sequential And Parallel Work

- `teamSsdCli` Phase 2 work item 2.1 is safe to start according to its source plan: Phase 2 is `ready`, not completed.
- Work item 2.4 is safe only after 2.1 closes, per its documented parallel-after-foundation dependency.
- Phases 3-4 remain sequentially unavailable: Phase 3 requires explicit acceptance of the Phase 2 external release candidate; Phase 4 requires real pilot evidence.
- Projects Viewer remediation can proceed independently of `teamSsdCli` implementation, but source-document cleanup and parser regression coverage should land together so the dashboard becomes correct immediately and stays correct.

## Human Remediation Decision

Recommended remediation scope:

1. fix the three ambiguous `teamSsdCli` phase status lines in that repository;
2. harden Projects Viewer status parsing and integrity reporting with exact regression tests;
3. correct Specs Canvas no-task progress semantics and reconcile the contradictory design/OpenSpec text;
4. rescan and verify the expected Roadmap matrix (`closed`, `closed`, `ready`, `planned`, `planned`), 40% project implementation progress, no false final checkmarks, and unknown progress for accepted living specs without implementation evidence.

This scope changes Projects Viewer product behavior and the scanned project's documentation, so implementation requires explicit authorization and should be handled through the appropriate change-intake/OpenSpec workflow rather than silently inside this audit.
