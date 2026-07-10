import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts.mjs';

const modelPromise = loadTsModule('timeline/model.ts');

function phase(overrides = {}) {
  return {
    id: '1',
    name: 'Phase name',
    statusText: 'Status: planned.',
    status: 'planned',
    rule: 'test fixture',
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
    name: 'Step name',
    status: 'planned',
    rule: 'test fixture',
    evidence: 'fixture evidence',
    file: 'docs/ROADMAP.md',
    line: 12,
    ...overrides,
  };
}

function project(overrides = {}) {
  return {
    name: 'fixture-project',
    path: 'C:/tmp/fixture-project',
    error: null,
    phases: [],
    ...overrides,
  };
}

function build(model, p, opts = {}) {
  return model.buildProjectTimelineModel(p, {
    generatedAt: '2026-07-11T00:00:00.000Z',
    sourceMode: 'live',
    ...opts,
  });
}

test('model maps ordered phases and steps with stable non-index keys', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({ id: '0', status: 'closed', line: 5 }),
      phase({
        id: '1',
        status: 'in_progress',
        line: 20,
        steps: [
          step({ id: '1.1', status: 'closed', line: 22 }),
          step({ id: '1.2', status: 'in_progress', line: 30 }),
          step({ id: null, name: 'Checklist step', line: 41 }),
        ],
      }),
      phase({ id: '2', status: 'planned', line: 50 }),
    ],
  });
  const m = build(model, p);

  assert.equal(m.projectId, 'C:/tmp/fixture-project');
  assert.equal(m.phases.length, 3);
  assert.deepEqual(m.phases.map((ph) => ph.id), ['0', '1', '2']);
  assert.deepEqual(m.phases.map((ph) => ph.sequence), [0, 1, 2]);

  const keys = m.phases.map((ph) => ph.key);
  assert.equal(new Set(keys).size, 3, 'phase keys must be unique');
  for (const key of keys) {
    assert.match(key, /docs\/ROADMAP\.md/, 'phase key includes source identity');
  }

  const steps = m.phases[1].steps;
  assert.equal(steps.length, 3);
  assert.equal(new Set(steps.map((s) => s.key)).size, 3, 'step keys must be unique');
  assert.match(steps[2].key, /:41/, 'id-less steps fall back to source line identity');
  assert.deepEqual(steps.map((s) => s.sequence), [0, 1, 2]);
});

test('model reports explicit current phase and step from single in_progress lifecycle', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({ id: '0', status: 'closed' }),
      phase({
        id: '1',
        status: 'in_progress',
        steps: [
          step({ id: '1.1', status: 'closed' }),
          step({ id: '1.2', status: 'in_progress' }),
        ],
      }),
      phase({ id: '2', status: 'planned' }),
    ],
  });
  const m = build(model, p);

  assert.equal(m.currentPhaseId, m.phases[1].key);
  assert.equal(m.phases[1].currentStepId, m.phases[1].steps[1].key);
  assert.equal(m.integrityIssues.length, 0);
});

test('model keeps current null without issues when no phase is in progress', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [phase({ id: '0', status: 'closed' }), phase({ id: '1', status: 'planned' })],
  });
  const m = build(model, p);

  assert.equal(m.currentPhaseId, null);
  assert.equal(
    m.integrityIssues.filter((i) => i.kind === 'multiple-current-phases').length,
    0,
    'between phases is a valid state, not an integrity issue',
  );
});

test('model refuses to pick a current phase when multiple phases are in progress', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({ id: '1', status: 'in_progress', line: 5 }),
      phase({ id: '2', status: 'in_progress', line: 20 }),
    ],
  });
  const m = build(model, p);

  assert.equal(m.currentPhaseId, null);
  assert.equal(m.integrityIssues.some((i) => i.kind === 'multiple-current-phases'), true);
});

test('model refuses to pick a current step when multiple steps are in progress', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({
        id: '1',
        status: 'in_progress',
        steps: [
          step({ id: '1.1', status: 'in_progress', line: 6 }),
          step({ id: '1.2', status: 'in_progress', line: 9 }),
        ],
      }),
    ],
  });
  const m = build(model, p);

  assert.equal(m.phases[0].currentStepId, null);
  assert.equal(m.integrityIssues.some((i) => i.kind === 'multiple-current-steps'), true);
});

test('model surfaces phase parser and documentation issues as integrity issues', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({
        id: '1',
        status: 'in_progress',
        issue: 'documentation',
        issueNote: 'Later phase already closed.',
      }),
    ],
  });
  const m = build(model, p);

  const issue = m.integrityIssues.find((i) => i.kind === 'phase-status-issue');
  assert.ok(issue, 'documentation issue must surface');
  assert.match(issue.message, /Later phase already closed/);
  assert.equal(issue.phaseKey, m.phases[0].key);
});

test('model keeps duplicate phase ids renderable with unique keys and an integrity issue', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({ id: '1', file: 'docs/ROADMAP.md', line: 5 }),
      phase({ id: '1', file: 'docs/ROADMAP.md', line: 5 }),
    ],
  });
  const m = build(model, p);

  assert.equal(m.phases.length, 2);
  assert.equal(new Set(m.phases.map((ph) => ph.key)).size, 2);
  assert.equal(m.integrityIssues.some((i) => i.kind === 'duplicate-phase-key'), true);
});

test('model revision is stable for identical input and changes when lifecycle changes', async () => {
  const model = await modelPromise;
  const make = (status) =>
    project({ phases: [phase({ id: '1', status }), phase({ id: '2', status: 'planned' })] });

  const a = build(model, make('in_progress'));
  const b = build(model, make('in_progress'));
  const c = build(model, make('closed'));

  assert.equal(a.revision, b.revision);
  assert.notEqual(a.revision, c.revision);
});

test('model marks partial data at scanner truncation limits', async () => {
  const model = await modelPromise;
  const manyPhases = Array.from({ length: 100 }, (_, i) =>
    phase({ id: String(i), line: i + 1 }),
  );
  const m = build(model, project({ phases: manyPhases }));

  assert.equal(m.isPartial, true);
  assert.equal(m.integrityIssues.some((i) => i.kind === 'partial-data'), true);

  const small = build(model, project({ phases: [phase()] }));
  assert.equal(small.isPartial, false);
});

test('model phase progress uses deterministic implementation semantics', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({ id: '0', status: 'closed' }),
      phase({ id: '0.5', status: 'pending_acceptance' }),
      phase({
        id: '1',
        status: 'in_progress',
        steps: [
          step({ id: '1.1', status: 'closed' }),
          step({ id: '1.2', status: 'cancelled' }),
          step({ id: '1.3', status: 'superseded' }),
          step({ id: '1.4', status: 'blocked' }),
        ],
      }),
      phase({ id: '2', status: 'in_progress' }),
      phase({ id: '3', status: 'planned' }),
      phase({
        id: '4',
        status: 'in_progress',
        steps: [step({ id: '4.1', status: 'cancelled' }), step({ id: '4.2', status: 'superseded' })],
      }),
    ],
  });
  const m = build(model, p);

  assert.deepEqual(m.phases[0].progress, { percent: 100, basis: 'explicit-lifecycle' });
  assert.deepEqual(m.phases[1].progress, { percent: 100, basis: 'explicit-lifecycle' });
  // 1 resolved of 2 eligible (cancelled/superseded excluded, blocked stays incomplete).
  assert.deepEqual(m.phases[2].progress, { percent: 50, basis: 'derived-from-steps' });
  // in_progress without steps: unknown, never fabricated.
  assert.deepEqual(m.phases[3].progress, { percent: null, basis: null });
  assert.deepEqual(m.phases[4].progress, { percent: 0, basis: 'explicit-lifecycle' });
  // only cancelled/superseded steps: unknown, not 0%.
  assert.deepEqual(m.phases[5].progress, { percent: null, basis: null });

  // multiple in_progress phases here -> ambiguity issue expected, current null.
  assert.equal(m.currentPhaseId, null);
});

test('model project progress averages known eligible phases and discloses unknowns', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({ id: '0', status: 'closed' }), // 100 known
      phase({
        id: '1',
        status: 'in_progress',
        steps: [step({ id: '1.1', status: 'closed' }), step({ id: '1.2', status: 'planned' })],
      }), // 50 known
      phase({ id: '2', status: 'blocked' }), // unknown
      phase({ id: '3', status: 'cancelled' }), // excluded
    ],
  });
  const m = build(model, p);

  assert.equal(m.progress.percent, 75);
  assert.equal(m.progress.knownPhases, 2);
  assert.equal(m.progress.unknownPhases, 1);
  assert.equal(m.progress.eligiblePhases, 3);
});

test('model project progress is null when no eligible phase has evidence', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [phase({ id: '1', status: 'blocked' }), phase({ id: '2', status: 'cancelled' })],
  });
  const m = build(model, p);

  assert.equal(m.progress.percent, null);
  assert.equal(m.progress.knownPhases, 0);
  assert.equal(m.progress.unknownPhases, 1);
});

test('model never infers current identity from statusText prose', async () => {
  const model = await modelPromise;
  const p = project({
    phases: [
      phase({
        id: '1',
        status: 'planned',
        statusText: 'Status: this is the current active phase we are working on now.',
      }),
    ],
  });
  const m = build(model, p);

  assert.equal(m.currentPhaseId, null, 'prose must not create a current phase');
});
