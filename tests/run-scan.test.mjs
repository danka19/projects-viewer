import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runScan } from '../scan-projects.mjs';

test('runScan reads only configured documentation files and writes output', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-scan-'));
  const projectRoot = path.join(tmp, 'sample-project');
  await fs.mkdir(path.join(projectRoot, 'docs'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'node_modules'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n- [ ] Next thing\n');
  await fs.writeFile(path.join(projectRoot, 'docs', 'plan.md'), '# Plan\nStatus: planned\n');
  await fs.writeFile(path.join(projectRoot, 'notes.txt'), 'not documentation');
  await fs.writeFile(path.join(projectRoot, 'node_modules', 'README.md'), '# ignored\n');

  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      activeDays: 7,
      projects: [{ name: 'Sample', path: projectRoot }],
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });
  const written = JSON.parse(await fs.readFile(outputPath, 'utf8'));

  assert.equal(result.output.projects[0].stats.docsCount, 2);
  assert.equal(written.projects[0].name, 'Sample');
  assert.equal(result.status.scannedFilesCount, 2);
  assert.ok(result.status.skippedFilesCount >= 1);
});

test('runScan separates real blockers from approval, review, and paused signals', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-signals-'));
  const projectRoot = path.join(tmp, 'sample-project');
  await fs.mkdir(path.join(projectRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n');
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'ROADMAP.md'),
    [
      '# Roadmap',
      '',
      '- Real issue: cannot continue until missing required data is provided.',
      '- Gate: done - approval pending.',
      '- Gate: completed but requires approval from the owner.',
      '- Review: needs verification before final review.',
      '- Pause: paused until the next planning cycle.',
      '',
    ].join('\n'),
  );

  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      activeDays: 7,
      projects: [{ name: 'Sample', path: projectRoot }],
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });
  const project = result.output.projects[0];

  assert.equal(project.signalGroups.realBlockers.length, 1);
  assert.equal(project.signalGroups.approvalGates.length, 2);
  assert.equal(project.signalGroups.needsReview.length, 1);
  assert.equal(project.signalGroups.pausedDeferred.length, 1);
  assert.equal(project.blockers.length, 1);
  assert.match(project.statusReason, /1 real blocker/);
  assert.ok(
    project.signalGroups.approvalGates.every((item) => item.file && item.text),
    'approval gates keep source file and evidence text',
  );
});

test('runScan filters agent rules, process policies, and templates from work constraints', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-diagnostics-'));
  const projectRoot = path.join(tmp, 'sample-project');
  await fs.mkdir(path.join(projectRoot, 'docs', 'process'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'docs', 'templates'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'AGENTS.md'),
    [
      '# Agent Rules',
      '',
      '- Agent must block unsafe actions.',
      '- Do not bypass approval gates.',
      '',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'process', 'sdd.md'),
    [
      '# Process',
      '',
      '- All merges require approval gate.',
      '- Use blocked status when work cannot continue.',
      '',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'templates', 'phase-template.md'),
    [
      '# Template',
      '',
      '- Example: mark the task as blocked.',
      '- Template: gated by approval.',
      '',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'ROADMAP.md'),
    [
      '# Roadmap',
      '',
      '- Phase 4 is blocked by missing validation.',
      '- Roadmap phase is complete but pending approval.',
      '- Current work is waiting for validation.',
      '',
    ].join('\n'),
  );

  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      activeDays: 7,
      projects: [{ name: 'Sample', path: projectRoot }],
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });
  const project = result.output.projects[0];
  const diagnostics = project.blockedGatedDiagnostics;

  assert.equal(diagnostics.summary.oldRawCandidateCount, 9);
  assert.equal(diagnostics.summary.includedProjectSignalCount, 3);
  assert.equal(diagnostics.summary.filteredAgentRuleCount, 2);
  assert.equal(diagnostics.summary.filteredProcessPolicyCount, 2);
  assert.equal(diagnostics.summary.filteredExampleOrTemplateCount, 2);
  assert.equal(diagnostics.summary.filteredOutCount, 6);
  assert.equal(project.signalGroups.realBlockers.length, 1);
  assert.equal(project.signalGroups.approvalGates.length, 1);
  assert.equal(project.signalGroups.needsReview.length, 1);
  assert.equal(project.blockers.length, 1);
  assert.ok(
    diagnostics.filteredAgentRules.every((item) => !item.includedInProjectStatus),
    'agent rules are kept diagnostic-only',
  );
  assert.ok(
    diagnostics.includedProjectSignals.every(
      (item) => item.includedInProjectStatus && item.confidence && item.reason,
    ),
    'included project signals carry confidence and reasons',
  );
});

test('runScan scans only enabled projects from new config shape', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-scan-enabled-'));
  const enabledRoot = path.join(tmp, 'enabled');
  const disabledRoot = path.join(tmp, 'disabled');
  await fs.mkdir(enabledRoot, { recursive: true });
  await fs.mkdir(disabledRoot, { recursive: true });
  await fs.writeFile(path.join(enabledRoot, 'README.md'), '# Enabled\n');
  await fs.writeFile(path.join(disabledRoot, 'README.md'), '# Disabled\n');
  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.generated.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      workspaces: [],
      projects: [
        {
          id: 'enabled',
          name: 'Enabled',
          path: enabledRoot,
          enabled: true,
          tags: [],
          createdAt: '2026-07-08T00:00:00.000Z',
          updatedAt: '2026-07-08T00:00:00.000Z',
        },
        {
          id: 'disabled',
          name: 'Disabled',
          path: disabledRoot,
          enabled: false,
          tags: [],
          createdAt: '2026-07-08T00:00:00.000Z',
          updatedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      settings: { watchDocs: true, autoRescanIntervalSec: 0, activeDays: 3 },
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });

  assert.equal(result.output.activeDays, 3);
  assert.deepEqual(
    result.output.projects.map((project) => project.name),
    ['Enabled'],
  );
});

test('runScan allows empty canonical config and writes empty projects output', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-scan-empty-'));
  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.generated.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      workspaces: [],
      projects: [],
      settings: { watchDocs: true, autoRescanIntervalSec: 0, activeDays: 3 },
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });
  const written = JSON.parse(await fs.readFile(outputPath, 'utf8'));

  assert.equal(result.output.activeDays, 3);
  assert.deepEqual(result.output.projects, []);
  assert.deepEqual(written.projects, []);
  assert.equal(result.status.scannedFilesCount, 0);
  assert.equal(result.status.skippedFilesCount, 0);
});

test('runScan can write generated data to app-data path', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-generated-'));
  const projectRoot = path.join(tmp, 'sample');
  const appDataDir = path.join(tmp, 'app-data');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n');
  await fs.mkdir(appDataDir, { recursive: true });
  const configPath = path.join(appDataDir, 'projects.config.json');
  const outputPath = path.join(appDataDir, 'projects.generated.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      workspaces: [],
      projects: [
        {
          id: 'sample',
          name: 'Sample',
          path: projectRoot,
          enabled: true,
          tags: [],
          createdAt: '2026-07-08T00:00:00.000Z',
          updatedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      settings: { watchDocs: true, autoRescanIntervalSec: 0 },
    }),
  );

  await runScan({ configPath, outputPath, quiet: true });
  const written = JSON.parse(await fs.readFile(outputPath, 'utf8'));

  assert.equal(written.projects[0].name, 'Sample');
});

test('runScan normalizes phase statuses to the phase-status-audit lifecycle', async () => {
  const allowed = new Set([
    'draft',
    'planned',
    'ready',
    'in_progress',
    'blocked',
    'pending_acceptance',
    'accepted',
    'closed',
    'deferred',
    'cancelled',
    'superseded',
  ]);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-bare-complete-'));
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(path.join(projectRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n');
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'ROADMAP.md'),
    [
      '# Roadmap',
      '',
      '## Phase 0. Project Foundation',
      '',
      'Status: complete.',
      '',
      '## Phase 1. Accepted And Closed',
      '',
      'Status: accepted and closed on 2026-07-09.',
      '',
      '## Phase 2. Human Accepted',
      '',
      'Status: accepted by the human owner.',
      '',
      '## Phase 3. Waiting Acceptance',
      '',
      'Status: completed but requires approval from the owner.',
      '',
      '## Phase 4. Deferred Work',
      '',
      'Status: paused until the next planning cycle.',
      '',
      '## Phase 5. Ready Work',
      '',
      'Status: ready to start.',
      '',
      '## Phase 6. Draft Work',
      '',
      'Status: draft, not ready for implementation.',
      '',
      '## Phase 7. Cancelled Work',
      '',
      'Status: cancelled by owner decision.',
      '',
      '## Phase 8. Superseded Work',
      '',
      'Status: superseded by Phase 9.',
      '',
      '## Phase 9. Blocked Work',
      '',
      'Status: blocked by missing required data.',
      '',
      '## Phase 10. Active Work',
      '',
      'Status: in progress on `phase-10/active-work`.',
      '',
      '## Phase 11. Planned Work',
      '',
      'Status: planned after Phase 10.',
      '',
    ].join('\n'),
  );

  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      activeDays: 7,
      projects: [{ name: 'Sample', path: projectRoot }],
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });
  const phases = result.output.projects[0].phases;
  const statuses = Object.fromEntries(phases.map((phase) => [phase.id, phase.status]));

  assert.deepEqual(statuses, {
    0: 'closed',
    1: 'closed',
    2: 'accepted',
    3: 'pending_acceptance',
    4: 'deferred',
    5: 'ready',
    6: 'draft',
    7: 'cancelled',
    8: 'superseded',
    9: 'blocked',
    10: 'in_progress',
    11: 'planned',
  });
  assert.ok(phases.every((phase) => allowed.has(phase.status)));
  assert.equal(phases[0].issue, 'none');
});

test('runScan keeps the leading phase status authoritative and exposes conflicting prose', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-leading-phase-status-'));
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(path.join(projectRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n');
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'ROADMAP.md'),
    [
      '# Roadmap',
      '',
      '## Phase 2. Transfer Ready',
      'Status: ready. The transfer boundary is accepted, the detailed phase plan exists, and work item 2.1 is unblocked.',
      '',
      '## Phase 3. Pilot',
      'Status: planned. A detailed phase plan has not been accepted yet.',
      '',
      '## Phase 4. Accepted Result',
      'Status: accepted. Human accepted the implemented result.',
    ].join('\n'),
  );

  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      activeDays: 7,
      projects: [{ name: 'Sample', path: projectRoot }],
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });
  const phases = result.output.projects[0].phases;

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
});

test('runScan does not attach generic numbered planning sections as phase steps', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-phase-step-ownership-'));
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(path.join(projectRoot, 'docs', 'planning'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n');
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'ROADMAP.md'),
    [
      '# Roadmap',
      '## Phase 0. Foundation',
      'Status: closed.',
      '## Phase 1. Discovery',
      'Status: closed.',
      '## Phase 2. Transfer',
      'Status: ready.',
      '## Phase 3. Pilot',
      'Status: planned.',
      '## Phase 4. Hardening',
      'Status: planned.',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'planning', 'CORPORATE_PROCESS_ADOPTION_PLAN.md'),
    [
      '# Corporate Process Adoption Plan',
      '### 3.1 System-of-record mapping',
      'Status: pending acceptance.',
      '### 3.2 Controlled subset',
      'Status: draft.',
      '### 4.1 Minor',
      'Status: deferred.',
    ].join('\n'),
  );

  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(configPath, JSON.stringify({ activeDays: 7, projects: [{ name: 'Sample', path: projectRoot }] }));

  const result = await runScan({ configPath, outputPath, quiet: true });
  const phases = result.output.projects[0].phases;

  assert.deepEqual(phases.find((phase) => phase.id === '3')?.steps, []);
  assert.deepEqual(phases.find((phase) => phase.id === '4')?.steps, []);
});

test('runScan scopes Roadmap phases to saved roadmap roots while Specs uses its own roots', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-view-roots-'));
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(path.join(projectRoot, 'delivery'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'analytics'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'delivery', 'ROADMAP.md'), '# Roadmap\n## Phase 1. Included\nStatus: planned.\n');
  await fs.writeFile(path.join(projectRoot, 'docs', 'OLD_PHASE.md'), '# Roadmap\n## Phase 9. Excluded\nStatus: planned.\n');
  await fs.writeFile(path.join(projectRoot, 'analytics', 'ranking.md'), '---\nwork:\n  id: ranking\n---\n# Ranking\n');
  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(configPath, JSON.stringify({ projects: [{ id: 'sample', name: 'Sample', path: projectRoot, documentationViews: { roadmap: { roots: ['delivery'] }, specs: { roots: ['analytics'] } } }] }));
  const result = await runScan({ configPath, outputPath, quiet: true });
  assert.deepEqual(result.output.projects[0].phases.map((phase) => phase.id), ['1']);
  assert.deepEqual(result.output.projects[0].specWork.specifications.map((spec) => spec.id), ['ranking']);
});
