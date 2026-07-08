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
