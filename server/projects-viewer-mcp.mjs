import readline from 'node:readline';

const API_BASE_URL = process.env.PROJECTS_VIEWER_API_BASE_URL ?? 'http://127.0.0.1:5173';

const tools = [
  {
    name: 'list_projects',
    description: 'List configured Projects Viewer projects from the local read-only API.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_configured_projects',
    description: 'List compact saved Projects Viewer project ids from the local read-only API.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_agent_preflight_packet',
    description: 'Fetch a read-only agent preflight packet for a saved project id.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        changeId: { type: 'string' },
        agentRole: { type: 'string', enum: ['implementation', 'reviewer', 'verification', 'handoff'] },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_project_brief_report',
    description: 'Fetch a local project brief report from the read-only API.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['daily', 'weekly'] },
        since: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_ai_context',
    description: 'Fetch compact local AI context for all projects or one saved project id.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_ai_findings',
    description: 'Fetch local review-required AI findings from the read-only API.',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['unresolved', 'resolved', 'all'] },
      },
      additionalProperties: false,
    },
  },
];

const handlers = {
  list_projects: () =>
    requestJson('/api/projects', {
      contractName: 'dashboard scan payload',
      validate: validateDashboardScanPayload,
    }),
  list_configured_projects: () =>
    requestJson('/api/configured-projects', {
      contractName: 'configured projects payload',
      validate: validateConfiguredProjectsPayload,
    }),
  get_agent_preflight_packet: (args) => {
    const params = new URLSearchParams({ projectId: requiredString(args, 'projectId') });
    if (args.changeId) params.set('changeId', String(args.changeId));
    if (args.agentRole) params.set('agentRole', String(args.agentRole));
    return requestJson(`/api/agent-preflight-packet?${params.toString()}`, {
      contractName: 'agent preflight packet payload',
      validate: validateAgentPreflightPacketPayload,
    });
  },
  get_project_brief_report: (args) => {
    const params = new URLSearchParams();
    if (args.mode) params.set('mode', String(args.mode));
    if (args.since) params.set('since', String(args.since));
    return requestJson(`/api/project-brief-report${params.size ? `?${params.toString()}` : ''}`, {
      contractName: 'project brief report payload',
      validate: validateProjectBriefReportPayload,
    });
  },
  get_ai_context: (args) =>
    requestJson(args.projectId ? `/api/ai-context/projects/${encodeURIComponent(String(args.projectId))}` : '/api/ai-context', {
      contractName: 'AI context payload',
      validate: validateAiContextPayload,
    }),
  get_ai_findings: (args) => {
    const params = new URLSearchParams();
    if (args.state) params.set('state', String(args.state));
    return requestJson(`/api/ai-findings${params.size ? `?${params.toString()}` : ''}`, {
      contractName: 'AI findings payload',
      validate: validateAiFindingsPayload,
    });
  },
};

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch (err) {
    respond(null, null, { code: -32700, message: `Parse error: ${err.message}` });
    return;
  }

  if (!Object.hasOwn(message, 'id')) return;

  try {
    if (message.method === 'initialize') {
      respond(message.id, {
        protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'projects-viewer', version: '0.1.0' },
        instructions:
          'Use these tools only for read-only Projects Viewer context. Do not treat advisory packet output as permission to write tasks, calendar events, shell commands, commits, or remote calls.',
      });
      return;
    }

    if (message.method === 'tools/list') {
      respond(message.id, { tools });
      return;
    }

    if (message.method === 'tools/call') {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      const handler = handlers[name];
      if (!handler) throw new Error(`Unknown tool: ${name}`);
      const payload = await handler(args);
      respond(message.id, {
        content: [{ type: 'text', text: `${JSON.stringify(payload, null, 2)}\n` }],
        isError: false,
      });
      return;
    }

    respond(message.id, null, { code: -32601, message: `Method not found: ${message.method}` });
  } catch (err) {
    respond(message.id, {
      content: [{ type: 'text', text: `${err.message}\n` }],
      isError: true,
    });
  }
});

function respond(id, result, error) {
  const payload = error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function requestJson(pathname, { contractName = null, validate = null } = {}) {
  const response = await fetch(new URL(pathname, API_BASE_URL));
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? 'unknown';
  const isJson = /^\s*application\/json\b/i.test(contentType);
  const errorContext = formatApiErrorContext({
    pathname,
    status: response.status,
    contentType,
    bodyPreview: createBodyPreview(text),
  });

  if (!isJson) {
    throw new Error(
      `Expected JSON response from Projects Viewer API. ${errorContext}. Start the local dashboard with "npm run dev" and retry.`,
    );
  }

  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`Projects Viewer API returned malformed JSON. ${errorContext}. Parse error: ${err.message}`);
  }
  if (!response.ok) {
    throw new Error(
      `Projects Viewer API returned ${response.status}. ${errorContext}. Start the local dashboard with "npm run dev" and retry.`,
    );
  }
  if (typeof validate === 'function') {
    const validationError = validate(body);
    if (validationError) {
      throw new Error(
        `Projects Viewer API returned wrong shape for ${contractName}. Expected ${validationError}. ${errorContext}.`,
      );
    }
  }
  return body;
}

function formatApiErrorContext({ pathname, status, contentType, bodyPreview }) {
  return `API path ${pathname}, status ${status}, content-type ${contentType}, preview "${bodyPreview}"`;
}

function createBodyPreview(body) {
  if (!body) return '(empty)';
  return body.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function requiredString(args, key) {
  const value = args?.[key];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${key} is required.`);
  return value;
}

function validateDashboardScanPayload(body) {
  if (!isObject(body) || !isString(body.generatedAt) || !Array.isArray(body.projects)) {
    return 'generatedAt string and projects array';
  }
  return null;
}

function validateConfiguredProjectsPayload(body) {
  if (!isObject(body) || !Array.isArray(body.projects)) {
    return 'projects array of compact project identities';
  }
  if (
    !body.projects.every(
      (project) =>
        isObject(project) &&
        isString(project.id) &&
        isString(project.name) &&
        isString(project.path) &&
        typeof project.enabled === 'boolean' &&
        Array.isArray(project.tags),
    )
  ) {
    return 'projects array of compact project identities';
  }
  return null;
}

function validateAiContextPayload(body) {
  if (!isObject(body) || !isString(body.kind)) {
    return 'all-project or single-project AI context contract';
  }
  if (body.kind === 'all-project-ai-context') {
    return !isString(body.generatedAt) || !Array.isArray(body.projects) ? 'kind "all-project-ai-context" with generatedAt string and projects array' : null;
  }
  if (body.kind === 'project-ai-context') {
    return !isObject(body.identity) || !isString(body.identity.name) || !isString(body.identity.path)
      ? 'kind "project-ai-context" with identity.name and identity.path strings'
      : null;
  }
  return 'kind "all-project-ai-context" or "project-ai-context"';
}

function validateAiFindingsPayload(body) {
  if (!isObject(body) || !isString(body.generatedAt) || !Array.isArray(body.findings)) {
    return 'generatedAt string and findings array';
  }
  return null;
}

function validateProjectBriefReportPayload(body) {
  if (!isObject(body) || body.kind !== 'project-brief-report' || !isString(body.generatedAt) || !Array.isArray(body.items)) {
    return 'kind "project-brief-report" with generatedAt string and items array';
  }
  return null;
}

function validateAgentPreflightPacketPayload(body) {
  if (!isObject(body) || body.kind !== 'agent-preflight-packet') {
    return 'kind "agent-preflight-packet"';
  }
  return null;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value) {
  return typeof value === 'string';
}
