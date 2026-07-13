# Lifecycle Status And Progress Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep explicit roadmap phase statuses authoritative and stop accepted living specifications without task evidence from displaying 100% implementation progress.

**Architecture:** Add exact leading-token handling at the existing shared phase normalizer, reusing current `PhaseItem` confidence/integrity fields for contradictions while preserving legacy prose heuristics. Narrow the existing nullable specification-progress model so `accepted-capability` with zero eligible tasks remains unknown, then render the evidence-specific no-task message in the existing Specs card.

**Tech Stack:** Node.js ESM scanner, TypeScript, React, Vitest, Node test runner, OpenSpec CLI 1.4.1.

## Global Constraints

- Modify only `C:\Users\danoc\Documents\projects\projects-viewer`; every configured/scanned project remains read-only.
- Do not change the final-state meaning or 100% implementation progress of a genuinely `accepted` phase.
- Do not change `pending_acceptance` phase progress semantics in this change.
- Do not infer lifecycle or progress from dates, file order, names, or accepted requirements alone.
- Add no dependencies, configuration, cloud behavior, authentication, arbitrary paths, shell actions, or scanned-project writes.
- Use scenario-first TDD: every production behavior change must follow a witnessed RED then GREEN run.
- Use branch `codex/fix-lifecycle-status-progress-semantics` from `main` in an isolated worktree selected by `using-git-worktrees`.
- Canonical design: `docs/superpowers/specs/2026-07-13-lifecycle-status-progress-semantics-design.md`.
- Canonical evidence: `docs/audits/LIFECYCLE_STATUS_PROGRESS_AUDIT_2026-07-13.md`.

## File Structure

Create:

- `openspec/changes/fix-lifecycle-status-progress-semantics/proposal.md`: problem, scope, and affected capabilities.
- `openspec/changes/fix-lifecycle-status-progress-semantics/design.md`: parser and progress boundary decisions.
- `openspec/changes/fix-lifecycle-status-progress-semantics/specs/dashboard-state-derivation/spec.md`: exact phase-status ingestion requirements.
- `openspec/changes/fix-lifecycle-status-progress-semantics/specs/spec-work-model/spec.md`: accepted-capability progress delta.
- `openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md`: executable checklist and verification gates.

Modify:

- `scan-projects.mjs`: exact leading lifecycle token recognition and conflict evidence.
- `tests/run-scan.test.mjs`: exact affected prose regression and legacy compatibility coverage.
- `src/specs/model.ts`: accepted-capability no-task progress rule.
- `src/specs/SpecsCanvas.tsx`: evidence-specific no-task copy.
- `tests/components/spec-model.test.tsx`: accepted-capability and final-change progress coverage.
- `tests/components/specs-canvas.test.tsx`: visible/accessibility no-task state coverage.
- `docs/03-status-rules.md`: machine-readable leading-token contract and Specs progress rule.
- `docs/CURRENT_PROJECT_AUDIT.md`: implementation state, evidence, and residual source-project task.
- `docs/README.md`: active-change and completed-behavior summary when implementation is verified.

No new runtime module is needed. Both changes belong in the existing shared normalization/model boundaries.

---

### Task 1: Create The OpenSpec Change And Align The Contract

**Files:**

- Create: `openspec/changes/fix-lifecycle-status-progress-semantics/proposal.md`
- Create: `openspec/changes/fix-lifecycle-status-progress-semantics/design.md`
- Create: `openspec/changes/fix-lifecycle-status-progress-semantics/specs/dashboard-state-derivation/spec.md`
- Create: `openspec/changes/fix-lifecycle-status-progress-semantics/specs/spec-work-model/spec.md`
- Create: `openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md`

**Interfaces:**

- Consumes: approved design and dated audit named in Global Constraints.
- Produces: apply-ready OpenSpec change `fix-lifecycle-status-progress-semantics` with explicit scenarios for Tasks 2-4.

- [ ] **Step 1: Create the change scaffold and inspect schema paths**

Run:

```powershell
openspec new change "fix-lifecycle-status-progress-semantics"
openspec status --change "fix-lifecycle-status-progress-semantics" --json
```

Expected: the change root resolves under `openspec/changes/fix-lifecycle-status-progress-semantics/`; proposal is ready and tasks are listed in `applyRequires` through their dependency chain.

- [ ] **Step 2: Create proposal and design from OpenSpec instructions**

Run before each artifact:

```powershell
openspec instructions proposal --change "fix-lifecycle-status-progress-semantics" --json
openspec instructions design --change "fix-lifecycle-status-progress-semantics" --json
```

The proposal must state:

```markdown
## Why

Explicit `ready` and `planned` phase statuses are overwritten by explanatory acceptance prose, and accepted living specs without task evidence display false 100% implementation progress.

## What Changes

- Make an exact leading supported phase status authoritative.
- Expose conflicting explanatory lifecycle prose as documentation integrity evidence.
- Keep genuine accepted-phase progress semantics unchanged.
- Make accepted living-spec progress unknown without eligible tasks or explicit implementation-final evidence.

## Capabilities

### Modified Capabilities
- `dashboard-state-derivation`
- `spec-work-model`
```

The design must preserve the two data flows from the approved design and explicitly reject changes to accepted-phase and pending-acceptance phase progress.

- [ ] **Step 3: Create the two delta specs with exact scenarios**

Run before each spec artifact according to the status-reported artifact id:

```powershell
openspec status --change "fix-lifecycle-status-progress-semantics" --json
openspec instructions specs --change "fix-lifecycle-status-progress-semantics" --json
```

The dashboard-state-derivation delta must include these scenarios:

```markdown
#### Scenario: Ready phase explanation mentions an accepted decision
- **WHEN** a phase status value starts with `ready` and later prose says that a boundary or decision is accepted
- **THEN** lifecycle status remains `ready`
- **AND** conflicting final-state vocabulary is exposed as documentation integrity evidence

#### Scenario: Planned phase explanation contains negated acceptance
- **WHEN** a phase status value starts with `planned` and later prose says that a plan has not been accepted yet
- **THEN** lifecycle status remains `planned`
- **AND** the phase is not displayed as accepted or implemented

#### Scenario: Genuine accepted result remains final
- **WHEN** a phase status value starts with `accepted` and its explanation describes human acceptance of the result
- **THEN** lifecycle status remains `accepted`
- **AND** existing accepted-phase implementation-progress semantics are preserved
```

The spec-work-model delta must include:

```markdown
#### Scenario: Accepted living specification has no implementation evidence
- **WHEN** an `accepted-capability` has no eligible owned tasks and no explicit implementation-final evidence
- **THEN** its implementation progress is unknown
- **AND** the presentation reports `No tasks documented`
- **AND** it does not display `0/0` or 100 percent

#### Scenario: Explicitly final change retains final progress
- **WHEN** a closed or archived OpenSpec change has explicit final lifecycle evidence and no eligible tasks
- **THEN** the existing final-progress rule may establish 100 percent
```

- [ ] **Step 4: Create the OpenSpec task checklist**

Run:

```powershell
openspec instructions tasks --change "fix-lifecycle-status-progress-semantics" --json
```

Write tasks matching this plan:

```markdown
## 1. Phase status ingestion
- [ ] 1.1 Add RED regression coverage for exact leading ready/planned/accepted forms and integrity evidence.
- [ ] 1.2 Implement authoritative leading-token normalization while preserving legacy prose heuristics.
- [ ] 1.3 Run focused scanner tests and inspect structured phase output.

## 2. Specification progress
- [ ] 2.1 Add RED model and Canvas coverage for accepted-capability without task evidence.
- [ ] 2.2 Implement unknown progress and `No tasks documented` presentation.
- [ ] 2.3 Run focused Specs model/Canvas tests.

## 3. Reconciliation and verification
- [ ] 3.1 Update status rules, audit state, and documentation index.
- [ ] 3.2 Run full tests, build, configured rescan, browser checks, OpenSpec strict validation, and `git diff --check`.
- [ ] 3.3 Record the separate text-only source-document task for `teamSsdCli` without modifying it.
```

- [ ] **Step 5: Validate and commit the apply-ready change**

Run:

```powershell
openspec status --change "fix-lifecycle-status-progress-semantics"
openspec validate --all --strict
git diff --check
```

Expected: the new change is apply-ready; strict validation reports all items passed and zero failed.

Commit:

```powershell
git add -- openspec/changes/fix-lifecycle-status-progress-semantics
git commit -m "docs: propose lifecycle status progress fix"
```

---

### Task 2: Make Explicit Phase Status Authoritative

**Files:**

- Modify: `tests/run-scan.test.mjs`
- Modify: `scan-projects.mjs`
- Modify: `openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md`

**Interfaces:**

- Consumes: `normalizePhase(text)` and existing `PhaseItem.issue`, `issueNote`, and `confidence` fields.
- Produces: `normalizePhase(text)` result with optional `issue` and `issueNote`; phase parsing copies those fields into the existing `PhaseItem` contract.

- [ ] **Step 1: Write the failing scanner regression**

Add one focused test to `tests/run-scan.test.mjs` using a temporary roadmap with these exact status values:

```javascript
'## Phase 2. Transfer Ready',
'Status: ready. The transfer boundary is accepted, the detailed phase plan exists, and work item 2.1 is unblocked.',
'',
'## Phase 3. Pilot',
'Status: planned. A detailed phase plan has not been accepted yet.',
'',
'## Phase 4. Accepted Result',
'Status: accepted. Human accepted the implemented result.',
```

Assert:

```javascript
assert.deepEqual(
  phases.map(({ id, status }) => [id, status]),
  [['2', 'ready'], ['3', 'planned'], ['4', 'accepted']],
);
assert.equal(phases[0].issue, 'documentation');
assert.match(phases[0].issueNote, /leading status "ready"/i);
assert.equal(phases[1].issue, 'documentation');
assert.match(phases[1].issueNote, /leading status "planned"/i);
assert.equal(phases[2].issue, 'none');
assert.equal(phases[2].confidence, 'high');
```

- [ ] **Step 2: Run RED and confirm the existing misclassification**

Run:

```powershell
node --test --test-name-pattern="leading phase status" tests/run-scan.test.mjs
```

Expected: FAIL because Phases 2-3 normalize to `accepted` and do not expose documentation issues.

- [ ] **Step 3: Implement minimal leading-token handling**

In `scan-projects.mjs`, split the current heuristic body into `normalizePhaseProse(text)` and keep its existing behavior unchanged. Add an exact leading-status map:

```javascript
const LEADING_PHASE_STATUS_RE = /^(draft|planned|ready|in[_ ]progress|blocked|pending[_ ]acceptance|accepted|closed|deferred|cancelled|canceled|superseded)\b/i;

function canonicalLeadingPhaseStatus(value) {
  return value.toLowerCase().replace(' ', '_').replace('canceled', 'cancelled');
}
```

Before the generic leading-token branch, preserve the established compound final form:

```javascript
if (/^accepted and closed\b|^closed and accepted\b/i.test(text.trim())) {
  return normalizePhaseProse(text);
}
```

Then implement:

```javascript
function normalizePhase(text) {
  const raw = String(text ?? '').trim();
  const leading = raw.match(LEADING_PHASE_STATUS_RE);
  if (!leading) return normalizePhaseProse(raw);

  const status = canonicalLeadingPhaseStatus(leading[1]);
  const remainder = raw.slice(leading[0].length).replace(/^[\s.:;-]+/, '');
  const explanation = remainder ? normalizePhaseProse(remainder) : null;
  const conflicts = explanation
    && !explanation.rule.startsWith('no known status vocabulary')
    && explanation.status !== status;

  return {
    status,
    rule: `explicit leading lifecycle status "${status}"`,
    confidence: conflicts ? 'low' : 'high',
    issue: conflicts ? 'documentation' : 'none',
    issueNote: conflicts
      ? `The leading status "${status}" is authoritative, but explanatory prose also suggests "${explanation.status}".`
      : null,
  };
}
```

When applying the normalized result to `pendingPhase`, copy the optional integrity fields:

```javascript
pendingPhase.issue = norm.issue ?? pendingPhase.issue;
pendingPhase.issueNote = norm.issueNote ?? pendingPhase.issueNote;
```

- [ ] **Step 4: Run GREEN and the full scanner regression file**

Run:

```powershell
node --test --test-name-pattern="leading phase status" tests/run-scan.test.mjs
node --test tests/run-scan.test.mjs tests/phase-progress.test.mjs
```

Expected: the focused regression passes; the scanner/progress files report zero failures. Existing `accepted and closed`, legacy completion, approval, and all allowed lifecycle mappings remain green.

- [ ] **Step 5: Inspect structured regression output and commit**

Add no diagnostic production logging. Use test assertions as the structured item-by-item consumer evidence, then mark OpenSpec tasks 1.1-1.3 complete.

Commit:

```powershell
git add -- scan-projects.mjs tests/run-scan.test.mjs openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md
git commit -m "fix: preserve explicit phase lifecycle status"
```

---

### Task 3: Make Accepted Living-Spec Progress Evidence-Based

**Files:**

- Modify: `tests/components/spec-model.test.tsx`
- Modify: `tests/components/specs-canvas.test.tsx`
- Modify: `src/specs/model.ts`
- Modify: `src/specs/SpecsCanvas.tsx`
- Modify: `openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md`

**Interfaces:**

- Consumes: `RawSpecWorkItem.kind`, nullable `SpecWorkItemModel.progress`, and existing task arrays.
- Produces: `progressOf(accepted-capability with no eligible tasks) === null`; visible no-task evidence in Specs Canvas.

- [ ] **Step 1: Write the failing pure-model tests**

In `tests/components/spec-model.test.tsx`, add a fixture containing:

```typescript
{
  key: 'fixture:accepted-capability',
  id: 'accepted-capability',
  name: 'Accepted capability',
  kind: 'accepted-capability',
  lifecycleStatus: 'accepted',
  confidence: 'high',
  source: { file: 'openspec/specs/accepted-capability/spec.md', line: 1 },
  sourceScopeId: 'openspec/specs',
  groupId: null,
  tasks: [],
  dependsOnIds: [],
}
```

Also add a taskless final change:

```typescript
{
  key: 'fixture:closed-change',
  id: 'closed-change',
  name: 'Closed change',
  kind: 'openspec-change',
  lifecycleStatus: 'closed',
  confidence: 'high',
  source: { file: 'openspec/changes/closed-change/proposal.md', line: 1 },
  sourceScopeId: 'openspec/changes',
  groupId: null,
  tasks: [],
  dependsOnIds: [],
}
```

Assert:

```typescript
expect(model.specifications.find((item) => item.id === 'accepted-capability')?.progress).toBeNull();
expect(model.specifications.find((item) => item.id === 'closed-change')?.progress).toMatchObject({ percent: 100, completed: 0, total: 0 });
expect(model.progress.unknown).toBe(1);
```

- [ ] **Step 2: Write the failing Canvas presentation test**

In `tests/components/specs-canvas.test.tsx`, render one accepted capability with no tasks and assert:

```typescript
const card = screen.getByTestId(/spec-card-/);
expect(within(card).getByText('No tasks documented')).toBeInTheDocument();
expect(within(card).queryByText('0/0 tasks')).not.toBeInTheDocument();
expect(within(card).queryByText('100%')).not.toBeInTheDocument();
expect(screen.getByRole('button', { name: /Accepted capability, accepted, progress unknown, 0 tasks/i })).toBeInTheDocument();
```

- [ ] **Step 3: Run RED and confirm both current failures**

Run:

```powershell
npx vitest run tests/components/spec-model.test.tsx tests/components/specs-canvas.test.tsx
```

Expected: FAIL because the accepted capability receives `{ percent: 100, completed: 0, total: 0 }` and the card renders `0/0 tasks` plus `100%`.

- [ ] **Step 4: Implement the narrow model and copy changes**

In `src/specs/model.ts`, change only the empty eligible-task branch:

```typescript
if (eligible.length === 0) {
  if (item.kind === 'accepted-capability') return null;
  return FINAL.has(item.lifecycleStatus) ? { percent: 100, completed: 0, total: 0 } : null;
}
```

In `src/specs/SpecsCanvas.tsx`, replace the generic null-progress copy with evidence-specific copy:

```tsx
{item.progress ? (
  // existing progress markup unchanged
) : (
  <span className="mt-3 block text-xs text-faint">
    {item.tasks.length === 0 ? 'No tasks documented' : 'Progress unknown'}
  </span>
)}
```

Keep the accessible name's existing `progress unknown` wording.

- [ ] **Step 5: Run GREEN and focused Specs coverage**

Run:

```powershell
npx vitest run tests/components/spec-model.test.tsx tests/components/specs-canvas.test.tsx tests/components/spec-geometry.test.tsx
node --test tests/spec-work-scan.test.mjs
```

Expected: all selected files pass; accepted capability stays lifecycle `accepted`, has null progress, and taskless closed change retains 100%.

- [ ] **Step 6: Mark tasks and commit**

Mark OpenSpec tasks 2.1-2.3 complete.

Commit:

```powershell
git add -- src/specs/model.ts src/specs/SpecsCanvas.tsx tests/components/spec-model.test.tsx tests/components/specs-canvas.test.tsx openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md
git commit -m "fix: keep no-task capability progress unknown"
```

---

### Task 4: Reconcile Documentation And Run Final Acceptance

**Files:**

- Modify: `docs/03-status-rules.md`
- Modify: `docs/CURRENT_PROJECT_AUDIT.md`
- Modify: `docs/README.md`
- Modify: `openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md`

**Interfaces:**

- Consumes: verified Tasks 2-3 behavior and the current configured-project API.
- Produces: complete OpenSpec task evidence, synchronized project docs, and a final text-only task for `teamSsdCli` in the session report.

- [ ] **Step 1: Update canonical status documentation**

Add these rules to `docs/03-status-rules.md`:

```markdown
Machine-readable precedence:

- When a `Status:` value starts with one exact allowed lifecycle value, that leading value is authoritative.
- Explanatory decision, dependency, or acceptance prose must not replace the leading lifecycle.
- Conflicting later lifecycle vocabulary creates a documentation integrity warning and reduces confidence.
- `accepted-capability` identifies an accepted living specification, not implementation completion; without eligible tasks or explicit implementation-final evidence, progress is unknown and the UI reports `No tasks documented`.
```

Do not duplicate the full OpenSpec scenarios in this file; link the active change as canonical proposed behavior until archival.

- [ ] **Step 2: Update current-state documentation**

In `docs/CURRENT_PROJECT_AUDIT.md`, record:

- parser and Specs findings implemented and verified;
- exact focused/full commands and counts from fresh output;
- configured-project rescan result;
- any remaining ambiguity or browser limitation;
- `teamSsdCli` was not modified and requires a separate source-doc task.

In `docs/README.md`, add the active change and concise implemented behavior without claiming archive/sync completion.

- [ ] **Step 3: Run full automated and build gates**

Run:

```powershell
npm test
npm run build
```

Expected: Node and Vitest suites report zero failures; TypeScript and Vite production build exit successfully.

- [ ] **Step 4: Run a fresh configured-project rescan and inspect every target item**

Run:

```powershell
Invoke-RestMethod -Method Post 'http://127.0.0.1:5173/api/rescan'
```

Poll `GET /api/scan-status` until `status=success` and `queued=false`, respecting the existing 30-second throttle rather than issuing repeated rescans.

Then inspect `teamssdcli` from `GET /api/projects` and require:

```text
Phase 0 closed
Phase 1 closed
Phase 2 ready with documentation integrity warning
Phase 3 planned with documentation integrity warning
Phase 4 planned with documentation integrity warning
overall roadmap progress 40%
accepted living specs with zero tasks: progress unknown
```

If the long-running server still serves old code, restart it from the implementation worktree before accepting the evidence.

- [ ] **Step 5: Verify the local browser**

At `http://127.0.0.1:5173`, select `teamSsdCli` and verify:

- header no longer says `Phase 4 accepted`;
- Roadmap shows 2 closed, 1 ready, 2 planned;
- implementation progress shows 40%;
- Phases 2-4 expose integrity warnings and no resolved checkmarks;
- Specs cards for accepted living specs say `No tasks documented`, expose progress unknown accessibly, and show neither `0/0` nor `100%`;
- no console errors or warnings were introduced.

The browser and API remain read-only with respect to `teamSsdCli`.

- [ ] **Step 6: Run final OpenSpec and repository gates**

Run:

```powershell
openspec list
openspec list --specs
openspec validate --all --strict
git diff --check
git status --short
```

Expected: the new change is complete, accepted specs remain listed, strict validation reports zero failures, diff check is clean, and only intentional files are modified.

- [ ] **Step 7: Complete tasks, commit, and prepare handoff**

Mark OpenSpec tasks 3.1-3.3 complete only after the evidence above exists.

Commit:

```powershell
git add -- docs/03-status-rules.md docs/CURRENT_PROJECT_AUDIT.md docs/README.md openspec/changes/fix-lifecycle-status-progress-semantics/tasks.md
git commit -m "docs: verify lifecycle status progress fix"
```

The final session report must include a plain-text `teamSsdCli` task containing exact source lines to change and the required post-rescan expected matrix, but must not create or edit any file in that repository.
