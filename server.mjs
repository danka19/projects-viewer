#!/usr/bin/env node
import express from 'express';
import chokidar from 'chokidar';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { runScan } from './scan-projects.mjs';
import { createScanController } from './server/scan-controller.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'projects.config.json');
const OUTPUT_PATH = path.join(__dirname, 'src', 'data', 'projects.json');
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

async function readConfig() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

async function readProjectsOutput() {
  const raw = await fs.readFile(OUTPUT_PATH, 'utf8');
  return JSON.parse(raw);
}

function createDashboardRunScan() {
  return async () =>
    runScan({
      configPath: CONFIG_PATH,
      outputPath: OUTPUT_PATH,
      quiet: false,
      logger: console,
    });
}

async function createWatcher(controller) {
  const config = await readConfig();
  if (config.watchDocs === false) {
    console.log('Documentation watcher disabled by projects.config.json');
    return null;
  }

  const projects = Array.isArray(config.projects) ? config.projects : [];
  const roots = projects
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

async function createApp() {
  const app = express();
  const controller = createScanController({ runScan: createDashboardRunScan(), logger: console });

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/projects', async (_req, res) => {
    try {
      res.json(await readProjectsOutput());
    } catch (err) {
      res.status(500).json({ error: err.message });
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

  await controller.requestScan('startup');
  await createWatcher(controller);

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
