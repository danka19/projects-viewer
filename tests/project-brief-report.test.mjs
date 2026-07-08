import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server.mjs';
import { buildProjectBriefReport } from '../server/project-brief-report.mjs';

async function startTestServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function minimalProject(name, overrides = {}) {
  const projectPath = overrides.path ?? `C:/projects/${name.toLowerCase()}`;
  return {
    name,
    path: projectPath,
    status: overrides.status ?? 'active',
    statusReason: overrides.statusReason ?? 'Docs changed within active window',
    lastModified: overrides.lastModified ?? '2026-07-09T00:00:00.000Z',
    error: null,
    summary: {
      status: overrides.status ?? 'active',
      healthScore: overrides.healthScore ?? 80,
      currentPhase: overrides.currentPhase ?? null,
      nextAction: overrides.nextAction ?? null,
      mainBlocker: overrides.mainBlocker ?? null,
      mainRisk: overrides.mainRisk ?? null,
      recentDecision: null,
      docsCoverage: {
        readme: true,
        claude: true,
        roadmap: true,
        sddOrSpecs: true,
        audits: true,
      },
    },
    openTasks: [],
    completedTasks: [],
    nextTasks: overrides.nextAction
      ? [{ text: overrides.nextAction, file: 'docs/ROADMAP.md', line: 10, section: 'Next' }]
      : [],
    markers: [],
    headings: [],
    phases: [],
    decisions: [],
    blockers: [],
    signalGroups: {
      realBlockers: overrides.realBlockers ?? [],
      approvalGates: overrides.approvalGates ?? [],
      needsReview: overrides.needsReview ?? [],
      pausedDeferred: [],
    },
    blockedGatedDiagnostics: {
      includedProjectSignals: [],
      filteredAgentRules: [],
      filteredProcessPolicies: [],
      filteredExamplesOrTemplates: [],
      summary: {
        oldRawCandidateCount: 0,
        includedProjectSignalCount: 0,
        filteredOutCount: 0,
        filteredAgentRuleCount: 0,
        filteredProcessPolicyCount: 0,
        filteredExampleOrTemplateCount: 0,
      },
    },
    risks: overrides.mainRisk
      ? [{ kind: 'risk', text: overrides.mainRisk, file: 'docs/RISKS.md', line: 5 }]
      : [],
    specs: [],
    specFileCount: 1,
    audits: [],
    gaps: overrides.gaps ?? [],
    intel: {
      readmeFound: true,
      roadmapFound: true,
      claudeFound: true,
      specsFound: true,
      openTaskCount: 0,
      completedTaskCount: 0,
      attentionMarkerCount: 0,
      lastDocUpdate: null,
    },
    docs: [],
    stats: {
      docsCount: 1,
      totalSizeBytes: 1,
      openTaskCount: 0,
      completedTaskCount: 0,
      nextTaskCount: 0,
      markerCounts: {},
      completionPercent: null,
    },
  };
}

function signal(kind, text, line) {
  return {
    group: kind === 'blocked' ? 'realBlockers' : kind === 'approval-gate' ? 'approvalGates' : 'needsReview',
    kind,
    severe: kind === 'blocked',
    text,
    file: 'docs/ROADMAP.md',
    line,
  };
}

function scanWith(projects) {
  return {
    generatedAt: '2026-07-09T01:00:00.000Z',
    activeDays: 14,
    projects,
  };
}

function configFor(projects) {
  return {
    workspaces: [],
    projects: projects.map((project, index) => ({
      id: `project-${index + 1}`,
      name: project.name,
      path: project.path,
      enabled: true,
      tags: [],
      createdAt: '2026-07-09T00:00:00.000Z',
      updatedAt: '2026-07-09T00:00:00.000Z',
    })),
    settings: { watchDocs: false, autoRescanIntervalSec: 0 },
  };
}

test('buildProjectBriefReport ranks attention items, preserves evidence, and keeps advisory guards false', () => {
  const alpha = minimalProject('Alpha', {
    realBlockers: [signal('blocked', 'Deployment is blocked by missing approval.', 11)],
    mainBlocker: 'Deployment is blocked by missing approval.',
  });
  const beta = minimalProject('Beta', {
    approvalGates: [signal('approval-gate', 'Requires human approval.', 12)],
  });
  const gamma = minimalProject('Gamma');
  const delta = minimalProject('Delta', {
    needsReview: [signal('needs-review', 'Needs verification evidence.', 13)],
  });
  const epsilon = minimalProject('Epsilon', {
    nextAction: 'Review changed next action.',
    mainRisk: 'Risk changed.',
  });
  const zeta = minimalProject('Zeta', {
    gaps: ['No specs, SDD, or design documents found'],
  });
  const projects = [zeta, epsilon, delta, gamma, beta, alpha];
  const report = buildProjectBriefReport({
    scanOutput: scanWith(projects),
    config: configFor(projects),
    findings: [
      {
        id: 'finding-new',
        type: 'missing-specs',
        title: 'Review missing specs',
        confidence: 'medium',
        reviewState: 'new',
        reviewRequired: true,
        project: { name: 'Gamma', path: gamma.path },
        evidence: [{ kind: 'source', file: 'docs/README.md', line: 4, text: 'No specs found.' }],
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z',
      },
      {
        id: 'finding-accepted',
        type: 'stale-audit',
        title: 'Accepted finding should not create unresolved reason',
        confidence: 'low',
        reviewState: 'accepted',
        reviewRequired: true,
        project: { name: 'Gamma', path: gamma.path },
        evidence: [{ kind: 'derived-summary', text: 'Accepted only.' }],
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z',
      },
    ],
    changes: {
      projects: [
        {
          project: { name: 'Epsilon', path: epsilon.path },
          changedCategories: ['nextAction', 'status', 'riskSummary'],
        },
      ],
    },
    previousSnapshotAvailable: true,
    mode: 'weekly',
    since: '2026-07-08T00:00:00.000Z',
    now: () => new Date('2026-07-09T02:00:00.000Z'),
  });

  assert.equal(report.kind, 'project-brief-report');
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.generatedAt, '2026-07-09T02:00:00.000Z');
  assert.equal(report.mode, 'weekly');
  assert.equal(report.generatedFrom.remoteServicesUsed, false);
  assert.equal(report.inputState.generatedScanAvailable, true);
  assert.equal(report.baseline.comparisonAvailable, true);
  assert.deepEqual(
    report.items.map((item) => item.project.name),
    ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'],
  );
  assert.deepEqual(report.items.map((item) => item.rank), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(report.items.map((item) => item.priority), ['high', 'high', 'high', 'medium', 'medium', 'low']);

  const gammaItem = report.items.find((item) => item.project.name === 'Gamma');
  assert.ok(gammaItem.attentionReasons.some((reason) => reason.kind === 'unresolved-finding'));
  assert.equal(gammaItem.findingsSummary.unresolvedCount, 1);
  assert.equal(gammaItem.findingsSummary.acceptedCount, 1);
  assert.deepEqual(gammaItem.findingsSummary.unresolvedIds, ['finding-new']);
  assert.equal(gammaItem.findingsSummary.unresolved[0].evidence[0].file, 'docs/README.md');

  const epsilonItem = report.items.find((item) => item.project.name === 'Epsilon');
  assert.deepEqual(epsilonItem.changedCategories, ['nextAction', 'status', 'riskSummary']);
  assert.ok(epsilonItem.attentionReasons.some((reason) => reason.kind === 'changed-next-action'));
  assert.ok(epsilonItem.attentionReasons.some((reason) => reason.kind === 'changed-status'));
  assert.ok(epsilonItem.attentionReasons.some((reason) => reason.kind === 'changed-risk'));

  for (const item of report.items) {
    assert.equal(Object.hasOwn(item, '_sort'), false);
    assert.equal(item.recommendedHumanDecision.actionTaken, false);
    assert.equal(item.recommendedHumanDecision.acceptedDecision, false);
    assert.match(item.recommendedHumanDecision.prompt, /review|decide|inspect|confirm|choose/i);
    assert.ok(item.derivedLabels.some((label) => label.field === 'recommendedHumanDecision'));
  }
  assert.equal(report.summary.projectCount, 6);
  assert.equal(report.summary.itemCount, 6);
  assert.equal(report.summary.highPriorityCount, 3);
  assert.equal(report.summary.unresolvedFindingCount, 1);
  assert.equal(report.summary.blockerCount, 1);
  assert.equal(report.summary.approvalGateCount, 1);
  assert.equal(report.summary.changedProjectCount, 1);
});

test('buildProjectBriefReport handles missing baseline, empty findings, zero projects, and no attention states safely', () => {
  const quiet = minimalProject('Quiet');
  const missingBaseline = buildProjectBriefReport({
    scanOutput: scanWith([quiet]),
    config: configFor([quiet]),
    findings: [],
    changes: null,
    previousSnapshotAvailable: false,
    mode: 'daily',
    since: '2026-07-08T00:00:00.000Z',
    now: () => new Date('2026-07-09T02:00:00.000Z'),
  });

  assert.deepEqual(missingBaseline.items, []);
  assert.ok(missingBaseline.safeStates.some((state) => state.code === 'missing-previous-baseline'));
  assert.ok(missingBaseline.safeStates.some((state) => state.code === 'empty-findings'));
  assert.ok(missingBaseline.safeStates.some((state) => state.code === 'no-attention-items'));
  assert.equal(missingBaseline.baseline.comparisonAvailable, false);
  assert.match(missingBaseline.noAttentionMessage, /no changed projects, unresolved findings, blockers, approval gates, review signals, or relevant gaps/i);

  const zeroProjects = buildProjectBriefReport({
    scanOutput: scanWith([]),
    config: configFor([]),
    findings: null,
    changes: null,
    previousSnapshotAvailable: false,
    mode: 'daily',
    since: null,
    now: () => new Date('2026-07-09T02:00:00.000Z'),
  });
  assert.deepEqual(zeroProjects.items, []);
  assert.ok(zeroProjects.safeStates.some((state) => state.code === 'missing-findings-store'));
  assert.ok(zeroProjects.safeStates.some((state) => state.code === 'no-attention-items'));
  assert.match(zeroProjects.noAttentionMessage, /no tracked generated projects/i);
});

test('buildProjectBriefReport treats missing generated scan data as a domain error', () => {
  assert.throws(
    () =>
      buildProjectBriefReport({
        scanOutput: null,
        config: configFor([]),
        findings: [],
        changes: null,
        previousSnapshotAvailable: false,
        mode: 'daily',
        since: null,
        now: () => new Date('2026-07-09T02:00:00.000Z'),
      }),
    (err) => err.code === 'missing-generated-scan-data' && err.statusCode === 404,
  );
});

test('project brief composition module stays pure and avoids forbidden side-effect dependencies', async () => {
  const source = await fs.readFile(path.join(process.cwd(), 'server/project-brief-report.mjs'), 'utf8');
  assert.equal(source.includes("from 'node:fs"), false);
  assert.equal(source.includes('express'), false);
  assert.equal(source.includes('generateFindings'), false);
  assert.equal(source.includes('updateFindingReviewState'), false);
  assert.equal(source.includes('writeAiContextSnapshot'), false);
  assert.equal(source.includes('runScan'), false);
});

test('project brief report API returns default and weekly reports without unauthorized side effects', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-project-brief-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  const trackedProject = path.join(tmp, 'tracked-project');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(trackedProject, { recursive: true });
  const sentinelPath = path.join(trackedProject, 'README.md');
  await fs.writeFile(sentinelPath, '# untouched\n');

  const project = minimalProject('ApiProject', {
    path: trackedProject,
    realBlockers: [signal('blocked', 'API project is blocked.', 20)],
    mainBlocker: 'API project is blocked.',
  });
  const scan = scanWith([project]);
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scan));
  const findingsStore = {
    generatedAt: '2026-07-09T00:00:00.000Z',
    findings: [
      {
        id: 'api-finding',
        type: 'missing-verification-evidence',
        title: 'Review API evidence',
        confidence: 'high',
        reviewState: 'new',
        reviewRequired: true,
        project: { name: project.name, path: project.path },
        evidence: [{ kind: 'source', file: 'docs/audit.md', line: 3, text: 'Needs evidence.' }],
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z',
      },
    ],
    reviewStates: {},
  };
  const findingsPath = path.join(appDataDir, 'ai.findings.generated.json');
  await fs.writeFile(findingsPath, JSON.stringify(findingsStore, null, 2));
  const findingsBefore = await fs.readFile(findingsPath, 'utf8');

  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const dailyResponse = await fetch(`${server.url}/api/project-brief-report`);
    assert.equal(dailyResponse.status, 200);
    const daily = await dailyResponse.json();
    assert.equal(daily.kind, 'project-brief-report');
    assert.equal(daily.mode, 'daily');
    assert.equal(daily.items[0].project.name, 'ApiProject');
    assert.equal(daily.items[0].recommendedHumanDecision.actionTaken, false);

    const weeklyResponse = await fetch(`${server.url}/api/project-brief-report?mode=weekly&since=2026-07-08T00:00:00.000Z`);
    assert.equal(weeklyResponse.status, 200);
    const weekly = await weeklyResponse.json();
    assert.equal(weekly.mode, 'weekly');
    assert.ok(weekly.safeStates.some((state) => state.code === 'missing-previous-baseline'));

    await assert.rejects(fs.access(path.join(appDataDir, 'ai.context.snapshot.json')));
    await assert.rejects(fs.access(path.join(appDataDir, 'report-history.json')));
    assert.equal(await fs.readFile(findingsPath, 'utf8'), findingsBefore);
    assert.equal(await fs.readFile(sentinelPath, 'utf8'), '# untouched\n');
  } finally {
    await server.close();
  }
});

test('project brief report API rejects unsafe or invalid query parameters', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-project-brief-query-'));
  const appDataDir = path.join(tmp, 'app-data');
  await fs.mkdir(appDataDir, { recursive: true });
  const project = minimalProject('QueryProject', {
    realBlockers: [signal('blocked', 'Query project is blocked.', 20)],
  });
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scanWith([project])));

  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    for (const query of [
      'since=not-a-date',
      'mode=monthly',
      'since=2026-07-08T00:00:00.000Z&since=2026-07-09T00:00:00.000Z',
      'mode=daily&mode=weekly',
      'path=C:/projects/example',
      'workspacePath=C:/projects',
      'file=README.md',
      'glob=**/*.md',
      'projectId=sample',
      'include=docs',
      'unknown=value',
    ]) {
      const response = await fetch(`${server.url}/api/project-brief-report?${encodeURI(query)}`);
      assert.equal(response.status, 400, query);
      const body = await response.json();
      assert.match(body.error, /since|mode|allowed parameters|unsupported parameter/i);
    }
  } finally {
    await server.close();
  }
});

test('project brief report API returns a stable missing scan error and no-attention report', async () => {
  const missingTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-project-brief-missing-'));
  const missingApp = await createApp({
    appDataDir: path.join(missingTmp, 'app-data'),
    legacyConfigPath: path.join(missingTmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const missingServer = await startTestServer(missingApp);
  try {
    const response = await fetch(`${missingServer.url}/api/project-brief-report`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.code, 'missing-generated-scan-data');
  } finally {
    await missingServer.close();
  }

  const quietTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-project-brief-empty-'));
  const appDataDir = path.join(quietTmp, 'app-data');
  await fs.mkdir(appDataDir, { recursive: true });
  const quiet = minimalProject('Quiet');
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([quiet])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scanWith([quiet])));
  const quietApp = await createApp({
    appDataDir,
    legacyConfigPath: path.join(quietTmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const quietServer = await startTestServer(quietApp);
  try {
    const response = await fetch(`${quietServer.url}/api/project-brief-report`);
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.deepEqual(report.items, []);
    assert.ok(report.safeStates.some((state) => state.code === 'no-attention-items'));
    assert.match(report.noAttentionMessage, /no changed projects/i);
  } finally {
    await quietServer.close();
  }
});
