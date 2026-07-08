import assert from 'node:assert/strict';
import test from 'node:test';
import { createScanController } from '../server/scan-controller.mjs';

test('scan controller never runs two scans at once and keeps only one queued rescan', async () => {
  let active = 0;
  let maxActive = 0;
  let runs = 0;
  let releaseFirst;
  const firstRunStarted = new Promise((resolve) => {
    const runScan = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      runs += 1;
      if (runs === 1) {
        resolve();
        await new Promise((release) => {
          releaseFirst = release;
        });
      }
      active -= 1;
      return {
        status: { scannedFilesCount: 1, skippedFilesCount: 0, durationMs: 1 },
        output: { generatedAt: new Date().toISOString(), activeDays: 14, projects: [] },
      };
    };
    globalThis.__runScanForControllerTest = runScan;
  });

  const controller = createScanController({
    runScan: globalThis.__runScanForControllerTest,
    minIntervalMs: 0,
    now: () => Date.now(),
  });

  const first = controller.requestScan('manual');
  await firstRunStarted;
  const queuedOne = controller.requestScan('watcher');
  const queuedTwo = controller.requestScan('interval');

  releaseFirst();
  await Promise.all([first, queuedOne, queuedTwo]);

  assert.equal(maxActive, 1);
  assert.equal(runs, 2);
  assert.equal(controller.getStatus().trigger, 'watcher');
});
