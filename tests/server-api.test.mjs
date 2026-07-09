import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server.mjs';

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

test('project management API persists added project and rejects missing path', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(projectRoot, { recursive: true });
  const app = await createApp({
    appDataDir,
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const missing = await fetch(`${server.url}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path.join(tmp, 'missing') }),
    });
    assert.equal(missing.status, 400);

    const added = await fetch(`${server.url}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectRoot, name: 'Sample' }),
    });
    assert.equal(added.status, 201);

    const configResponse = await fetch(`${server.url}/api/config`);
    const config = await configResponse.json();
    assert.equal(config.projects[0].name, 'Sample');
    assert.equal(config.projects[0].enabled, true);
  } finally {
    await server.close();
  }
});

test('workspace discovery API returns candidates and track-discovered persists selected paths', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-workspace-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  const workspaceRoot = path.join(tmp, 'workspace');
  const candidateRoot = path.join(workspaceRoot, 'candidate');
  const docsRoot = path.join(candidateRoot, 'docs');
  await fs.mkdir(candidateRoot, { recursive: true });
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.writeFile(path.join(candidateRoot, 'README.md'), '# Candidate');
  await fs.writeFile(path.join(candidateRoot, 'AGENTS.md'), '# Agents');
  await fs.writeFile(path.join(docsRoot, 'README.md'), '# Docs');
  const app = await createApp({
    appDataDir,
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const workspaceResponse = await fetch(`${server.url}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: workspaceRoot, name: 'Workspace', discoveryDepth: 2 }),
    });
    assert.equal(workspaceResponse.status, 201);
    const { workspace } = await workspaceResponse.json();

    const discoveryResponse = await fetch(`${server.url}/api/workspaces/${workspace.id}/discover`, {
      method: 'POST',
    });
    assert.equal(discoveryResponse.status, 200);
    const { discoveredProjects, candidates, internalFolders } = await discoveryResponse.json();
    assert.equal(discoveredProjects.length, 1);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, 'candidate');
    assert.ok(internalFolders.some((entry) => entry.path === docsRoot));

    const trackResponse = await fetch(`${server.url}/api/projects/track-discovered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [candidateRoot] }),
    });
    assert.equal(trackResponse.status, 201);
    const tracked = await trackResponse.json();
    assert.equal(tracked.projects.length, 1);
  } finally {
    await server.close();
  }
});

test('track-discovered rejects internal folders without adding partial projects', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-track-invalid-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  const workspaceRoot = path.join(tmp, 'workspace');
  const projectRoot = path.join(workspaceRoot, 'candidate');
  const docsRoot = path.join(projectRoot, 'docs');
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'package.json'), '{}');
  await fs.writeFile(path.join(docsRoot, 'README.md'), '# Docs');
  const app = await createApp({
    appDataDir,
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const workspaceResponse = await fetch(`${server.url}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: workspaceRoot, name: 'Workspace' }),
    });
    assert.equal(workspaceResponse.status, 201);

    const trackResponse = await fetch(`${server.url}/api/projects/track-discovered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [projectRoot, docsRoot] }),
    });
    assert.equal(trackResponse.status, 400);
    const errorBody = await trackResponse.json();
    assert.equal(errorBody.invalid[0].reason, 'internal documentation folder');

    const configResponse = await fetch(`${server.url}/api/config`);
    const config = await configResponse.json();
    assert.equal(config.projects.length, 0);
  } finally {
    await server.close();
  }
});

test('browse folder API returns selected local path', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-browse-api-'));
  const selectedPath = path.join(tmp, 'selected');
  const app = await createApp({
    appDataDir: path.join(tmp, 'app-data'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
    browseFolder: async () => selectedPath,
  });
  const server = await startTestServer(app);
  try {
    const response = await fetch(`${server.url}/api/browse-folder`, { method: 'POST' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.path, selectedPath);
  } finally {
    await server.close();
  }
});

test('browse folder API reports cancelled selection without error', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-browse-cancel-api-'));
  const app = await createApp({
    appDataDir: path.join(tmp, 'app-data'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
    browseFolder: async () => null,
  });
  const server = await startTestServer(app);
  try {
    const response = await fetch(`${server.url}/api/browse-folder`, { method: 'POST' });
    assert.equal(response.status, 204);
  } finally {
    await server.close();
  }
});
