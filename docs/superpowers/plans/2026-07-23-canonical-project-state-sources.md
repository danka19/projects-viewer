# Canonical Project-State Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive Project View blockers and current phase from current canonical documentation sources and prevent superseded/historical evidence from affecting live state.

**Architecture:** Keep document discovery read-only, then apply a single source-policy predicate before blocker/gate classification. Phase parsing retains all general documentation metadata but `summary.currentPhase` receives only phases from roadmap documents. Quality-only supersession evidence is emitted as diagnostics rather than a live constraint.

**Tech Stack:** Node.js ESM scanner, `node:test`, OpenSpec.

## Global Constraints

- Scanned projects remain read-only inputs; only `app-data/` output may be written.
- Live blockers may originate only in `ROADMAP.md`, non-archived `openspec/changes/<change-id>/`, or `docs/BUGS.md`.
- `docs/archive/**`, `openspec/changes/archive/**`, audits, evidence, and plans never affect live state.
- Do not infer a blocker from a standalone `blocked` word.
- Superseded work is ineligible for progress and constraints; a missing replacement is quality evidence only.
- `summary.currentPhase` is the first unfinished phase in roadmap order and preserves its roadmap lifecycle; it is null only when every roadmap phase is final.

---

### Task 1: Encode canonical blocker-source and explicit-blocker policy

**Files:**
- Modify: `scan-projects.mjs:130-200, 480-610, 850-930`
- Test: `tests/scan-trust.test.mjs`

**Interfaces:**
- Produces: `isCanonicalLiveStateSource(doc): boolean` and `isExplicitCurrentBlocker(text): boolean` local scanner helpers.
- Consumes: document `file`, `category`, and active OpenSpec path identity already supplied to `parseDoc`.

- [ ] **Step 1: Write failing tests**

```js
test('only canonical current sources create real blockers', async () => {
  const project = await scanFixture('canonical-blockers', {
    'docs/ROADMAP.md': '# Roadmap\n\n- Release is blocked by the signing key.\n',
    'docs/archive/old.md': '- Deployment is blocked by historic credentials.\n',
    'docs/audits/evidence.md': '- Audit is blocked by old evidence.\n',
    'docs/plans/release.md': '- Current release is blocked by planning text.\n',
    'openspec/changes/archive/old/proposal.md': '- Import is blocked historically.\n',
    'openspec/changes/live/proposal.md': '- Import is blocked by the active migration.\n',
    'docs/BUGS.md': '- BUG-1: Export is blocked by a reproducible crash.\n',
  });
  assert.deepEqual(project.signalGroups.realBlockers.map((item) => item.file).sort(), [
    'docs/BUGS.md', 'docs/ROADMAP.md', 'openspec/changes/live/proposal.md',
  ]);
});

test('technical invariant and historical quotation with blocked do not create a blocker', async () => {
  const project = await scanFixture('non-explicit-blockers', {
    'docs/ROADMAP.md': [
      '# Roadmap', '',
      '- Invariant: blocked phases retain their status until evidence changes.',
      '> "The old release was blocked by signing credentials."',
    ].join('\n'),
  });
  assert.equal(project.signalGroups.realBlockers.length, 0);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test --test-concurrency=1 tests/scan-trust.test.mjs`  
Expected: the new source-boundary assertions fail because the scanner still evaluates plans/audits/archives and invariant wording.

- [ ] **Step 3: Write minimal implementation**

```js
function isCanonicalLiveStateSource(doc) {
  const file = doc.file.toLowerCase();
  return doc.category === 'roadmap'
    || file === 'docs/bugs.md'
    || (/^openspec\/changes\/[^/]+\//.test(file) && !file.startsWith('openspec/changes/archive/'));
}

function isExplicitCurrentBlocker(text) {
  return /\b(?:is|are|remains?)\s+blocked\s+by\b|\bcannot continue\b|\bbug prevents progress\b/i.test(text)
    && !/\b(?:invariant|historical|formerly|old release)\b|^>/.test(text);
}
```

Call the policy predicate before `classifyBlockedGatedCandidate` can create a live signal. Keep noncanonical candidates diagnostic-only and permit a `realBlockers` signal only when `isExplicitCurrentBlocker` is true.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test --test-concurrency=1 tests/scan-trust.test.mjs`  
Expected: PASS with all existing trust scenarios and the new canonical-source cases.

- [ ] **Step 5: Commit**

```powershell
git add scan-projects.mjs tests/scan-trust.test.mjs
git commit -m "fix: restrict live blocker sources"
```

### Task 2: Preserve supersession as quality-only evidence

**Files:**
- Modify: `scan-projects.mjs:850-930, 1370-1450`
- Test: `tests/scan-trust.test.mjs`

**Interfaces:**
- Produces: a scanner diagnostic with `includedInProjectStatus: false` for superseded work without a replacement reference.
- Consumes: lifecycle normalization and existing `blockedGatedDiagnostics` output.

- [ ] **Step 1: Write failing test**

```js
test('superseded work is never a live constraint and missing replacement is quality-only', async () => {
  const project = await scanFixture('superseded-quality', {
    'docs/ROADMAP.md': [
      '# Roadmap', '',
      '- Previous migration is superseded.',
      '- [ ] Replacement migration is blocked by the active key rotation.',
    ].join('\n'),
  });
  assert.equal(project.signalGroups.realBlockers.length, 1);
  assert.match(project.summary.mainBlocker, /active key rotation/);
  assert.ok(project.blockedGatedDiagnostics.filteredProcessPolicies.some(
    (item) => /superseded.*replacement/i.test(item.reason),
  ));
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `node --test --test-concurrency=1 tests/scan-trust.test.mjs`  
Expected: FAIL because a superseded line is not yet emitted as quality-only diagnostic with a replacement check.

- [ ] **Step 3: Write minimal implementation**

```js
const SUPERSEDED_WITHOUT_REPLACEMENT_RE = /\bsuperseded\b/i;
const REPLACEMENT_REFERENCE_RE = /\b(?:replaced by|replacement:|superseded by)\b/i;

function supersessionDiagnostic(text, candidate) {
  if (!SUPERSEDED_WITHOUT_REPLACEMENT_RE.test(text) || REPLACEMENT_REFERENCE_RE.test(text)) return null;
  return {
    ...candidate,
    classification: 'process_policy',
    includedInProjectStatus: false,
    confidence: 'medium',
    reason: 'superseded work lacks a replacement reference; quality warning only',
  };
}
```

Apply this before live work-signal creation so superseded wording cannot enter constraints or a progress denominator.

- [ ] **Step 4: Run test to verify GREEN**

Run: `node --test --test-concurrency=1 tests/scan-trust.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add scan-projects.mjs tests/scan-trust.test.mjs
git commit -m "fix: keep superseded evidence advisory"
```

### Task 3: Restrict current phase to roadmap evidence and finalize contracts

**Files:**
- Modify: `scan-projects.mjs:1289-1325`
- Modify: `openspec/specs/dashboard-state-derivation/spec.md`
- Modify: `openspec/specs/dashboard-evidence-trust/spec.md`
- Test: `tests/scan-trust.test.mjs`

**Interfaces:**
- Produces: `summary.currentPhase` from the first unfinished phase whose `file` is a roadmap document.
- Consumes: parsed `acc.phases` and source categories from `docs`.

- [ ] **Step 1: Write failing test**

```js
test('ScanLab-style roadmap selects the first blocked unfinished phase', async () => {
  const project = await scanFixture('scanlab-current-phase', {
    'docs/ROADMAP.md': [
      '# Roadmap', '',
      '## Phase 3. Closed work', '', 'Status: closed.', '',
      '## Phase 4. Review and export', '', 'Status: blocked.', '',
      '## Phase 5. Later work', '', 'Status: blocked.', '',
    ].join('\n'),
    'docs/plans/legacy.md': '# Phase 9 - Historical\n\nStatus: in progress.\n',
  });
  assert.equal(project.summary.currentPhase, '4 Review and export');
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `node --test --test-concurrency=1 tests/scan-trust.test.mjs`  
Expected: FAIL because a blocked roadmap phase currently produces `null`.

- [ ] **Step 3: Write minimal implementation and OpenSpec deltas**

```js
const roadmapFiles = new Set((docs ?? []).filter((doc) => doc.category === 'roadmap').map((doc) => doc.file));
const FINAL_PHASE_STATUSES = new Set(['accepted', 'closed', 'cancelled', 'superseded']);
const currentPhase = acc.phases.find(
  (phase) => roadmapFiles.has(phase.file) && !FINAL_PHASE_STATUSES.has(phase.status),
) ?? null;
```

Add OpenSpec scenarios that codify the source whitelist, bare-word exclusion, superseded quality warning, and roadmap-only phase derivation.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `node --test --test-concurrency=1 tests/scan-trust.test.mjs tests/run-scan.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Run complete verification and commit**

```powershell
npm test
npm run build
openspec validate --all --strict
node "$env:USERPROFILE\.codex\skills\roadmap-openspec-validator\scripts\validate-roadmap-openspec.mjs" --root "C:\Users\danoc\Documents\projects\projects-viewer"
git diff --check
git add scan-projects.mjs tests/scan-trust.test.mjs openspec docs
git commit -m "fix: derive project state from canonical sources"
```
