#!/usr/bin/env node
import express from 'express';
import chokidar from 'chokidar';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { runScan } from './scan-projects.mjs';
import { createScanController } from './server/scan-controller.mjs';
import {
  addProject,
  addWorkspace,
  ensureProjectConfig,
  getConfigPaths,
  getConfiguredProjectIdentities,
  getEnabledProjects,
  readProjectConfig,
  removeProject,
  updateProject,
} from './server/project-config.mjs';
import {
  discoverWorkspaceProjects,
  validateDiscoveredProjectSelection,
} from './server/project-discovery.mjs';
import { browseFolder as defaultBrowseFolder } from './server/folder-picker.mjs';
import {
  buildAllProjectsAiContext,
  buildProjectAiContext,
  compareAiContextChanges,
  readAiContextSnapshot,
  writeAiContextSnapshot,
} from './server/ai-context.mjs';
import {
  filterFindings,
  generateFindings,
  getFindingsPath,
  readFindingsStore,
  updateFindingReviewState,
} from './server/ai-findings.mjs';
import { buildAgentPreflightPacket } from './server/agent-preflight-packet.mjs';
import { buildProjectBriefReport } from './server/project-brief-report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? '127.0.0.1';
const MODE =
  process.argv.includes('--production') || process.env.NODE_ENV === 'production'
    ? 'production'
    : 'development';
const WATCH_DEBOUNCE_MS = 3_000;
const MAX_FILE_SIZE = 1024 * 1024;

const WATCH_PATTERNS = [
  'README*.md',
  'CLAUDE*.md',
  'AGENTS*.md',
  'TODO*.md',
  '*roadmap*.md',
  '*roamap*.md',
  '*plan*.md',
  '*phase*.md',
  '*sdd*.md',
  '*spec*.md',
  '*proposal*.md',
  '*requirements*.md',
  '*architecture*.md',
  '*design*.md',
  '*audit*.md',
  '*review*.md',
  '*verification*.md',
  '*checklist*.md',
  '*handoff*.md',
  'docs/**/*.md',
  'specs/**/*.md',
  '.openspec/**/*.md',
  'openapi/**/*.md',
];

const IGNORED_WATCH_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/vendor/**',
  '**/archives/**',
  '**/images/**',
  '**/videos/**',
  '**/audio/**',
  '**/*.sql',
  '**/*.db',
  '**/*.sqlite',
];

async function readConfig(configOptions = {}) {
  return readProjectConfig(configOptions);
}

async function readProjectsOutput(configOptions = {}) {
  const { generatedPath } = getConfigPaths(configOptions);
  const raw = await fs.readFile(generatedPath, 'utf8');
  return JSON.parse(raw);
}

function createDashboardRunScan(configOptions = {}) {
  const { configPath, generatedPath } = getConfigPaths(configOptions);
  return async () =>
    runScan({
      configPath,
      outputPath: generatedPath,
      quiet: false,
      logger: console,
    });
}

async function createWatcher(controller, configOptions = {}) {
  const config = await readConfig(configOptions);
  if (config.settings?.watchDocs === false) {
    console.log('Documentation watcher disabled by projects.config.json');
    return null;
  }

  const roots = getEnabledProjects(config)
    .filter((project) => project?.path && typeof project.path === 'string')
    .map((project) => path.resolve(project.path));
  if (roots.length === 0) return null;

  let debounceTimer = null;
  const watcher = chokidar.watch(roots, {
    ignoreInitial: true,
    ignored: (candidatePath, stats) => shouldIgnoreWatchPath(candidatePath, stats),
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  const scheduleScan = async (changedPath) => {
    const root = roots.find((candidateRoot) => isInsideRoot(changedPath, candidateRoot));
    if (!root || !isWatchedDocFile(root, changedPath)) return;
    try {
      const stat = await fs.stat(changedPath);
      if (!stat.isFile() || stat.size > MAX_FILE_SIZE) {
        console.warn(`Watcher skipped ${changedPath}: not a file or larger than 1 MB`);
        return;
      }
    } catch (err) {
      console.warn(`Watcher skipped ${changedPath}: ${err.message}`);
      return;
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void controller.requestScan('watcher');
    }, WATCH_DEBOUNCE_MS);
  };

  watcher.on('add', scheduleScan);
  watcher.on('change', scheduleScan);
  watcher.on('unlink', (changedPath) => {
    const root = roots.find((candidateRoot) => isInsideRoot(changedPath, candidateRoot));
    if (!root || !isWatchedDocFile(root, changedPath)) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void controller.requestScan('watcher');
    }, WATCH_DEBOUNCE_MS);
  });
  watcher.on('error', (error) => console.error(`Documentation watcher error: ${error.message}`));

  console.log(`Watching documentation in ${roots.length} configured project path(s)`);
  return watcher;
}

function isInsideRoot(candidatePath, root) {
  const rel = path.relative(root, candidatePath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function shouldIgnoreWatchPath(candidatePath, stats) {
  const normalized = candidatePath.replaceAll('\\', '/').toLowerCase();
  if (IGNORED_WATCH_PATTERNS.some((pattern) => watchPatternMatches(normalized, pattern))) {
    return true;
  }
  if (stats?.isFile()) {
    if (stats.size > MAX_FILE_SIZE) return true;
    if (!normalized.endsWith('.md')) return true;
  }
  return false;
}

function isWatchedDocFile(root, candidatePath) {
  const rel = path.relative(root, candidatePath).replaceAll('\\', '/');
  const lower = rel.toLowerCase();
  const base = path.posix.basename(lower);
  if (!lower.endsWith('.md')) return false;
  if (lower.split('/').some((part) => ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor', 'archives', 'images', 'videos', 'audio'].includes(part))) {
    return false;
  }
  if (['.sql', '.db', '.sqlite'].some((ext) => lower.endsWith(ext))) return false;
  if (/^(readme|claude|agents|todo).*\.md$/.test(base)) return true;
  if (/(roadmap|roamap|plan|phase|sdd|spec|proposal|requirements|architecture|design|audit|review|verification|checklist|handoff).*\.md$/.test(base)) {
    return true;
  }
  return /^(docs|specs|\.openspec|openapi)\//.test(lower);
}

function watchPatternMatches(normalizedPath, pattern) {
  const clean = pattern.replaceAll('\\', '/').toLowerCase();
  if (clean.startsWith('**/') && clean.endsWith('/**')) {
    const part = clean.slice(3, -3);
    return normalizedPath.includes(`/${part}/`) || normalizedPath.endsWith(`/${part}`);
  }
  if (clean.startsWith('**/*.')) return normalizedPath.endsWith(clean.slice(4));
  return false;
}

function isDomainError(err) {
  return Boolean(err?.code && Number.isInteger(err?.statusCode));
}

function serializeDomainError(err) {
  return { error: err.message, code: err.code };
}

async function pathExists(candidatePath) {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

function toRepoRelative(candidatePath) {
  return path.relative(__dirname, candidatePath).replaceAll('\\', '/');
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findFirstMatch(source, pattern) {
  const match = pattern.exec(source);
  if (!match) return null;
  const index = match.index ?? source.indexOf(match[0]);
  const line = source.slice(0, index).split('\n').length;
  return { match, line };
}

async function readTextIfExists(candidatePath) {
  try {
    return await fs.readFile(candidatePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function readAgentPreflightFindings(configOptions) {
  if (!(await pathExists(getFindingsPath(configOptions)))) return null;
  return readFindingsStore(configOptions);
}

async function readAgentPreflightAiContext(configOptions) {
  const snapshot = await readAiContextSnapshot(configOptions);
  return snapshot?.context ?? null;
}

async function readAgentPreflightOpenSpecState(changeId) {
  const specsRoot = path.join(__dirname, 'openspec', 'specs');
  const changesRoot = path.join(__dirname, 'openspec', 'changes');
  const [acceptedSpecs, changes] = await Promise.all([
    readAcceptedSpecReferences(specsRoot),
    readOpenSpecChangeSummaries(changesRoot),
  ]);

  const requestedChange = changeId ? changes.find((entry) => entry.id === changeId) ?? null : null;
  const changeDetail = requestedChange
    ? await readOpenSpecChangeDetail(path.join(changesRoot, changeId), requestedChange)
    : null;

  return {
    acceptedSpecs,
    changes,
    change: changeDetail?.change ?? null,
    tasks: changeDetail?.tasks ?? [],
    artifacts: changeDetail?.artifacts ?? requestedChange?.artifacts ?? [],
  };
}

async function readAcceptedSpecReferences(specsRoot) {
  if (!(await pathExists(specsRoot))) return [];
  const entries = await fs.readdir(specsRoot, { withFileTypes: true });
  const acceptedSpecs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(specsRoot, entry.name, 'spec.md');
    const source = await readTextIfExists(specPath);
    if (!source) continue;
    const requirement = findFirstMatch(source, /^### Requirement:\s+(.+)$/m);
    const title = requirement?.match[1]?.trim() || entry.name;
    acceptedSpecs.push({
      id: `accepted:${entry.name}`,
      title,
      evidenceTarget: 'Accepted behavior should remain covered by focused verification evidence.',
      file: toRepoRelative(specPath),
      line: requirement?.line ?? 1,
    });
  }
  return acceptedSpecs;
}

async function readOpenSpecChangeSummaries(changesRoot) {
  if (!(await pathExists(changesRoot))) return [];
  const entries = await fs.readdir(changesRoot, { withFileTypes: true });
  const changes = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const changeDir = path.join(changesRoot, entry.name);
    const summary = await summarizeOpenSpecChange(changeDir, entry.name);
    changes.push(summary);
  }
  return changes;
}

async function summarizeOpenSpecChange(changeDir, changeId) {
  const artifacts = [];
  for (const candidate of [
    path.join(changeDir, 'proposal.md'),
    path.join(changeDir, 'design.md'),
    path.join(changeDir, 'tasks.md'),
    path.join(changeDir, 'specs', changeId, 'spec.md'),
  ]) {
    if (await pathExists(candidate)) artifacts.push(toRepoRelative(candidate));
  }

  const specPath = path.join(changeDir, 'specs', changeId, 'spec.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const [specSource, tasksSource] = await Promise.all([
    readTextIfExists(specPath),
    readTextIfExists(tasksPath),
  ]);
  const requirementCount = (specSource?.match(/^### Requirement:\s+/gm) ?? []).length;
  const scenarioCount = (specSource?.match(/^#### Scenario:\s+/gm) ?? []).length;
  const taskMatches = tasksSource?.match(/^- \[(?: |x)\] /gm) ?? [];
  const openTaskMatches = tasksSource?.match(/^- \[ \] /gm) ?? [];

  return {
    id: changeId,
    status: 'proposed',
    requirementCount,
    scenarioCount,
    taskCount: taskMatches.length,
    openTaskCount: openTaskMatches.length,
    artifacts,
  };
}

async function readOpenSpecChangeDetail(changeDir, summary) {
  const specPath = path.join(changeDir, 'specs', summary.id, 'spec.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const [specSource, tasksSource] = await Promise.all([
    readTextIfExists(specPath),
    readTextIfExists(tasksPath),
  ]);
  const specRelativePath = toRepoRelative(specPath);
  const tasksRelativePath = toRepoRelative(tasksPath);
  const requirements = [];

  if (specSource) {
    const requirementPattern = /^### Requirement:\s+(.+)$/gm;
    for (const match of specSource.matchAll(requirementPattern)) {
      const index = match.index ?? specSource.indexOf(match[0]);
      const line = specSource.slice(0, index).split('\n').length;
      requirements.push({
        id: `${summary.id}:${slugify(match[1])}`,
        title: match[1].trim(),
        evidenceTarget: 'Proposed change requirement should be verified by focused packet tests.',
        file: specRelativePath,
        line,
      });
    }
  }

  const tasks = [];
  if (tasksSource) {
    const taskPattern = /^- \[( |x)\] (?:(\d+(?:\.\d+)*)\s+)?(.+)$/gm;
    for (const match of tasksSource.matchAll(taskPattern)) {
      const title = match[3]?.trim();
      if (!title) continue;
      const index = match.index ?? tasksSource.indexOf(match[0]);
      const line = tasksSource.slice(0, index).split('\n').length;
      const id = match[2] ?? `${summary.id}:task:${slugify(title)}`;
      tasks.push({
        id,
        title,
        evidenceTarget: `Task ${id} evidence recorded.`,
        file: tasksRelativePath,
        line,
      });
    }
  }

  return {
    artifacts: summary.artifacts,
    change: {
      ...summary,
      requirements,
    },
    tasks,
  };
}

async function readAgentPreflightPhaseSignals() {
  const roadmapPath = path.join(__dirname, 'docs', 'ROADMAP.md');
  const roadmapSource = await readTextIfExists(roadmapPath);
  if (!roadmapSource) return null;
  const currentPhase = findFirstMatch(roadmapSource, /^- Current phase:\s+(.+)$/m);
  const currentPhaseText = currentPhase?.match[1]?.trim() ?? '';
  if (!currentPhaseText || /^no active implementation phase/i.test(currentPhaseText)) return null;
  const phaseNumber = currentPhaseText.match(/Phase\s+(\d+)/i)?.[1];
  if (!phaseNumber) return null;

  const phasesRoot = path.join(__dirname, 'docs', 'phases');
  const phaseEntries = await fs.readdir(phasesRoot, { withFileTypes: true }).catch(() => []);
  const phaseEntry = phaseEntries.find(
    (entry) => entry.isFile() && entry.name.startsWith(`PHASE_${phaseNumber}_`) && entry.name.endsWith('.md'),
  );
  if (!phaseEntry) return null;

  const relativePath = toRepoRelative(path.join(phasesRoot, phaseEntry.name));
  return {
    requiredReading: [
      {
        path: relativePath,
        title: `Phase ${phaseNumber} plan`,
        reason: 'Current roadmap phase implementation details.',
        evidence: [{ kind: 'source', file: relativePath }],
      },
    ],
  };
}

async function readAgentPreflightAuditSignals() {
  const auditPath = path.join(__dirname, 'docs', 'CURRENT_PROJECT_AUDIT.md');
  if (!(await pathExists(auditPath))) return null;
  const relativePath = toRepoRelative(auditPath);
  return {
    requiredReading: [
      {
        path: relativePath,
        title: 'Current project audit',
        reason: 'Known findings and implementation risks.',
        evidence: [{ kind: 'source', file: relativePath }],
      },
    ],
  };
}

async function readAgentPreflightChecklistSignals() {
  const checklistPath = path.join(__dirname, 'docs', 'AI_STEP_VERIFICATION_CHECKLIST.md');
  if (!(await pathExists(checklistPath))) return null;
  const relativePath = toRepoRelative(checklistPath);
  return {
    requiredReading: [
      {
        path: relativePath,
        title: 'AI verification checklist',
        reason: 'Required verification guardrails.',
        evidence: [{ kind: 'source', file: relativePath }],
      },
    ],
    expectations: [
      {
        kind: 'command',
        command: 'npm test -- tests/agent-preflight-packet.test.mjs',
        reason: 'Focused verification for the agent preflight packet route.',
        expectedEvidence: 'Focused agent preflight packet tests pass.',
        evidence: [{ kind: 'source', file: relativePath }],
      },
      {
        kind: 'command',
        command: 'git diff --check',
        reason: 'Detect whitespace and patch formatting issues.',
        expectedEvidence: 'git diff --check exits cleanly.',
        evidence: [{ kind: 'source', file: relativePath }],
      },
    ],
  };
}

export async function createApp({
  appDataDir,
  skipStartupScan = false,
  skipWatcher = false,
  skipFrontend = false,
  browseFolder = defaultBrowseFolder,
  logger = console,
} = {}) {
  const app = express();
  app.locals.closeFrontend = null;
  const configOptions = { appDataDir };
  await ensureProjectConfig(configOptions);
  const controller = createScanController({ runScan: createDashboardRunScan(configOptions), logger });
  let watcher = null;

  app.use(express.json({ limit: '16kb' }));
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed' && req.path.startsWith('/api')) {
      res.status(400).json({
        error: 'Malformed JSON request body.',
        code: 'malformed-json',
      });
      return;
    }
    next(err);
  });

  async function restartWatcher() {
    if (skipWatcher) return;
    if (watcher) await watcher.close();
    watcher = await createWatcher(controller, configOptions);
  }

  function sendError(res, err) {
    res.status(err.statusCode ?? 500).json({ error: err.message });
  }

  function sendProjectBriefReportError(res, err) {
    if (err.code === 'missing-generated-scan-data' || err.statusCode === 404) {
      res.status(404).json({
        error: 'Generated scan data is missing. Run a scan before requesting a project brief report.',
        code: 'missing-generated-scan-data',
      });
      return;
    }
    sendError(res, err);
  }

  function sendAgentPreflightPacketError(res, err) {
    if (isDomainError(err)) {
      res.status(err.statusCode).json(serializeDomainError(err));
      return;
    }
    sendError(res, err);
  }

  async function readGeneratedScan() {
    try {
      return await readProjectsOutput(configOptions);
    } catch (err) {
      if (err.code === 'ENOENT') {
        const missing = new Error('Generated scan data is missing. Run a scan before requesting AI context.');
        missing.code = 'missing-generated-scan-data';
        missing.statusCode = 404;
        throw missing;
      }
      if (err instanceof SyntaxError) {
        const invalid = new Error('Generated scan data is missing or invalid.');
        invalid.code = 'missing-generated-scan-data';
        invalid.statusCode = 404;
        throw invalid;
      }
      throw err;
    }
  }

  async function readProjectBriefFindings() {
    try {
      await fs.access(getFindingsPath(configOptions));
      const store = await readFindingsStore(configOptions);
      return store.findings;
    } catch {
      return null;
    }
  }

  async function readProjectBriefSnapshot() {
    try {
      return await readAiContextSnapshot(configOptions);
    } catch {
      return null;
    }
  }

  function parseProjectBriefReportQuery(req) {
    const url = new URL(req.originalUrl, 'http://127.0.0.1');
    const allowed = new Set(['since', 'mode']);
    for (const key of new Set(url.searchParams.keys())) {
      if (!allowed.has(key)) {
        const err = new Error('Unsupported parameter. Allowed parameters: since, mode.');
        err.statusCode = 400;
        throw err;
      }
      if (url.searchParams.getAll(key).length > 1) {
        const err = new Error(`${key} must be provided at most once.`);
        err.statusCode = 400;
        throw err;
      }
    }

    const mode = url.searchParams.get('mode') ?? 'daily';
    if (!['daily', 'weekly'].includes(mode)) {
      const err = new Error('mode must be daily or weekly.');
      err.statusCode = 400;
      throw err;
    }

    const sinceRaw = url.searchParams.get('since');
    if (sinceRaw === null) return { mode, since: null };
    const strictIsoWithZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    const sinceDate = new Date(sinceRaw);
    if (!strictIsoWithZone.test(sinceRaw) || !Number.isFinite(sinceDate.getTime())) {
      const err = new Error('since must be a valid ISO timestamp.');
      err.statusCode = 400;
      throw err;
    }
    return { mode, since: sinceDate.toISOString() };
  }

  function parseAgentPreflightPacketQuery(req) {
    const url = new URL(req.originalUrl, 'http://127.0.0.1');
    const allowed = new Set(['projectId', 'changeId', 'agentRole']);
    for (const key of new Set(url.searchParams.keys())) {
      if (!allowed.has(key)) {
        const err = new Error('Unsupported parameter. Allowed parameters: projectId, changeId, agentRole.');
        err.code = 'invalid-query';
        err.statusCode = 400;
        throw err;
      }
    }

    const getScalar = (key) => {
      const values = url.searchParams.getAll(key);
      if (values.length === 0) return null;
      if (values.length > 1) {
        const err = new Error(`${key} must be provided at most once.`);
        err.code = 'invalid-query';
        err.statusCode = 400;
        throw err;
      }
      return values[0];
    };

    const projectId = getScalar('projectId');
    if (projectId === null || projectId.trim() === '') {
      const err = new Error('projectId is required.');
      err.code = 'invalid-query';
      err.statusCode = 400;
      throw err;
    }

    const changeId = getScalar('changeId');
    const agentRole = getScalar('agentRole') ?? 'implementation';
    if (!['implementation', 'reviewer', 'verification', 'handoff'].includes(agentRole)) {
      const err = new Error('agentRole must be one of: implementation, reviewer, verification, handoff.');
      err.code = 'invalid-query';
      err.statusCode = 400;
      throw err;
    }

    return { projectId, changeId, agentRole };
  }

  function parseConfiguredProjectsQuery(req) {
    const url = new URL(req.originalUrl, 'http://127.0.0.1');
    if ([...url.searchParams.keys()].length > 0) {
      const err = new Error('Query parameters are not supported.');
      err.code = 'invalid-query';
      err.statusCode = 400;
      throw err;
    }
  }

  app.get('/api/config', async (_req, res) => {
    try {
      res.json(await readProjectConfig(configOptions));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/configured-projects', async (req, res) => {
    try {
      parseConfiguredProjectsQuery(req);
      const config = await readProjectConfig(configOptions);
      res.json({ projects: getConfiguredProjectIdentities(config) });
    } catch (err) {
      if (isDomainError(err)) {
        res.status(err.statusCode).json(serializeDomainError(err));
        return;
      }
      sendError(res, err);
    }
  });

  app.post('/api/browse-folder', async (_req, res) => {
    try {
      const selectedPath = await browseFolder();
      if (!selectedPath) {
        res.status(204).end();
        return;
      }
      res.json({ path: selectedPath });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const result = await addProject(req.body, configOptions);
      await restartWatcher();
      res.status(result.created ? 201 : 200).json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/projects/:id', async (req, res) => {
    try {
      const result = await updateProject(req.params.id, req.body, configOptions);
      await restartWatcher();
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const result = await removeProject(req.params.id, configOptions);
      await restartWatcher();
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/workspaces', async (req, res) => {
    try {
      const result = await addWorkspace(req.body, configOptions);
      res.status(result.created ? 201 : 200).json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/workspaces/:id/discover', async (req, res) => {
    try {
      const config = await readProjectConfig(configOptions);
      const workspace = config.workspaces.find((entry) => entry.id === req.params.id);
      if (!workspace) {
        const err = new Error('Workspace not found.');
        err.statusCode = 404;
        throw err;
      }
      const discovery = await discoverWorkspaceProjects(workspace);
      res.json({ workspace, ...discovery, candidates: discovery.discoveredProjects });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/projects/track-discovered', async (req, res) => {
    try {
      const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
      if (paths.length === 0) {
        const err = new Error('At least one discovered project path is required.');
        err.statusCode = 400;
        throw err;
      }
      const initialConfig = await readProjectConfig(configOptions);
      const validation = await validateDiscoveredProjectSelection(
        paths,
        initialConfig.workspaces,
        initialConfig.projects,
      );
      if (validation.invalid.length > 0) {
        res.status(400).json({
          error: 'Some selected project paths cannot be tracked.',
          invalid: validation.invalid,
        });
        return;
      }
      const projects = [];
      for (const candidate of validation.valid) {
        const result = await addProject({ path: candidate.path }, configOptions);
        projects.push(result.project);
      }
      await restartWatcher();
      res.status(201).json({ projects, config: await readProjectConfig(configOptions) });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/projects', async (_req, res) => {
    try {
      res.json(await readProjectsOutput(configOptions));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/project-brief-report', async (req, res) => {
    try {
      const { mode, since } = parseProjectBriefReportQuery(req);
      const scan = await readGeneratedScan();
      const config = await readProjectConfig(configOptions);
      const findings = await readProjectBriefFindings();
      const previousSnapshot = await readProjectBriefSnapshot();
      const comparisonFindings = Array.isArray(findings) ? findings : [];
      const changes =
        since && previousSnapshot?.context
          ? compareAiContextChanges(scan, {
              since,
              findings: comparisonFindings,
              previousContext: previousSnapshot.context,
              config,
            })
          : null;
      res.json(
        buildProjectBriefReport({
          scanOutput: scan,
          config,
          findings,
          changes,
          previousSnapshotAvailable: Boolean(previousSnapshot?.context),
          mode,
          since,
        }),
      );
    } catch (err) {
      sendProjectBriefReportError(res, err);
    }
  });

  app.get('/api/agent-preflight-packet', async (req, res) => {
    try {
      const { projectId, changeId, agentRole } = parseAgentPreflightPacketQuery(req);
      const [scan, config, aiContext, findingsStore, openspecState, phaseSignals, auditSignals, checklistSignals] =
        await Promise.all([
          readGeneratedScan(),
          readProjectConfig(configOptions),
          readAgentPreflightAiContext(configOptions),
          readAgentPreflightFindings(configOptions),
          readAgentPreflightOpenSpecState(changeId),
          readAgentPreflightPhaseSignals(),
          readAgentPreflightAuditSignals(),
          readAgentPreflightChecklistSignals(),
        ]);

      res.json(
        buildAgentPreflightPacket({
          scanOutput: scan,
          config,
          projectId,
          changeId,
          agentRole,
          aiContext,
          findings: findingsStore?.findings ?? null,
          openspecState,
          phaseSignals,
          auditSignals,
          checklistSignals,
        }),
      );
    } catch (err) {
      sendAgentPreflightPacketError(res, err);
    }
  });

  app.get('/api/ai-context', async (_req, res) => {
    try {
      const scan = await readGeneratedScan();
      const config = await readProjectConfig(configOptions);
      const findingsStore = await generateFindings(scan, configOptions);
      res.json(buildAllProjectsAiContext(scan, { config, findings: findingsStore.findings }));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/ai-context/projects/:id', async (req, res) => {
    try {
      const scan = await readGeneratedScan();
      const config = await readProjectConfig(configOptions);
      const configProject = config.projects.find((project) => project.id === req.params.id);
      if (!configProject) {
        const err = new Error('Tracked project not found.');
        err.statusCode = 404;
        throw err;
      }
      const project = scan.projects.find(
        (entry) => path.resolve(entry.path).toLowerCase() === path.resolve(configProject.path).toLowerCase(),
      );
      if (!project) {
        const err = new Error('Generated scan data does not contain the requested tracked project.');
        err.statusCode = 404;
        throw err;
      }
      const findingsStore = await generateFindings(scan, configOptions);
      res.json({ project: buildProjectAiContext(project, { configProject, findings: findingsStore.findings }) });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/ai-context/changes', async (req, res) => {
    try {
      const scan = await readGeneratedScan();
      const config = await readProjectConfig(configOptions);
      const findingsStore = await generateFindings(scan, configOptions);
      const previousSnapshot = await readAiContextSnapshot(configOptions);
      const currentContext = buildAllProjectsAiContext(scan, { config, findings: findingsStore.findings });
      const changes = compareAiContextChanges(scan, {
        since: req.query.since,
        findings: findingsStore.findings,
        previousContext: previousSnapshot?.context ?? null,
        config,
      });
      await writeAiContextSnapshot(currentContext, configOptions);
      res.json(changes);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/ai-findings', async (req, res) => {
    try {
      const scan = await readGeneratedScan();
      const findingsStore = await generateFindings(scan, configOptions);
      res.json({
        generatedAt: findingsStore.generatedAt,
        findings: filterFindings(findingsStore.findings, req.query.state ?? 'unresolved'),
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/ai-findings/:id', async (req, res) => {
    try {
      const finding = await updateFindingReviewState(req.params.id, req.body?.reviewState, configOptions);
      res.json({ finding });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/scan-status', (_req, res) => {
    res.json(controller.getStatus());
  });

  app.post('/api/rescan', async (req, res) => {
    const trigger = req.body?.trigger === 'interval' ? 'interval' : 'manual';
    const status = await controller.requestScan(trigger);
    res.status(status.status === 'error' ? 500 : 200).json(status);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'API route not found.',
      code: 'api-route-not-found',
    });
  });

  if (!skipStartupScan) await controller.requestScan('startup');
  if (!skipWatcher) watcher = await createWatcher(controller, configOptions);

  if (skipFrontend) {
    return app;
  }

  if (MODE === 'development') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.locals.closeFrontend = () => vite.close();
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.use((_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp()
    .then((app) => {
      app.listen(PORT, HOST, () => {
        console.log(`Projects Viewer live dashboard: http://${HOST}:${PORT}`);
      });
    })
    .catch((err) => {
      console.error(`Server failed: ${err.message}`);
      process.exit(1);
    });
}
