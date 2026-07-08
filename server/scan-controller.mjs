export function createScanController({
  runScan,
  minIntervalMs = 30_000,
  now = () => Date.now(),
  logger = console,
} = {}) {
  if (typeof runScan !== 'function') {
    throw new TypeError('createScanController requires runScan');
  }

  let currentRun = null;
  let queuedTrigger = null;
  let delayedTimer = null;
  let lastStartedAt = 0;
  let lastWatcherScanAt = 0;
  let status = {
    status: 'idle',
    lastScannedAt: null,
    durationMs: null,
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    error: null,
    trigger: null,
    message: null,
  };

  function getStatus() {
    return { ...status, queued: queuedTrigger !== null || delayedTimer !== null };
  }

  function isScanning() {
    return status.status === 'scanning';
  }

  function recentlyWatcherTriggered(windowMs = minIntervalMs) {
    return lastWatcherScanAt > 0 && now() - lastWatcherScanAt < windowMs;
  }

  async function requestScan(trigger = 'manual') {
    if (currentRun) {
      if (!queuedTrigger) queuedTrigger = trigger;
      return currentRun;
    }

    const elapsed = now() - lastStartedAt;
    if (lastStartedAt > 0 && elapsed < minIntervalMs) {
      if (!queuedTrigger) queuedTrigger = trigger;
      if (!delayedTimer) {
        delayedTimer = setTimeout(() => {
          delayedTimer = null;
          const nextTrigger = queuedTrigger;
          queuedTrigger = null;
          if (nextTrigger) {
            void requestScan(nextTrigger).catch((err) => {
              logger.error(`Delayed scan failed: ${err.message}`);
            });
          }
        }, minIntervalMs - elapsed);
      }
      status = {
        ...status,
        message: `Rescan throttled; wait ${Math.ceil((minIntervalMs - elapsed) / 1000)}s`,
      };
      return getStatus();
    }

    currentRun = runOnce(trigger);
    try {
      return await currentRun;
    } finally {
      currentRun = null;
      if (queuedTrigger) {
        const nextTrigger = queuedTrigger;
        queuedTrigger = null;
        void requestScan(nextTrigger).catch((err) => {
          logger.error(`Queued scan failed: ${err.message}`);
        });
      }
    }
  }

  async function runOnce(trigger) {
    lastStartedAt = now();
    status = {
      ...status,
      status: 'scanning',
      error: null,
      trigger,
      message: trigger === 'watcher' ? 'Docs changed - rescanning automatically' : null,
    };

    try {
      const result = await runScan({ trigger });
      status = {
        status: 'success',
        lastScannedAt: new Date(now()).toISOString(),
        durationMs: result.status?.durationMs ?? null,
        scannedFilesCount: result.status?.scannedFilesCount ?? 0,
        skippedFilesCount: result.status?.skippedFilesCount ?? 0,
        error: null,
        trigger,
        message: trigger === 'watcher' ? 'Docs changed - rescanned automatically' : null,
      };
      if (trigger === 'watcher') lastWatcherScanAt = now();
      return getStatus();
    } catch (err) {
      status = {
        ...status,
        status: 'error',
        durationMs: now() - lastStartedAt,
        error: err.message,
        trigger,
        message: null,
      };
      return getStatus();
    }
  }

  return {
    getStatus,
    isScanning,
    recentlyWatcherTriggered,
    requestScan,
  };
}
