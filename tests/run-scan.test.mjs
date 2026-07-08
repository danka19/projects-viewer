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
