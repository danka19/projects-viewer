# Evidence Audit Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make substantial evidence-based verification sessions produce durable audits and an explicit remediation-task decision, then record the current Projects Viewer API/UX findings without duplicating existing OpenSpec scope.

**Architecture:** A new personal `evidence-audit` skill owns the reusable audit workflow; `session-report` contains only a conditional completion check and reference. In Projects Viewer, one dated audit owns observed evidence, the existing `harden-mcp-context-api` change continues to own the API fallback fix, and one new OpenSpec change owns scanner/search trust remediation. Roadmap and current-state docs link to those canonical sources.

**Tech Stack:** Markdown skills, Python skill validators, OpenSpec CLI, Git, Projects Viewer documentation.

## Global Constraints

- Create durable audits only for substantial checks that define several criteria or produce findings, risks, acceptance evidence, or product-quality judgments.
- Do not create external tasks or remediation scope from a read-only audit unless the human authorizes it.
- Do not duplicate requirements already owned by `harden-mcp-context-api` or completed dashboard-search/state changes; reference and extend the correct canonical artifact.
- Project documentation is English; user-facing reports are Russian.
- Scanned projects remain read-only inputs.

---

### Task 1: Create And Validate The Reusable Evidence Audit Skill

**Files:**
- Create: `C:\Users\danoc\.codex\skills\evidence-audit\SKILL.md`
- Create: `C:\Users\danoc\.codex\skills\evidence-audit\agents\openai.yaml`
- Modify: `C:\Users\danoc\.codex\skills\session-report\SKILL.md`

**Interfaces:**
- Consumes: approved workflow design in `docs/superpowers/specs/2026-07-12-evidence-audit-workflow-design.md`.
- Produces: a discoverable `evidence-audit` skill and a non-duplicating `session-report` completion hook.

- [x] **Step 1: Record the baseline failure**

Use the 2026-07-12 session evidence: the substantial API/UX verification defined criteria and produced confirmed findings, but initially ended with only a chat report, no dated audit artifact, and no explicit offer to create remediation tasks.

- [x] **Step 2: Initialize the skill**

Run:

```powershell
python C:\Users\danoc\.codex\skills\.system\skill-creator\scripts\init_skill.py evidence-audit --path C:\Users\danoc\.codex\skills --interface "display_name=Evidence Audit" --interface "short_description=Create durable evidence-based audit records" --interface "default_prompt=Use $evidence-audit to define criteria, verify findings, and record a substantial audit."
```

Expected: `evidence-audit/SKILL.md` and `evidence-audit/agents/openai.yaml` are created with valid names and no unused resource folders.

- [x] **Step 3: Replace the generated skill body with the approved workflow**

The skill must define the substantial-audit trigger, criteria/evidence workflow, canonical audit ownership, duplicate search, finding fields, read-only authorization boundary, remediation question, and explicit exception when remediation is already authorized. Keep the skill concise and place no project-specific findings in it.

- [x] **Step 4: Add the session-report hook**

Add one conditional rule to `session-report`: when a session performed a substantial audit, require `evidence-audit`, name the durable audit file in the final report, and include the remediation decision or question. Do not copy the audit workflow into `session-report`.

- [x] **Step 5: Validate both skill folders**

Run:

```powershell
python C:\Users\danoc\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\danoc\.codex\skills\evidence-audit
python C:\Users\danoc\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\danoc\.codex\skills\session-report
```

Expected: both commands report valid skills. Inspect `agents/openai.yaml` to confirm it matches the final skill. Record the later-authorized fresh-agent behavioral cycle: the first replay supplied RED evidence by omitting the explicit remediation question, the skill wording was refactored, and the second replay supplied GREEN evidence by creating the durable audit, preserving the authorization boundary, and ending with the required remediation question.

### Task 2: Write The Durable Projects Viewer Audit

**Files:**
- Create: `docs/audits/API_UX_TRUST_AUDIT_2026-07-12.md`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: fresh API matrix, `npm test`, build, browser, responsive, console, scanner, and search evidence from the 2026-07-12 verification.
- Produces: the canonical record of criteria, evidence, confirmed findings, positive results, scope limits, and remediation routing.

- [x] **Step 1: Search existing audit and plan coverage**

Run focused `rg` searches for the HTML API fallback, false blocker extraction, false next actions, and invisible search-match context across `docs/audits`, `docs/planning`, `docs/ROADMAP.md`, and `openspec/changes`.

Expected: the API fallback maps to `harden-mcp-context-api`; the exact checked-task, cross-line OpenSpec conditional, and match-visibility findings have no existing remediation owner.

- [x] **Step 2: Write the audit**

Include scope, criteria, environment, exact commands/evidence, 198/198 test result, successful build, API matrix, no-side-effect hashes, desktop/dark/mobile checks, 390 px overflow measurement, console result, four confirmed findings with severity and root cause, limitations, and remediation routing. Reference existing docs instead of copying their requirements.

- [x] **Step 3: Add the audit to the documentation index**

Add one row to `docs/README.md` describing the audit as the evidence source for API boundary, scanner trust, search explanation, usability, and responsive checks.

- [x] **Step 4: Commit the audit record**

Run:

```powershell
git add docs/audits/API_UX_TRUST_AUDIT_2026-07-12.md docs/README.md
git commit -m "docs: record API and UX trust audit"
```

Expected: one documentation commit with no product behavior changes.

### Task 3: Propose The Non-Duplicating Scanner And Search Trust Change

**Files:**
- Create: `openspec/changes/improve-dashboard-evidence-trust/.openspec.yaml`
- Create: OpenSpec artifacts under `openspec/changes/improve-dashboard-evidence-trust/` as resolved by the CLI.

**Interfaces:**
- Consumes: `API_UX_TRUST_AUDIT_2026-07-12.md`, `harden-dashboard-state-derivation`, `improve-dashboard-search-navigation`, and `harden-mcp-context-api`.
- Produces: proposal, design, delta specs, and executable tasks for scanner and search trust only.

- [x] **Step 1: Create and inspect the change scaffold**

Run:

```powershell
openspec new change "improve-dashboard-evidence-trust"
openspec status --change "improve-dashboard-evidence-trust" --json
```

Expected: a repo-local change root and artifact order from the configured OpenSpec schema.

- [x] **Step 2: Generate artifacts in CLI dependency order**

For each ready artifact, run `openspec instructions <artifact-id> --change "improve-dashboard-evidence-trust" --json`, follow the returned template, and re-run status. The change must require:

- checked `[x]` tasks never become live blockers;
- cross-line OpenSpec `WHEN`/`THEN` normative scenarios remain diagnostic/spec context rather than live project blockers;
- headings or explanatory text containing `next-action` terminology or embedded marker examples do not become current next actions without active-work semantics;
- search results expose the matching fragment or otherwise make the query-to-result relationship visible;
- duplicate representations of identical evidence remain deduplicated;
- regression fixtures use the real 2026-07-12 false-positive shapes;
- the API fallback remains owned only by `harden-mcp-context-api` and is referenced, not respecified.

- [x] **Step 3: Write implementation tasks**

Tasks must include RED/GREEN scanner fixtures, search model/component fixtures, real-project rescan evidence, focused/full tests, browser verification, audit/current-state updates, and OpenSpec validation. Do not mark implementation tasks complete.

- [x] **Step 4: Confirm apply-ready status**

Run:

```powershell
openspec status --change "improve-dashboard-evidence-trust"
```

Expected: all artifacts required for apply are complete and implementation tasks remain unchecked.

### Task 4: Link The Change Into Roadmap And Current State Without Duplication

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/CURRENT_PROJECT_AUDIT.md`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: dated audit and completed OpenSpec proposal artifacts.
- Produces: one Phase 4 roadmap slice, current-state risk summary, and active-change index entries that link to canonical details.

- [x] **Step 1: Add the Phase 4 roadmap slice**

Add one bullet for `improve-dashboard-evidence-trust`, ordered after `harden-mcp-context-api`, stating that it restores scanner/search evidence trust and linking to the dated audit. Do not repeat scenarios or implementation tasks.

- [x] **Step 2: Update current-state indexes**

Add the new OpenSpec change to `docs/README.md`. Add a concise dated audit/risk entry to `docs/CURRENT_PROJECT_AUDIT.md` that links to the audit and names the two remediation owners: existing API hardening and new evidence-trust change.

- [x] **Step 3: Run a duplicate-content audit**

Use `rg` to inspect repeated exact finding sentences and requirement language across the new audit, roadmap, current audit, README, and OpenSpec. Keep detailed observations in the audit, normative behavior in OpenSpec, and links/status only elsewhere.

- [x] **Step 4: Validate documentation and OpenSpec**

Run:

```powershell
openspec list
openspec list --specs
openspec validate --all --strict
git diff --check
git status --short --branch
```

Expected: strict validation passes, no whitespace errors, and only intentional documentation/OpenSpec files are modified.

- [x] **Step 5: Commit the proposal and project documentation**

Run:

```powershell
git add openspec/changes/improve-dashboard-evidence-trust docs/ROADMAP.md docs/CURRENT_PROJECT_AUDIT.md docs/README.md
git commit -m "docs: propose dashboard evidence trust hardening"
```

Expected: the new change is apply-ready, roadmap-linked, and no implementation is claimed.

### Task 5: Final Verification And Report

**Files:**
- Verify: all files changed by Tasks 1–4.

**Interfaces:**
- Consumes: validated skills and committed project documentation.
- Produces: evidence-backed completion report and clean tracked working tree.

- [x] **Step 1: Re-run skill and project validation**

Run both `quick_validate.py` commands, `openspec validate --all --strict`, `git diff --check`, and `git status --short --branch`.

Expected: both skills valid, OpenSpec strict validation successful, no diff errors, clean tracked working tree.

- [x] **Step 2: Verify canonical ownership**

Confirm the audit owns observations, `harden-mcp-context-api` owns the API fallback fix, `improve-dashboard-evidence-trust` owns scanner/search remediation, and roadmap/current docs contain only status plus links.

- [x] **Step 3: Report remaining limitations**

Report the completed fresh-agent RED → wording refactor → GREEN forward-test cycle, including the durable audit, preserved authorization boundary, and explicit remediation question demonstrated by the GREEN replay. State separately that no product defect implementation was performed. End with the recommended next action: apply `improve-dashboard-evidence-trust`, while `harden-mcp-context-api` remains the API prerequisite.
