import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts.mjs';

const modulePromise = loadTsModule('phaseProgress.ts');

test('phaseProgress trusts closed phase status over stale step details', async () => {
  const { phaseProgress, phaseProgressInfo } = await modulePromise;
  const ph = {
    status: 'closed',
    steps: [{ status: 'draft' }, { status: 'planned' }],
  };

  assert.equal(phaseProgress(ph), 100);
  assert.equal(phaseProgressInfo(ph).basis, 'explicit-lifecycle');
});

test('phaseProgress treats pending acceptance as implemented but not closed', async () => {
  const { phaseProgress } = await modulePromise;
  const progress = phaseProgress({
    status: 'pending_acceptance',
    steps: [{ status: 'draft' }],
  });

  assert.equal(progress, 100);
});

test('phaseProgress excludes cancelled and superseded steps from the denominator', async () => {
  const { phaseProgress, phaseProgressInfo } = await modulePromise;
  const ph = {
    status: 'in_progress',
    steps: [
      { status: 'deferred' },
      { status: 'cancelled' },
      { status: 'superseded' },
      { status: 'closed' },
    ],
  };

  // 1 resolved of 2 eligible (deferred stays incomplete; cancelled/superseded leave).
  assert.equal(phaseProgress(ph), 50);
  const info = phaseProgressInfo(ph);
  assert.equal(info.basis, 'derived-from-steps');
  assert.equal(info.eligibleSteps, 2);
  assert.equal(info.resolvedSteps, 1);
});

test('phaseProgress keeps blocked and deferred steps incomplete in the denominator', async () => {
  const { phaseProgress } = await modulePromise;
  const progress = phaseProgress({
    status: 'in_progress',
    steps: [{ status: 'blocked' }, { status: 'deferred' }, { status: 'accepted' }, { status: 'closed' }],
  });

  assert.equal(progress, 50);
});

test('phaseProgress reports unknown progress without fabricating a percentage', async () => {
  const { phaseProgress, phaseProgressInfo } = await modulePromise;

  for (const status of ['in_progress', 'blocked', 'deferred']) {
    assert.equal(phaseProgress({ status, steps: [] }), null, `${status} without steps`);
  }
  // Only cancelled/superseded steps: unknown, not 0%.
  const onlyExcluded = {
    status: 'in_progress',
    steps: [{ status: 'cancelled' }, { status: 'superseded' }],
  };
  assert.equal(phaseProgress(onlyExcluded), null);
  assert.equal(phaseProgressInfo(onlyExcluded).basis, null);
});

test('phaseProgress reports zero for unstarted phases without steps', async () => {
  const { phaseProgress } = await modulePromise;
  for (const status of ['draft', 'planned', 'ready']) {
    assert.equal(phaseProgress({ status, steps: [] }), 0, `${status} without steps`);
  }
});

test('projectRoadmapProgress averages known eligible phases and discloses unknowns', async () => {
  const { projectRoadmapProgress } = await modulePromise;
  const result = projectRoadmapProgress([
    { status: 'closed', steps: [] }, // 100
    { status: 'in_progress', steps: [{ status: 'closed' }, { status: 'planned' }] }, // 50
    { status: 'blocked', steps: [] }, // unknown
    { status: 'cancelled', steps: [] }, // excluded entirely
  ]);

  assert.deepEqual(result, {
    percent: 75,
    knownPhases: 2,
    unknownPhases: 1,
    eligiblePhases: 3,
  });
});

test('projectRoadmapProgress shows no percentage without any known evidence', async () => {
  const { projectRoadmapProgress } = await modulePromise;
  const result = projectRoadmapProgress([
    { status: 'blocked', steps: [] },
    { status: 'superseded', steps: [] },
  ]);

  assert.equal(result.percent, null);
  assert.equal(result.knownPhases, 0);
  assert.equal(result.unknownPhases, 1);
});
