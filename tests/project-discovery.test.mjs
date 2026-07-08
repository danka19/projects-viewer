import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  discoverWorkspaceProjects,
  normalizeDiscoveryDepth,
} from '../server/project-discovery.mjs';

async function makeTemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-discovery-'));
}

test('normalizeDiscoveryDepth allows only 1, 2, or 3', () => {
  assert.equal(normalizeDiscoveryDepth(1), 1);
  assert.equal(normalizeDiscoveryDepth(2), 2);
  assert.equal(normalizeDiscoveryDepth(3), 3);
  assert.equal(normalizeDiscoveryDepth(0), 2);
  assert.equal(normalizeDiscoveryDepth(9), 2);
});

test('discoverWorkspaceProjects returns candidates with marker reasons', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'autoparts', 'docs'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'notes'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'autoparts', 'README.md'), '# AutoParts');
  await fs.writeFile(path.join(workspaceRoot, 'autoparts', 'package.json'), '{}');

  const candidates = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: true,
    discoveryDepth: 2,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, 'autoparts');
  assert.deepEqual(candidates[0].reasons.sort(), ['README.md', 'docs/', 'package.json']);
});

test('discoverWorkspaceProjects respects depth and skips excluded folders', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'level1', 'level2', 'level3', 'too-deep'), {
    recursive: true,
  });
  await fs.mkdir(path.join(workspaceRoot, 'node_modules', 'fake'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'level1', 'level2', 'package.json'), '{}');
  await fs.writeFile(
    path.join(workspaceRoot, 'level1', 'level2', 'level3', 'too-deep', 'README.md'),
    '# Too Deep',
  );
  await fs.writeFile(path.join(workspaceRoot, 'node_modules', 'fake', 'README.md'), '# Ignored');

  const candidates = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: true,
    discoveryDepth: 2,
  });

  assert.deepEqual(
    candidates.map((candidate) => path.basename(candidate.path)),
    ['level2'],
  );
});

test('discoverWorkspaceProjects returns no candidates for disabled workspace', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'candidate'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'candidate', 'README.md'), '# Candidate');

  const candidates = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: false,
    discoveryDepth: 2,
  });

  assert.deepEqual(candidates, []);
});
