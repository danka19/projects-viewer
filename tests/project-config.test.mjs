import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  addProject,
  addWorkspace,
  ensureProjectConfig,
  getEnabledProjects,
  readProjectConfig,
  removeProject,
  updateProject,
} from '../server/project-config.mjs';

async function makeTemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-config-'));
}

test('ensureProjectConfig creates an empty canonical config on clean startup', async () => {
  const tmp = await makeTemp();
  const appDataDir = path.join(tmp, 'app-data');

  const config = await ensureProjectConfig({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    now: () => new Date('2026-07-08T00:00:00.000Z'),
  });

  assert.deepEqual(config.projects, []);
  assert.deepEqual(config.workspaces, []);
  assert.deepEqual(config.settings, { watchDocs: true, autoRescanIntervalSec: 0 });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(appDataDir, 'projects.config.json'), 'utf8')),
    config,
  );
});

test('ensureProjectConfig ignores root projects.config.json at runtime', async () => {
  const tmp = await makeTemp();
  const projectRoot = path.join(tmp, 'sample-project');
  await fs.mkdir(projectRoot, { recursive: true });
  const legacyConfigPath = path.join(tmp, 'projects.config.json');
  const appDataDir = path.join(tmp, 'app-data');
  await fs.writeFile(
    legacyConfigPath,
    JSON.stringify({
      activeDays: 7,
      watchDocs: false,
      projects: [{ name: 'Sample Project', path: projectRoot }],
    }),
  );

  const config = await ensureProjectConfig({
    appDataDir,
    legacyConfigPath,
    now: () => new Date('2026-07-08T00:00:00.000Z'),
  });

  assert.deepEqual(config.projects, []);
  assert.deepEqual(config.workspaces, []);
  assert.deepEqual(config.settings, { watchDocs: true, autoRescanIntervalSec: 0 });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(appDataDir, 'projects.config.json'), 'utf8')),
    config,
  );
});

test('addProject validates directories and deduplicates by resolved path', async () => {
  const tmp = await makeTemp();
  const appDataDir = path.join(tmp, 'app-data');
  const projectRoot = path.join(tmp, 'AutoParts');
  await fs.mkdir(projectRoot, { recursive: true });
  await ensureProjectConfig({ appDataDir, legacyConfigPath: path.join(tmp, 'missing.json') });

  const first = await addProject({ path: projectRoot, name: 'AutoParts' }, { appDataDir });
  const second = await addProject({ path: projectRoot, name: 'Different Name' }, { appDataDir });
  const config = await readProjectConfig({ appDataDir });

  assert.equal(first.project.id, second.project.id);
  assert.equal(second.created, false);
  assert.equal(config.projects.length, 1);
});

test('updateProject changes editable fields and removeProject only updates config', async () => {
  const tmp = await makeTemp();
  const appDataDir = path.join(tmp, 'app-data');
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(projectRoot, { recursive: true });
  await ensureProjectConfig({ appDataDir, legacyConfigPath: path.join(tmp, 'missing.json') });
  const { project } = await addProject({ path: projectRoot, name: 'Sample' }, { appDataDir });

  const updated = await updateProject(
    project.id,
    { name: 'Renamed', tags: ['local'], enabled: false },
    { appDataDir },
  );
  assert.equal(updated.project.name, 'Renamed');
  assert.deepEqual(updated.project.tags, ['local']);
  assert.equal(updated.project.enabled, false);
  assert.deepEqual(getEnabledProjects(updated.config), []);

  const removed = await removeProject(project.id, { appDataDir });
  assert.equal(removed.removed.id, project.id);
  await assert.doesNotReject(fs.stat(projectRoot));
  assert.equal(removed.config.projects.length, 0);
});

test('addWorkspace validates directory and normalizes discovery depth', async () => {
  const tmp = await makeTemp();
  const appDataDir = path.join(tmp, 'app-data');
  const workspaceRoot = path.join(tmp, 'projects');
  await fs.mkdir(workspaceRoot, { recursive: true });
  await ensureProjectConfig({ appDataDir, legacyConfigPath: path.join(tmp, 'missing.json') });

  const { workspace } = await addWorkspace(
    { path: workspaceRoot, name: 'Local Projects', discoveryDepth: 9 },
    { appDataDir },
  );

  assert.equal(workspace.name, 'Local Projects');
  assert.equal(workspace.discoveryDepth, 1);
  assert.equal(workspace.allowNestedProjects, false);
  assert.equal(workspace.enabled, true);
});

test('addWorkspace preserves explicit nested project discovery setting', async () => {
  const tmp = await makeTemp();
  const appDataDir = path.join(tmp, 'app-data');
  const workspaceRoot = path.join(tmp, 'projects');
  await fs.mkdir(workspaceRoot, { recursive: true });
  await ensureProjectConfig({ appDataDir, legacyConfigPath: path.join(tmp, 'missing.json') });

  const { workspace } = await addWorkspace(
    { path: workspaceRoot, name: 'Local Projects', discoveryDepth: 3, allowNestedProjects: true },
    { appDataDir },
  );

  assert.equal(workspace.discoveryDepth, 3);
  assert.equal(workspace.allowNestedProjects, true);
});
