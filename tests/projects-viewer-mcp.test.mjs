import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
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

function minimalProject(root) {
  return {
    id: 'project-1',
    name: 'MCP Project',
    path: root,
    enabled: true,
  };
}

function generatedProject(root) {
  return {
    name: 'MCP Project',
    path: root,
    status: 'active',
    summary: {
      status: 'active',
      healthScore: 90,
      currentPhase: null,
      nextAction: 'Use MCP context.',
      mainBlocker: null,
      mainRisk: null,
      recentDecision: null,
    },
    signalGroups: {
      realBlockers: [],
      approvalGates: [],
      needsReview: [],
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
    gaps: [],
  };
}

function startMcpClient(apiBaseUrl) {
  const child = spawn(process.execPath, ['server/projects-viewer-mcp.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PROJECTS_VIEWER_API_BASE_URL: apiBaseUrl,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const rl = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  const stderr = [];
  let id = 1;

  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
  child.on('exit', (code) => {
    for (const [requestId, entry] of pending) {
      pending.delete(requestId);
      entry.reject(new Error(`MCP server exited with code ${code}: ${stderr.join('')}`));
    }
  });
  rl.on('line', (line) => {
    const message = JSON.parse(line);
    if (!Object.hasOwn(message, 'id')) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error.message));
    } else {
      entry.resolve(message.result);
    }
  });

  return {
    child,
    stderr,
    request(method, params = {}) {
      const requestId = id;
      id += 1;
      const payload = { jsonrpc: '2.0', id: requestId, method, params };
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`Timed out waiting for ${method}: ${stderr.join('')}`));
        }, 3000);
        pending.set(requestId, {
          resolve: (value) => {
            clearTimeout(timeout);
            resolve(value);
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          },
        });
      });
      child.stdin.write(`${JSON.stringify(payload)}\n`);
      return promise;
    },
    notify(method, params = {}) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    },
    async close() {
      child.stdin.end();
      child.kill();
      await new Promise((resolve) => child.once('close', resolve));
    },
  };
}

test('projects viewer MCP server exposes read-only context tools and proxies local API data', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-mcp-'));
  const appDataDir = path.join(tmp, 'app-data');
  const projectRoot = path.join(tmp, 'tracked-project');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(
    path.join(appDataDir, 'projects.config.json'),
    JSON.stringify({ projects: [minimalProject(projectRoot)], workspaces: [] }),
  );
  await fs.writeFile(
    path.join(appDataDir, 'projects.generated.json'),
    JSON.stringify({ generatedAt: '2026-07-09T00:00:00.000Z', activeDays: 14, projects: [generatedProject(projectRoot)] }),
  );

  const app = await createApp({
    appDataDir,
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  const mcp = startMcpClient(server.url);

  try {
    const initialized = await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    assert.equal(initialized.serverInfo.name, 'projects-viewer');
    mcp.notify('notifications/initialized');

    const tools = await mcp.request('tools/list');
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      [
        'list_projects',
        'list_configured_projects',
        'get_agent_preflight_packet',
        'get_project_brief_report',
        'get_ai_context',
        'get_ai_findings',
      ],
    );

    const result = await mcp.request('tools/call', { name: 'list_projects', arguments: {} });
    assert.equal(result.isError, false);
    const payload = JSON.parse(result.content[0].text);
    assert.equal(payload.projects[0].name, 'MCP Project');
    assert.equal(payload.projects[0].path, projectRoot);

    const configuredProjects = await mcp.request('tools/call', { name: 'list_configured_projects', arguments: {} });
    assert.equal(configuredProjects.isError, false);
    const configuredPayload = JSON.parse(configuredProjects.content[0].text);
    assert.deepEqual(configuredPayload, {
      projects: [
        {
          id: 'project-1',
          name: 'MCP Project',
          path: projectRoot,
          enabled: true,
          tags: [],
        },
      ],
    });
  } finally {
    await mcp.close();
    await server.close();
  }
});
