import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts.mjs';

const statePromise = loadTsModule('timeline/state.ts');
const modelPromise = loadTsModule('timeline/model.ts');

function phase(overrides = {}) {
  return {
    id: '1',
    name: 'Phase name',
    statusText: 'Status: planned.',
    status: 'planned',
    rule: 'fixture',
    confidence: 'high',
    issue: 'none',
    issueNote: null,
    branch: null,
    steps: [],
    file: 'docs/ROADMAP.md',
    line: 10,
    ...overrides,
  };
}

function step(overrides = {}) {
  return {
    phaseId: '1',
    id: '1.1',
    name: 'Step',
    status: 'planned',
    rule: 'fixture',
    evidence: 'evidence',
    file: 'docs/ROADMAP.md',
    line: 12,
    ...overrides,
  };
}

async function buildModel(phases, path = 'C:/tmp/p') {
  const model = await modelPromise;
  return model.buildProjectTimelineModel(
    { path, phases, error: null },
    { generatedAt: '2026-07-11T00:00:00.000Z', sourceMode: 'live' },
  );
}

test('init expands the explicit current phase by default, even without steps', async () => {
  const s = await statePromise;
  const withSteps = await buildModel([
    phase({ id: '0', status: 'closed', line: 3 }),
    phase({ id: '1', status: 'in_progress', line: 9, steps: [step()] }),
  ]);
  const st = s.initTimelineViewState(withSteps);
  assert.equal(st.expandedPhaseKey, withSteps.currentPhaseId);
  assert.deepEqual(st.focused, { kind: 'phase', key: withSteps.currentPhaseId });

  const noSteps = await buildModel([phase({ id: '1', status: 'in_progress' })]);
  const st2 = s.initTimelineViewState(noSteps);
  assert.equal(st2.expandedPhaseKey, noSteps.currentPhaseId, 'no-steps current phase still expands');
});

test('init expands nothing when there is no explicit current phase', async () => {
  const s = await statePromise;
  const m = await buildModel([
    phase({ id: '0', status: 'closed', line: 3 }),
    phase({ id: '1', status: 'planned', line: 9 }),
  ]);
  const st = s.initTimelineViewState(m);
  assert.equal(st.expandedPhaseKey, null);
});

test('togglePhase expands exclusively, collapses on repeat, and keeps focus', async () => {
  const s = await statePromise;
  const m = await buildModel([
    phase({ id: '1', line: 3 }),
    phase({ id: '2', line: 9 }),
  ]);
  const [a, b] = m.phases.map((ph) => ph.key);

  let st = s.initTimelineViewState(m);
  st = s.togglePhase(st, a);
  assert.equal(st.expandedPhaseKey, a);
  st = s.togglePhase(st, b);
  assert.equal(st.expandedPhaseKey, b, 'activating another phase closes the previous one');
  assert.deepEqual(st.focused, { kind: 'phase', key: b });
  st = s.togglePhase(st, b);
  assert.equal(st.expandedPhaseKey, null, 'repeated activation collapses');
  assert.deepEqual(st.focused, { kind: 'phase', key: b }, 'focus stays on the phase button');
});

test('state resets for another project and never leaks across projects', async () => {
  const s = await statePromise;
  const m1 = await buildModel([phase({ id: '1', status: 'in_progress' })], 'C:/tmp/one');
  const m2 = await buildModel([phase({ id: '1', status: 'planned' })], 'C:/tmp/two');

  let st = s.initTimelineViewState(m1);
  st = s.togglePhase(st, m1.phases[0].key);
  const next = s.reconcileTimelineViewState(st, m2);
  assert.equal(next.projectId, 'C:/tmp/two');
  assert.equal(next.expandedPhaseKey, null, 'no current phase in the new project');
});

test('compatible refresh preserves expansion when keys survive', async () => {
  const s = await statePromise;
  const before = await buildModel([
    phase({ id: '1', status: 'in_progress', line: 3, steps: [step({ id: '1.1', status: 'planned' })] }),
    phase({ id: '2', line: 9 }),
  ]);
  // Same phases, one step status changed -> new revision, same keys.
  const after = await buildModel([
    phase({ id: '1', status: 'in_progress', line: 3, steps: [step({ id: '1.1', status: 'closed' })] }),
    phase({ id: '2', line: 9 }),
  ]);
  assert.notEqual(before.revision, after.revision);

  let st = s.initTimelineViewState(before);
  st = s.togglePhase(st, before.phases[1].key); // user opened phase 2
  const next = s.reconcileTimelineViewState(st, after);
  assert.equal(next.expandedPhaseKey, before.phases[1].key, 'expanded phase survives refresh');
  assert.equal(next.revision, after.revision);
});

test('refresh that removes the expanded phase re-initializes safely', async () => {
  const s = await statePromise;
  const before = await buildModel([phase({ id: '1', line: 3 }), phase({ id: '2', line: 9 })]);
  const after = await buildModel([phase({ id: '1', line: 3 })]);

  let st = s.initTimelineViewState(before);
  st = s.togglePhase(st, before.phases[1].key);
  const next = s.reconcileTimelineViewState(st, after);
  assert.equal(next.expandedPhaseKey, null);
});

test('betweenPhasesAnchor names the resolved/future transition', async () => {
  const s = await statePromise;
  const m = await buildModel([
    phase({ id: '0', status: 'closed', line: 3 }),
    phase({ id: '1', status: 'accepted', line: 9 }),
    phase({ id: '2', status: 'pending_acceptance', line: 15 }),
    phase({ id: '3', status: 'planned', line: 21 }),
  ]);
  const anchor = s.betweenPhasesAnchor(m);
  assert.equal(anchor.lastResolvedKey, m.phases[1].key);
  assert.equal(anchor.firstFutureKey, m.phases[3].key);
});
