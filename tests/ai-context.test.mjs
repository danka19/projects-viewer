import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server.mjs';
import {
  buildAllProjectsAiContext,
  compareAiContextChanges,
  readAiContextSnapshot,
} from '../server/ai-context.mjs';
import {
  generateFindings,
  readFindingsStore,
  updateFindingReviewState,
} from '../server/ai-findings.mjs';

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

function sampleScan(tmp) {
  return {
    generatedAt: '2026-07-08T01:00:00.000Z',
    activeDays: 14,
    projects: [
      {
        name: 'Sample',
        path: path.join(tmp, 'tracked-project'),
        status: 'needs-review',
        statusReason: '1 review/verification signal in documentation',
        lastModified: '2026-07-08T00:30:00.000Z',
        error: null,
        summary: {
          status: 'needs-review',
          healthScore: 76,
          currentPhase: '1 Discovery',
          nextAction: 'Confirm acceptance evidence.',
          mainBlocker: null,
          mainRisk: 'Pilot evidence may be stale.',
          recentDecision: 'Accepted local-only direction.',
          recentChange: 'docs/ROADMAP.md',
          docsCoverage: {
            readme: true,
            claude: true,
            roadmap: true,
            sddOrSpecs: false,
            audits: false,
          },
        },
        openTasks: [
          { text: 'Confirm acceptance evidence.', file: 'docs/ROADMAP.md', line: 12, section: 'Next' },
        ],
        completedTasks: [],
        nextTasks: [
          { text: 'Confirm acceptance evidence.', file: 'docs/ROADMAP.md', line: 12, section: 'Next' },
        ],
        markers: [],
        headings: [],
        phases: [
          {
            id: '1',
            name: 'Discovery',
            statusText: 'completed, but later phase already complete',
            status: 'in_progress',
            rule: 'conflicting signals',
            confidence: 'low',
            issue: 'documentation',
            issueNote: 'Phase 2 is complete while Phase 1 remains in progress.',
            branch: null,
            steps: [],
            file: 'docs/ROADMAP.md',
            line: 8,
          },
        ],
        decisions: [
          { date: '2026-07-08', text: 'Accepted local-only direction.', file: 'docs/DECISIONS.md', line: 4 },
        ],
        blockers: [],
        signalGroups: {
          realBlockers: [],
          approvalGates: [
            {
              group: 'approvalGates',
              kind: 'approval-gate',
              severe: false,
              text: 'Requires human approval.',
              file: 'docs/ROADMAP.md',
              line: 14,
            },
          ],
          needsReview: [
            {
              group: 'needsReview',
              kind: 'needs-review',
              severe: false,
              text: 'Needs verification before completion.',
              file: 'docs/audit.md',
              line: 6,
            },
          ],
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
        risks: [{ kind: 'risk', text: 'Pilot evidence may be stale.', file: 'docs/RISKS.md', line: 3 }],
        specs: [],
        specFileCount: 0,
        audits: [],
        gaps: ['No specs, SDD, or design documents found', 'No audit, review, or verification documents found'],
        intel: {
          readmeFound: true,
          roadmapFound: true,
          claudeFound: true,
          specsFound: false,
          openTaskCount: 1,
          completedTaskCount: 0,
          attentionMarkerCount: 0,
          lastDocUpdate: '2026-07-08T00:30:00.000Z',
        },
        docs: [
          {
            file: 'README.md',
            category: 'core',
            sizeBytes: 12,
            modified: '2026-07-08T00:20:00.000Z',
          },
          {
            file: 'docs/ROADMAP.md',
            category: 'roadmap',
            sizeBytes: 120,
            modified: '2026-07-08T00:30:00.000Z',
          },
        ],
        stats: {
          docsCount: 2,
          totalSizeBytes: 132,
          openTaskCount: 1,
          completedTaskCount: 0,
          nextTaskCount: 1,
          markerCounts: {},
          completionPercent: null,
        },
      },
    ],
  };
}

test('AI context mapper returns compact evidence-backed context without raw markdown bodies', () => {
  const tmp = os.tmpdir();
  const context = buildAllProjectsAiContext(sampleScan(tmp));
  const project = context.projects[0];

  assert.equal(context.generatedAt, '2026-07-08T01:00:00.000Z');
  assert.equal(project.identity.name, 'Sample');
  assert.equal(project.status, 'needs-review');
  assert.equal(project.healthScore, 76);
  assert.equal(project.nextAction.text, 'Confirm acceptance evidence.');
  assert.deepEqual(project.nextAction.evidence[0], {
    kind: 'source',
    file: 'docs/ROADMAP.md',
    line: 12,
    text: 'Confirm acceptance evidence.',
  });
  assert.equal(project.constraints.approvalGates[0].evidence[0].file, 'docs/ROADMAP.md');
  assert.equal(project.risks[0].evidence[0].line, 3);
  assert.equal(JSON.stringify(project).includes('rawMarkdown'), false);
  assert.equal(JSON.stringify(project).includes('content'), false);
  assert.equal(project.docs, undefined);
});

test('AI context API uses saved generated scan data and rejects arbitrary path input', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-ai-context-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.writeFile(
    path.join(appDataDir, 'projects.config.json'),
    JSON.stringify({
      workspaces: [],
      projects: [
        {
          id: 'sample',
          name: 'Sample',
          path: sampleScan(tmp).projects[0].path,
          enabled: true,
          tags: [],
          createdAt: '2026-07-08T00:00:00.000Z',
          updatedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      settings: { watchDocs: false, autoRescanIntervalSec: 0 },
    }),
  );
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(sampleScan(tmp)));
  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const allResponse = await fetch(`${server.url}/api/ai-context?path=${encodeURIComponent(tmp)}`);
    assert.equal(allResponse.status, 200);
    const all = await allResponse.json();
    assert.equal(all.projects.length, 1);
    assert.equal(all.projects[0].identity.id, 'sample');

    const selectedResponse = await fetch(`${server.url}/api/ai-context/projects/sample`);
    assert.equal(selectedResponse.status, 200);
    const selected = await selectedResponse.json();
    assert.equal(selected.project.identity.name, 'Sample');

    const missingResponse = await fetch(`${server.url}/api/ai-context/projects/not-saved`);
    assert.equal(missingResponse.status, 404);
  } finally {
    await server.close();
  }
});

test('AI context API returns a clear empty state when generated scan data is missing', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-ai-context-missing-'));
  const app = await createApp({
    appDataDir: path.join(tmp, 'app-data'),
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const response = await fetch(`${server.url}/api/ai-context`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.match(body.error, /generated scan data/i);
  } finally {
    await server.close();
  }
});

test('AI changes-since reports changed categories and no-change state', () => {
  const scan = sampleScan(os.tmpdir());
  const changed = compareAiContextChanges(scan, {
    since: '2026-07-08T00:00:00.000Z',
    findings: [{ project: { name: 'Sample', path: scan.projects[0].path }, type: 'missing-specs' }],
  });
  assert.equal(changed.hasChanges, true);
  assert.deepEqual(changed.projects[0].changedCategories.sort(), [
    'currentPhase',
    'findings',
    'gaps',
    'nextAction',
    'riskSummary',
    'status',
    'statusReason',
  ]);

  const unchanged = compareAiContextChanges(scan, { since: '2026-07-08T01:00:00.000Z', findings: [] });
  assert.equal(unchanged.hasChanges, false);
  assert.deepEqual(unchanged.projects, []);
});

test('AI changes-since compares derived fields against previous compact context snapshot', () => {
  const tmp = os.tmpdir();
  const previousScan = sampleScan(tmp);
  const currentScan = sampleScan(tmp);
  previousScan.projects[0].status = 'active';
  previousScan.projects[0].statusReason = 'Docs changed within active window';
  previousScan.projects[0].summary.currentPhase = '0 Foundation';
  previousScan.projects[0].summary.nextAction = 'Old next action.';
  previousScan.projects[0].summary.mainRisk = null;
  previousScan.projects[0].gaps = [];

  currentScan.generatedAt = '2026-07-08T03:00:00.000Z';
  currentScan.projects[0].lastModified = '2026-07-08T00:30:00.000Z';
  const previousContext = buildAllProjectsAiContext(previousScan);

  const changed = compareAiContextChanges(currentScan, {
    since: '2026-07-08T02:00:00.000Z',
    previousContext,
    findings: [],
  });

  assert.equal(changed.hasChanges, true);
  assert.deepEqual(changed.projects[0].changedCategories.sort(), [
    'currentPhase',
    'gaps',
    'nextAction',
    'riskSummary',
    'status',
    'statusReason',
  ]);
});

test('AI changes endpoint persists and compares local compact context snapshots', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-ai-context-snapshot-'));
  const appDataDir = path.join(tmp, 'app-data');
  await fs.mkdir(appDataDir, { recursive: true });
  const initialScan = sampleScan(tmp);
  initialScan.projects[0].status = 'active';
  initialScan.projects[0].statusReason = 'Docs changed within active window';
  initialScan.projects[0].summary.nextAction = 'Old next action.';
  initialScan.projects[0].gaps = [];
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(initialScan));
  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const first = await fetch(`${server.url}/api/ai-context/changes?since=2026-07-08T02:00:00.000Z`);
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.hasChanges, false);

    const currentScan = sampleScan(tmp);
    currentScan.generatedAt = '2026-07-08T03:00:00.000Z';
    currentScan.projects[0].lastModified = '2026-07-08T00:30:00.000Z';
    await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(currentScan));

    const second = await fetch(`${server.url}/api/ai-context/changes?since=2026-07-08T02:00:00.000Z`);
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.hasChanges, true);
    assert.ok(secondBody.projects[0].changedCategories.includes('status'));
    assert.ok(secondBody.projects[0].changedCategories.includes('nextAction'));

    const snapshot = await readAiContextSnapshot({ appDataDir });
    assert.equal(snapshot.context.generatedAt, '2026-07-08T03:00:00.000Z');
  } finally {
    await server.close();
  }
});

test('AI findings generation and review state writes only under app-data', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-ai-findings-'));
  const appDataDir = path.join(tmp, 'app-data');
  const trackedProject = path.join(tmp, 'tracked-project');
  await fs.mkdir(trackedProject, { recursive: true });
  await fs.writeFile(path.join(trackedProject, 'README.md'), '# untouched\n');

  const generated = await generateFindings(sampleScan(tmp), { appDataDir, now: () => new Date('2026-07-08T02:00:00.000Z') });
  assert.ok(generated.findings.some((finding) => finding.type === 'status-contradiction'));
  assert.ok(generated.findings.some((finding) => finding.type === 'missing-specs'));
  assert.ok(generated.findings.every((finding) => finding.reviewState === 'new'));
  const finding = generated.findings.find((entry) => entry.type === 'status-contradiction');

  await updateFindingReviewState(finding.id, 'dismissed', {
    appDataDir,
    now: () => new Date('2026-07-08T03:00:00.000Z'),
  });
  const regenerated = await generateFindings(sampleScan(tmp), { appDataDir, now: () => new Date('2026-07-08T04:00:00.000Z') });
  const preserved = regenerated.findings.find((entry) => entry.id === finding.id);
  assert.equal(preserved.reviewState, 'dismissed');

  const store = await readFindingsStore({ appDataDir });
  assert.equal(store.reviewStates[finding.id].reviewState, 'dismissed');
  const trackedReadme = await fs.readFile(path.join(trackedProject, 'README.md'), 'utf8');
  assert.equal(trackedReadme, '# untouched\n');
  const appDataFiles = await fs.readdir(appDataDir);
  assert.ok(appDataFiles.includes('ai.findings.generated.json'));
});

test('AI findings API filters by review state and updates review state locally', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-ai-findings-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(sampleScan(tmp)));
  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const unresolved = await fetch(`${server.url}/api/ai-findings?state=unresolved`);
    assert.equal(unresolved.status, 200);
    const unresolvedBody = await unresolved.json();
    const finding = unresolvedBody.findings[0];
    assert.ok(finding.id);
    assert.equal(finding.reviewRequired, true);

    const patch = await fetch(`${server.url}/api/ai-findings/${encodeURIComponent(finding.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewState: 'accepted' }),
    });
    assert.equal(patch.status, 200);

    const accepted = await fetch(`${server.url}/api/ai-findings?state=accepted`);
    const acceptedBody = await accepted.json();
    assert.ok(acceptedBody.findings.some((entry) => entry.id === finding.id));
  } finally {
    await server.close();
  }
});
