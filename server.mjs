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
} from './server/ai-context.mjs';
import {
  filterFindings,
  generateFindings,
  updateFindingReviewState,
} from './server/ai-findings.mjs';

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

export async function createApp({
  appDataDir,
  legacyConfigPath = path.join(__dirname, 'projects.config.json'),
  skipStartupScan = false,
  skipWatcher = false,
  skipFrontend = false,
  browseFolder = defaultBrowseFolder,
  logger = console,
} = {}) {
  const app = express();
  const configOptions = { appDataDir, legacyConfigPath };
  await ensureProjectConfig(configOptions);
  const controller = createScanController({ runScan: createDashboardRunScan(configOptions), logger });
  let watcher = null;

  app.use(express.json({ limit: '16kb' }));

  async function restartWatcher() {
    if (skipWatcher) return;
    if (watcher) await watcher.close();
    watcher = await createWatcher(controller, configOptions);
  }

  function sendError(res, err) {
    res.status(err.statusCode ?? 500).json({ error: err.message });
  }

  async function readGeneratedScan() {
    try {
      return await readProjectsOutput(configOptions);
    } catch (err) {
      if (err.code === 'ENOENT') {
        const missing = new Error('Generated scan data is missing. Run a scan before requesting AI context.');
        missing.statusCode = 404;
        throw missing;
      }
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
      const findingsStore = await generateFindings(scan, configOptions);
      res.json(compareAiContextChanges(scan, { since: req.query.since, findings: findingsStore.findings }));
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
