import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
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

test('projects viewer MCP server returns a tool error when the local API responds with html', async () => {
  const htmlServer = http.createServer((request, response) => {
    if (request.url === '/api/projects') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html><body>Not JSON\nSecond line</body></html>');
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolve) => htmlServer.listen(0, '127.0.0.1', resolve));
  const { port } = htmlServer.address();
  const mcp = startMcpClient(`http://127.0.0.1:${port}`);

  try {
    await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    mcp.notify('notifications/initialized');

    const result = await mcp.request('tools/call', { name: 'list_projects', arguments: {} });
    const errorText = result.content[0].text.trimEnd();
    assert.equal(result.isError, true);
    assert.match(errorText, /Expected JSON response/i);
    assert.match(errorText, /status 200/i);
    assert.match(errorText, /text\/html/i);
    assert.match(errorText, /\/api\/projects/i);
    assert.match(errorText, /preview/i);
    assert.match(errorText, /<!doctype html><html><body>Not JSON Second line<\/body><\/html>/i);
    assert.doesNotMatch(errorText, /\nSecond line/);
  } finally {
    await mcp.close();
    await new Promise((resolve, reject) => {
      htmlServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('projects viewer MCP server returns a tool error with detail when the local API responds with malformed json', async () => {
  const malformedServer = http.createServer((request, response) => {
    if (request.url === '/api/projects') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end('{"projects":[\n');
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolve) => malformedServer.listen(0, '127.0.0.1', resolve));
  const { port } = malformedServer.address();
  const mcp = startMcpClient(`http://127.0.0.1:${port}`);

  try {
    await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    mcp.notify('notifications/initialized');

    const result = await mcp.request('tools/call', { name: 'list_projects', arguments: {} });
    const errorText = result.content[0].text.trimEnd();
    assert.equal(result.isError, true);
    assert.match(errorText, /malformed json/i);
    assert.match(errorText, /status 200/i);
    assert.match(errorText, /application\/json/i);
    assert.match(errorText, /\/api\/projects/i);
    assert.match(errorText, /preview/i);
    assert.match(errorText, /{"projects":\[/i);
    assert.doesNotMatch(errorText, /\n/);
  } finally {
    await mcp.close();
    await new Promise((resolve, reject) => {
      malformedServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('projects viewer MCP server rejects agent preflight html fallback and malformed json responses', async () => {
  const cases = [
    {
      name: 'html fallback',
      path: '/api/agent-preflight-packet?projectId=project-1&agentRole=implementation',
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body>Vite fallback\nfor stale server</body></html>',
      expected: [
        /Expected JSON response/i,
        /text\/html/i,
        /\/api\/agent-preflight-packet\?projectId=project-1&agentRole=implementation/i,
        /Vite fallback for stale server/i,
      ],
    },
    {
      name: 'malformed json',
      path: '/api/agent-preflight-packet?projectId=project-1&agentRole=reviewer',
      contentType: 'application/json; charset=utf-8',
      body: '{"kind":"agent-preflight-packet",',
      expected: [
        /malformed JSON/i,
        /application\/json/i,
        /\/api\/agent-preflight-packet\?projectId=project-1&agentRole=reviewer/i,
        /"kind":"agent-preflight-packet"/i,
      ],
    },
  ];

  for (const { name, path: apiPath, contentType, body, expected } of cases) {
    const packetServer = http.createServer((request, response) => {
      if (request.url === apiPath) {
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(body);
        return;
      }

      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'not-found' }));
    });

    await new Promise((resolve) => packetServer.listen(0, '127.0.0.1', resolve));
    const { port } = packetServer.address();
    const mcp = startMcpClient(`http://127.0.0.1:${port}`);

    try {
      await mcp.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
      });
      mcp.notify('notifications/initialized');

      const agentRole = new URL(`http://127.0.0.1${apiPath}`).searchParams.get('agentRole');
      const result = await mcp.request('tools/call', {
        name: 'get_agent_preflight_packet',
        arguments: { projectId: 'project-1', agentRole },
      });
      const errorText = result.content[0].text.trimEnd();
      assert.equal(result.isError, true, `expected tool error for ${name}`);
      assert.match(errorText, /status 200/i);
      assert.match(errorText, /preview/i);
      for (const expectedPattern of expected) {
        assert.match(errorText, expectedPattern);
      }
      assert.doesNotMatch(errorText, /\n/);
    } finally {
      await mcp.close();
      await new Promise((resolve, reject) => {
        packetServer.close((err) => (err ? reject(err) : resolve()));
      });
    }
  }
});

test('projects viewer MCP server returns a tool error with detail when the local API responds with a non-ok json error', async () => {
  const errorServer = http.createServer((request, response) => {
    if (request.url === '/api/projects') {
      response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'service unavailable', detail: 'backend warming up' }));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolve) => errorServer.listen(0, '127.0.0.1', resolve));
  const { port } = errorServer.address();
  const mcp = startMcpClient(`http://127.0.0.1:${port}`);

  try {
    await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    mcp.notify('notifications/initialized');

    const result = await mcp.request('tools/call', { name: 'list_projects', arguments: {} });
    const errorText = result.content[0].text.trimEnd();
    assert.equal(result.isError, true);
    assert.match(errorText, /returned 503/i);
    assert.match(errorText, /application\/json/i);
    assert.match(errorText, /\/api\/projects/i);
    assert.match(errorText, /preview/i);
    assert.match(errorText, /service unavailable/i);
    assert.doesNotMatch(errorText, /\n/);
  } finally {
    await mcp.close();
    await new Promise((resolve, reject) => {
      errorServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('projects viewer MCP server rejects wrong-shape JSON responses with contract-specific errors', async () => {
  const invalidByPath = new Map([
    ['/api/projects', { generatedAt: '2026-07-09T00:00:00.000Z' }],
    ['/api/configured-projects', { projects: [{ id: 'project-1', name: 'MCP Project', path: '/tmp/project' }] }],
    ['/api/ai-context', { kind: 'all-project-ai-context', generatedAt: '2026-07-09T00:00:00.000Z' }],
    ['/api/ai-context/projects/project-1', { project: { kind: 'project-ai-context', identity: { name: 'MCP Project' } } }],
    ['/api/ai-findings', { generatedAt: '2026-07-09T00:00:00.000Z' }],
    ['/api/project-brief-report', { kind: 'project-brief-report', generatedAt: '2026-07-09T00:00:00.000Z' }],
    ['/api/agent-preflight-packet?projectId=project-1', { kind: 'project-brief-report', project: { id: 'project-1' } }],
  ]);
  const cases = [
    ['list_projects', {}, /dashboard scan payload/i],
    ['list_configured_projects', {}, /configured projects payload/i],
    ['get_ai_context', {}, /ai context payload/i],
    ['get_ai_context', { projectId: 'project-1' }, /project-ai-context.*identity\.name.*identity\.path/i],
    ['get_ai_findings', {}, /ai findings payload/i],
    ['get_project_brief_report', {}, /project brief report payload/i],
    ['get_agent_preflight_packet', { projectId: 'project-1' }, /agent preflight packet payload/i],
  ];
  const wrongShapeServer = http.createServer((request, response) => {
    const body = invalidByPath.get(request.url);
    if (body) {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(body));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolve) => wrongShapeServer.listen(0, '127.0.0.1', resolve));
  const { port } = wrongShapeServer.address();
  const mcp = startMcpClient(`http://127.0.0.1:${port}`);

  try {
    await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    mcp.notify('notifications/initialized');

    for (const [name, args, expectedContract] of cases) {
      const result = await mcp.request('tools/call', { name, arguments: args });
      assert.equal(result.isError, true, `expected tool error for ${name}`);
      const errorText = result.content[0].text.trimEnd();
      assert.match(errorText, expectedContract);
      if (name === 'get_agent_preflight_packet') {
        assert.match(errorText, /Expected kind "agent-preflight-packet"/i);
      }
    }
  } finally {
    await mcp.close();
    await new Promise((resolve, reject) => {
      wrongShapeServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('projects viewer MCP server accepts a valid project-specific AI context payload', async () => {
  const aiContextServer = http.createServer((request, response) => {
    if (request.url === '/api/ai-context/projects/project-1') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          project: {
            kind: 'project-ai-context',
            identity: {
              name: 'MCP Project',
              path: 'C:/tracked/project',
            },
          },
        }),
      );
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolve) => aiContextServer.listen(0, '127.0.0.1', resolve));
  const { port } = aiContextServer.address();
  const mcp = startMcpClient(`http://127.0.0.1:${port}`);

  try {
    await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    mcp.notify('notifications/initialized');

    const result = await mcp.request('tools/call', {
      name: 'get_ai_context',
      arguments: { projectId: 'project-1' },
    });
    assert.equal(result.isError, false);
    const payload = JSON.parse(result.content[0].text);
    assert.equal(payload.project.kind, 'project-ai-context');
    assert.equal(payload.project.identity.name, 'MCP Project');
    assert.equal(payload.project.identity.path, 'C:/tracked/project');
  } finally {
    await mcp.close();
    await new Promise((resolve, reject) => {
      aiContextServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('projects viewer MCP server accepts a valid agent preflight packet payload', async () => {
  const packetServer = http.createServer((request, response) => {
    if (request.url === '/api/agent-preflight-packet?projectId=project-1&agentRole=verification') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          kind: 'agent-preflight-packet',
          schemaVersion: 1,
          generatedAt: '2026-07-09T00:00:00.000Z',
          agentRole: 'verification',
          project: {
            id: 'project-1',
            name: 'MCP Project',
            path: 'C:/tracked/project',
          },
        }),
      );
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolve) => packetServer.listen(0, '127.0.0.1', resolve));
  const { port } = packetServer.address();
  const mcp = startMcpClient(`http://127.0.0.1:${port}`);

  try {
    await mcp.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'projects-viewer-test', version: '0.1.0' },
    });
    mcp.notify('notifications/initialized');

    const result = await mcp.request('tools/call', {
      name: 'get_agent_preflight_packet',
      arguments: { projectId: 'project-1', agentRole: 'verification' },
    });
    assert.equal(result.isError, false);
    const payload = JSON.parse(result.content[0].text);
    assert.equal(payload.kind, 'agent-preflight-packet');
    assert.equal(payload.project.id, 'project-1');
    assert.equal(payload.agentRole, 'verification');
  } finally {
    await mcp.close();
    await new Promise((resolve, reject) => {
      packetServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
