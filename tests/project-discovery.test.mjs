import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  discoverWorkspaceProjects,
  normalizeAllowNestedProjects,
  normalizeDiscoveryDepth,
  validateDiscoveredProjectSelection,
} from '../server/project-discovery.mjs';

async function makeTemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-discovery-'));
}

test('normalizeDiscoveryDepth allows only 1, 2, or 3', () => {
  assert.equal(normalizeDiscoveryDepth(1), 1);
  assert.equal(normalizeDiscoveryDepth(2), 2);
  assert.equal(normalizeDiscoveryDepth(3), 3);
  assert.equal(normalizeDiscoveryDepth(0), 1);
  assert.equal(normalizeDiscoveryDepth(9), 1);
});

test('normalizeAllowNestedProjects defaults to false', () => {
  assert.equal(normalizeAllowNestedProjects(true), true);
  assert.equal(normalizeAllowNestedProjects(false), false);
  assert.equal(normalizeAllowNestedProjects(undefined), false);
});

test('discoverWorkspaceProjects returns candidates with marker reasons', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'autoparts', 'docs'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'notes'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'autoparts', 'README.md'), '# AutoParts');
  await fs.writeFile(path.join(workspaceRoot, 'autoparts', 'package.json'), '{}');

  const result = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: true,
    discoveryDepth: 1,
    allowNestedProjects: false,
  });
  const candidates = result.discoveredProjects;

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, 'autoparts');
  assert.equal(candidates[0].confidence, 'high');
  assert.deepEqual(candidates[0].badges.sort(), ['docs', 'package.json']);
  assert.deepEqual(candidates[0].reasons.sort(), ['README.md + docs/', 'package.json']);
});

test('discoverWorkspaceProjects inspects only immediate children by default and skips internals', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'real-project', 'docs'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'real-project', '.pytest_cache'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'real-project', 'web'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'real-project', 'src'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'node_modules', 'fake'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'real-project', 'README.md'), '# Real');
  await fs.writeFile(path.join(workspaceRoot, 'real-project', 'AGENTS.md'), '# Agents');
  await fs.writeFile(path.join(workspaceRoot, 'real-project', 'web', 'package.json'), '{}');
  await fs.writeFile(path.join(workspaceRoot, 'real-project', 'src', 'README.md'), '# Source');
  await fs.writeFile(path.join(workspaceRoot, 'node_modules', 'fake', 'README.md'), '# Ignored');

  const result = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: true,
    discoveryDepth: 3,
    allowNestedProjects: false,
  });

  assert.deepEqual(
    result.discoveredProjects.map((candidate) => path.basename(candidate.path)),
    ['real-project'],
  );
  assert.ok(
    result.internalFolders.some((entry) => entry.path.endsWith(`${path.sep}real-project${path.sep}docs`)),
  );
  assert.ok(
    result.internalFolders.some((entry) => entry.path.endsWith(`${path.sep}real-project${path.sep}.pytest_cache`)),
  );
});

test('discoverWorkspaceProjects returns no candidates for disabled workspace', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'candidate'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'candidate', 'README.md'), '# Candidate');

  const result = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: false,
    discoveryDepth: 2,
  });

  assert.deepEqual(result.discoveredProjects, []);
  assert.deepEqual(result.internalFolders, []);
});

test('discoverWorkspaceProjects supports nested projects only when explicitly enabled', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'parent', 'tools', 'nested-cli'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'parent', 'package.json'), '{}');
  await fs.writeFile(path.join(workspaceRoot, 'parent', 'tools', 'nested-cli', 'pyproject.toml'), '[project]\nname="nested-cli"');

  const defaultResult = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: true,
    discoveryDepth: 3,
    allowNestedProjects: false,
  });
  assert.deepEqual(defaultResult.discoveredProjects.map((candidate) => candidate.name), ['parent']);

  const nestedResult = await discoverWorkspaceProjects({
    id: 'local',
    name: 'Local',
    path: workspaceRoot,
    enabled: true,
    discoveryDepth: 3,
    allowNestedProjects: true,
  });
  assert.deepEqual(
    nestedResult.discoveredProjects.map((candidate) => candidate.name),
    ['parent', 'nested-cli'],
  );
  assert.equal(nestedResult.discoveredProjects[1].isNested, true);
  assert.ok(nestedResult.discoveredProjects[1].badges.includes('nested project'));
});

test('validateDiscoveredProjectSelection rejects internal folders and nested selections by default', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  const projectRoot = path.join(workspaceRoot, 'project');
  const docsRoot = path.join(projectRoot, 'docs');
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'package.json'), '{}');
  await fs.writeFile(path.join(docsRoot, 'README.md'), '# Docs');

  const validation = await validateDiscoveredProjectSelection(
    [projectRoot, docsRoot],
    [{ id: 'local', name: 'Local', path: workspaceRoot, enabled: true, discoveryDepth: 2, allowNestedProjects: false }],
    [],
  );

  assert.equal(validation.valid.length, 1);
  assert.equal(validation.invalid.length, 1);
  assert.equal(validation.invalid[0].reason, 'internal documentation folder');
});
