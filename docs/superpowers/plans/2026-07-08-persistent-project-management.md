# Persistent Project Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build persistent local project and workspace management so tracked projects can be added from the dashboard, saved in `app-data/projects.config.json`, discovered from workspace folders, and preserved across app restarts.

**Architecture:** Add focused server modules for persistent config and workspace discovery, then wire them into the existing Express server, scan controller, scanner, watcher, and React dashboard. The scanner and watcher read only enabled projects from saved canonical config; frontend path input can save config entries but cannot trigger direct arbitrary scans.

**Tech Stack:** Node.js ES modules, Express 5, Chokidar, React 19, TypeScript, Tailwind CSS, Node built-in `node:test`, Vite.

## Global Constraints

- Keep the app local-only.
- Keep scanned projects read-only.
- Do not modify scanned projects.
- Only the dashboard app may write its own config files.
- Do not store the tracked project list only in localStorage.
- Project tracking must persist after app restart and computer reboot.
- Canonical config path is `app-data/projects.config.json`.
- Generated scan data path is `app-data/projects.generated.json`.
- Root `projects.config.json` is legacy seed/example only after migration; app code must not write to it.
- Manual path input must always work.
- Never accept arbitrary scan paths from the frontend except through saved config validation.
- Never run shell commands with user-provided paths.
- Removing a project means only removing it from config.
- Watcher, manual rescan, and auto-rescan use only enabled projects from canonical config.
- Discovery depth is capped to `1`, `2`, or `3`, default `2`.
- Skip `node_modules`, `.git` internals, `dist`, `build`, `.next`, `coverage`, `vendor`, databases, archives, media, and large files.

---

## File Structure

Create:

- `server/project-config.mjs` - canonical config paths, default config, legacy migration, normalization, stable id generation, validation, CRUD helpers, atomic writes.
- `server/project-discovery.mjs` - safe workspace candidate discovery with marker detection, depth cap, exclusions, and workspace-bound path checks.
- `tests/project-config.test.mjs` - migration, CRUD, validation, duplicate, enabled filtering tests.
- `tests/project-discovery.test.mjs` - discovery depth, marker reasons, exclusions, symlink skipping, workspace-bound selected path tests.
- `tests/server-api.test.mjs` - Express API behavior using an injected temp app-data directory.
- `src/components/ManageProjects.tsx` - dashboard project/workspace management modal or section.
- `openspec/changes/add-persistent-project-management/proposal.md` - proposed behavior change.
- `openspec/changes/add-persistent-project-management/design.md` - architecture and safety design summary.
- `openspec/changes/add-persistent-project-management/tasks.md` - acceptance checklist.
- `openspec/changes/add-persistent-project-management/specs/project-management/spec.md` - requirements and scenarios.

Modify:

- `server.mjs` - use config/discovery modules, add management APIs, read generated data from `app-data`, refresh watcher on config change.
- `scan-projects.mjs` - default to canonical config/generated paths, support new config shape, filter disabled projects, preserve static fallback when requested.
- `server/scan-controller.mjs` - likely unchanged; only update if per-project rescan needs explicit trigger metadata.
- `src/App.tsx` - load config, open `Manage Projects`, refresh data after config mutations, use settings-backed auto-rescan.
- `src/types.ts` - add config/workspace/discovery/project-management types.
- `README.md` - explain add project, add workspace, track discovered projects, config location, persistence, manual edits, disabling projects.
- `docs/README.md` - update current state.
- `docs/00_FILE_STRUCTURE.md` - add `app-data/`, new modules, generated file, OpenSpec artifacts.
- `docs/CONTEXT.md` - add canonical config, workspace, discovered candidate, generated scan data terms.
- `docs/CURRENT_PROJECT_AUDIT.md` - add verification evidence and residual risks.
- `.gitignore` - ignore local `app-data/projects.config.json` and generated output while keeping `app-data/.gitkeep` or template if needed.

## Interfaces

`server/project-config.mjs` exports:

```js
export const DEFAULT_APP_DATA_DIR;
export function getConfigPaths(options = {});
export async function ensureProjectConfig(options = {});
export async function readProjectConfig(options = {});
export async function writeProjectConfig(config, options = {});
export function normalizeProjectConfig(input, options = {});
export function getEnabledProjects(config);
export async function addProject(input, options = {});
export async function updateProject(id, patch, options = {});
export async function removeProject(id, options = {});
export async function addWorkspace(input, options = {});
export function assertPathInsideWorkspace(candidatePath, workspaces);
```

`server/project-discovery.mjs` exports:

```js
export async function discoverWorkspaceProjects(workspace, options = {});
export function normalizeDiscoveryDepth(value);
export function isExcludedDiscoveryName(name);
export function detectProjectReasons(entries);
```

`server.mjs` should export `createApp(options = {})` for API tests while preserving direct CLI startup.

```js
export async function createApp({
  appDataDir,
  legacyConfigPath,
  staticFallbackOutputPath,
  skipStartupScan = false,
  skipWatcher = false,
  logger = console,
} = {})
```

---

### Task 1: OpenSpec Change Skeleton

**Files:**
- Create: `openspec/changes/add-persistent-project-management/proposal.md`
- Create: `openspec/changes/add-persistent-project-management/design.md`
- Create: `openspec/changes/add-persistent-project-management/tasks.md`
- Create: `openspec/changes/add-persistent-project-management/specs/project-management/spec.md`

**Interfaces:**
- Consumes: design spec at `docs/superpowers/specs/2026-07-08-persistent-project-management-design.md`.
- Produces: requirements scenarios used as acceptance inputs for tests and docs.

- [ ] **Step 1: Create OpenSpec files**

Use `openspec init --tools none` only if the `openspec/` directory still does not exist. Then remove any regenerated repository-local `.codex/skills/openspec-*` folders if the tool creates them.

Write `proposal.md`:

```md
# Add Persistent Project Management

## Why

Users need to add single projects and workspace folders from the local dashboard without losing tracked project settings after app restart or computer reboot.

## What Changes

- Add canonical persistent config at `app-data/projects.config.json`.
- Add generated scan output at `app-data/projects.generated.json`.
- Add local management APIs for project and workspace CRUD/discovery.
- Add dashboard UI for adding, discovering, tracking, disabling, and removing tracked project entries.
- Filter scanner and watcher inputs to enabled projects from saved config.

## Impact

- Affects scanner input contract, generated output location, Express API, watcher setup, dashboard UI, README operations, and local persistence rules.
- Keeps scanned projects read-only and local-only.
```

Write `design.md`:

```md
# Design

The canonical user config lives in `app-data/projects.config.json`; generated scan data lives in `app-data/projects.generated.json`. A focused `server/project-config.mjs` module owns config migration, validation, ids, and writes. A focused `server/project-discovery.mjs` module owns safe workspace discovery.

All APIs that accept paths validate and save them before scan or watcher code can use them. Scanner and watcher consumers receive enabled saved projects only. Removing a project deletes only the config entry.
```

Write `tasks.md`:

```md
# Tasks

- [ ] Create persistent config module with migration from root `projects.config.json`.
- [ ] Create workspace discovery module with depth caps and exclusions.
- [ ] Update scanner defaults and enabled-project filtering.
- [ ] Add Express management APIs.
- [ ] Add dashboard `Manage Projects` UI.
- [ ] Update docs, audit, and verification evidence.
- [ ] Validate with tests, build, live API checks, restart persistence checks.
```

Write `spec.md`:

```md
# Project Management Specification

## ADDED Requirements

### Requirement: Persistent Tracked Project Config

Projects Viewer SHALL persist tracked projects and workspaces in `app-data/projects.config.json`.

#### Scenario: Legacy config is migrated

- **GIVEN** root `projects.config.json` exists and `app-data/projects.config.json` does not exist
- **WHEN** the local server initializes config
- **THEN** it writes a normalized config to `app-data/projects.config.json`
- **AND** scanned project folders are not modified

#### Scenario: Tracked project survives restart

- **GIVEN** a user adds a project through the dashboard
- **WHEN** the local server restarts
- **THEN** `GET /api/config` still includes the project

### Requirement: Read-Only Scanned Projects

Projects Viewer SHALL never write, delete, move, or reformat files inside tracked project paths.

#### Scenario: Remove project from dashboard

- **GIVEN** a project is tracked
- **WHEN** the user removes it from dashboard tracking
- **THEN** only the config entry is removed
- **AND** the actual project folder remains unchanged

### Requirement: Workspace Discovery

Projects Viewer SHALL discover candidate projects only inside saved workspace folders with depth caps and exclusion rules.

#### Scenario: Discover candidates without tracking all

- **GIVEN** a saved workspace contains multiple candidate folders
- **WHEN** the user runs discovery
- **THEN** the API returns candidates with detected reasons
- **AND** none are tracked until the user selects them

### Requirement: Enabled Project Scan Boundary

Projects Viewer SHALL scan and watch only enabled tracked projects from saved config.

#### Scenario: Disabled project is excluded

- **GIVEN** a tracked project has `enabled: false`
- **WHEN** a scan or watcher setup runs
- **THEN** that project path is excluded
```

- [ ] **Step 2: Validate OpenSpec**

Run:

```bash
openspec list
openspec list --specs
openspec validate --all --strict
```

Expected: commands succeed. If `openspec` is unavailable, record the exact command failure in `docs/CURRENT_PROJECT_AUDIT.md` and continue with repository docs as the temporary source.

- [ ] **Step 3: Commit**

```bash
git add openspec
git commit -m "Add persistent project management OpenSpec"
```

### Task 2: Persistent Config Module

**Files:**
- Create: `server/project-config.mjs`
- Create: `tests/project-config.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Node `fs/promises`, `path`.
- Produces: config helpers listed in the Interfaces section.

- [ ] **Step 1: Write failing config tests**

Create `tests/project-config.test.mjs`:

```js
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

test('ensureProjectConfig migrates legacy root config into app-data', async () => {
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

  const config = await ensureProjectConfig({ appDataDir, legacyConfigPath, now: () => new Date('2026-07-08T00:00:00.000Z') });

  assert.equal(config.settings.watchDocs, false);
  assert.equal(config.settings.activeDays, 7);
  assert.equal(config.projects.length, 1);
  assert.equal(config.projects[0].name, 'Sample Project');
  assert.equal(config.projects[0].enabled, true);
  assert.deepEqual(config.projects[0].tags, []);
  assert.match(config.projects[0].id, /^sample-project/);
  await assert.doesNotReject(fs.stat(path.join(appDataDir, 'projects.config.json')));
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

  const updated = await updateProject(project.id, { name: 'Renamed', tags: ['local'], enabled: false }, { appDataDir });
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

  const { workspace } = await addWorkspace({ path: workspaceRoot, name: 'Local Projects', discoveryDepth: 9 }, { appDataDir });

  assert.equal(workspace.name, 'Local Projects');
  assert.equal(workspace.discoveryDepth, 2);
  assert.equal(workspace.enabled, true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/project-config.test.mjs
```

Expected: FAIL because `server/project-config.mjs` does not exist.

- [ ] **Step 3: Implement `server/project-config.mjs`**

Implement the module with these exact behaviors:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_APP_DATA_DIR = path.join(REPO_ROOT, 'app-data');

export function getConfigPaths({ appDataDir = DEFAULT_APP_DATA_DIR, legacyConfigPath = path.join(REPO_ROOT, 'projects.config.json') } = {}) {
  return {
    appDataDir,
    configPath: path.join(appDataDir, 'projects.config.json'),
    generatedPath: path.join(appDataDir, 'projects.generated.json'),
    legacyConfigPath,
  };
}

export async function ensureProjectConfig(options = {}) {
  const paths = getConfigPaths(options);
  await fs.mkdir(paths.appDataDir, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(paths.configPath, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  let legacy = null;
  try {
    legacy = JSON.parse(await fs.readFile(paths.legacyConfigPath, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const config = normalizeProjectConfig(legacy ?? {}, options);
  await writeProjectConfig(config, options);
  return config;
}
```

Then add:

- `normalizeProjectConfig(input, { now = () => new Date() } = {})`
- `readProjectConfig(options)`
- `writeProjectConfig(config, options)` with temp file atomic write: write `${configPath}.tmp`, then rename.
- `addProject(input, options)`
- `updateProject(id, patch, options)`
- `removeProject(id, options)`
- `addWorkspace(input, options)`
- `getEnabledProjects(config)`

Use helpers:

```js
function stableId(name, existingIds = new Set()) {
  const base = String(name || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'project';
  let id = base;
  let i = 2;
  while (existingIds.has(id)) id = `${base}-${i++}`;
  existingIds.add(id);
  return id;
}

async function assertDirectory(candidatePath) {
  if (typeof candidatePath !== 'string' || candidatePath.trim() === '') {
    const err = new Error('Path is required.');
    err.statusCode = 400;
    throw err;
  }
  const resolved = path.resolve(candidatePath);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    const err = new Error('Path must exist and be a directory.');
    err.statusCode = 400;
    throw err;
  }
  return resolved;
}
```

Patch `.gitignore`:

```gitignore
app-data/projects.config.json
app-data/projects.generated.json
app-data/*.tmp
```

- [ ] **Step 4: Run config tests**

Run:

```bash
npm test -- tests/project-config.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .gitignore server/project-config.mjs tests/project-config.test.mjs
git commit -m "Add persistent project config module"
```

### Task 3: Workspace Discovery Module

**Files:**
- Create: `server/project-discovery.mjs`
- Create: `tests/project-discovery.test.mjs`

**Interfaces:**
- Consumes: workspace object `{ id, name, path, enabled, discoveryDepth }`.
- Produces: candidate array `{ name, path, reasons }`.

- [ ] **Step 1: Write failing discovery tests**

Create `tests/project-discovery.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverWorkspaceProjects, normalizeDiscoveryDepth } from '../server/project-discovery.mjs';

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

  const candidates = await discoverWorkspaceProjects({ id: 'local', name: 'Local', path: workspaceRoot, enabled: true, discoveryDepth: 2 });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, 'autoparts');
  assert.deepEqual(candidates[0].reasons.sort(), ['README.md', 'docs/', 'package.json']);
});

test('discoverWorkspaceProjects respects depth and skips excluded folders', async () => {
  const tmp = await makeTemp();
  const workspaceRoot = path.join(tmp, 'workspace');
  await fs.mkdir(path.join(workspaceRoot, 'level1', 'level2', 'level3', 'too-deep'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'node_modules', 'fake'), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'level1', 'level2', 'package.json'), '{}');
  await fs.writeFile(path.join(workspaceRoot, 'level1', 'level2', 'level3', 'too-deep', 'README.md'), '# Too Deep');
  await fs.writeFile(path.join(workspaceRoot, 'node_modules', 'fake', 'README.md'), '# Ignored');

  const candidates = await discoverWorkspaceProjects({ id: 'local', name: 'Local', path: workspaceRoot, enabled: true, discoveryDepth: 2 });

  assert.deepEqual(candidates.map((candidate) => path.basename(candidate.path)), ['level2']);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/project-discovery.test.mjs
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement discovery module**

Implement:

```js
import fs from 'node:fs/promises';
import path from 'node:path';

const EXCLUDED_NAMES = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor']);
const MARKER_FILES = new Set(['package.json', 'README.md', 'CLAUDE.md', 'AGENTS.md']);
const MARKER_DIRS = new Set(['docs', 'specs', '.openspec', '.git']);

export function normalizeDiscoveryDepth(value) {
  return [1, 2, 3].includes(Number(value)) ? Number(value) : 2;
}

export function isExcludedDiscoveryName(name) {
  return EXCLUDED_NAMES.has(String(name).toLowerCase());
}

export function detectProjectReasons(entries) {
  const reasons = [];
  for (const entry of entries) {
    if (entry.isFile() && MARKER_FILES.has(entry.name)) reasons.push(entry.name);
    if (entry.isDirectory() && MARKER_DIRS.has(entry.name)) reasons.push(`${entry.name}/`);
  }
  return reasons.sort();
}
```

Add `discoverWorkspaceProjects(workspace)` that:

- returns `[]` when `workspace.enabled === false`;
- resolves `workspace.path`;
- walks directories up to normalized depth;
- never follows symbolic links;
- does not recurse into excluded names;
- reads directory entries only;
- pushes each candidate once with basename-derived name and sorted reasons.

- [ ] **Step 4: Run discovery tests**

Run:

```bash
npm test -- tests/project-discovery.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/project-discovery.mjs tests/project-discovery.test.mjs
git commit -m "Add safe workspace discovery"
```

### Task 4: Scanner Config Contract And Generated Output

**Files:**
- Modify: `scan-projects.mjs`
- Modify: `tests/run-scan.test.mjs`

**Interfaces:**
- Consumes: `readProjectConfig`, `getEnabledProjects`, `getConfigPaths`.
- Produces: `runScan({ configPath, outputPath, projects })` behavior compatible with tests and server.

- [ ] **Step 1: Extend scanner tests**

Add tests to `tests/run-scan.test.mjs`:

```js
test('runScan scans only enabled projects from new config shape', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-scan-enabled-'));
  const enabledRoot = path.join(tmp, 'enabled');
  const disabledRoot = path.join(tmp, 'disabled');
  await fs.mkdir(enabledRoot, { recursive: true });
  await fs.mkdir(disabledRoot, { recursive: true });
  await fs.writeFile(path.join(enabledRoot, 'README.md'), '# Enabled\n');
  await fs.writeFile(path.join(disabledRoot, 'README.md'), '# Disabled\n');
  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.generated.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      workspaces: [],
      projects: [
        { id: 'enabled', name: 'Enabled', path: enabledRoot, enabled: true, tags: [], createdAt: '2026-07-08T00:00:00.000Z', updatedAt: '2026-07-08T00:00:00.000Z' },
        { id: 'disabled', name: 'Disabled', path: disabledRoot, enabled: false, tags: [], createdAt: '2026-07-08T00:00:00.000Z', updatedAt: '2026-07-08T00:00:00.000Z' },
      ],
      settings: { watchDocs: true, autoRescanIntervalSec: 0, activeDays: 3 },
    }),
  );

  const result = await runScan({ configPath, outputPath, quiet: true });

  assert.equal(result.output.activeDays, 3);
  assert.deepEqual(result.output.projects.map((project) => project.name), ['Enabled']);
});

test('runScan can write generated data to app-data path', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-generated-'));
  const projectRoot = path.join(tmp, 'sample');
  const appDataDir = path.join(tmp, 'app-data');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'README.md'), '# Sample\n');
  await fs.mkdir(appDataDir, { recursive: true });
  const configPath = path.join(appDataDir, 'projects.config.json');
  const outputPath = path.join(appDataDir, 'projects.generated.json');
  await fs.writeFile(configPath, JSON.stringify({ workspaces: [], projects: [{ id: 'sample', name: 'Sample', path: projectRoot, enabled: true, tags: [], createdAt: '2026-07-08T00:00:00.000Z', updatedAt: '2026-07-08T00:00:00.000Z' }], settings: { watchDocs: true, autoRescanIntervalSec: 0 } }));

  await runScan({ configPath, outputPath, quiet: true });
  const written = JSON.parse(await fs.readFile(outputPath, 'utf8'));

  assert.equal(written.projects[0].name, 'Sample');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/run-scan.test.mjs
```

Expected: FAIL until scanner reads `settings.activeDays` and filters disabled projects.

- [ ] **Step 3: Update scanner**

Change defaults near the top of `scan-projects.mjs`:

```js
const DEFAULT_APP_DATA_DIR = path.join(__dirname, 'app-data');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_APP_DATA_DIR, 'projects.config.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_APP_DATA_DIR, 'projects.generated.json');
const STATIC_FALLBACK_OUTPUT_PATH = path.join(__dirname, 'src', 'data', 'projects.json');
```

In `runScan`, normalize config shape:

```js
const configuredProjects = Array.isArray(config.projects) ? config.projects : [];
const projectsToScan = configuredProjects.filter((project) => project?.enabled !== false);
const activeDays = Number.isFinite(config.settings?.activeDays)
  ? config.settings.activeDays
  : Number.isFinite(config.activeDays)
    ? config.activeDays
    : DEFAULT_ACTIVE_DAYS;
```

Use `projectsToScan` for log count and loop. Keep `runScan({ configPath, outputPath })` fully testable.

For direct CLI fallback, if canonical config does not exist but root legacy config exists, either:

- call `ensureProjectConfig()` from `server/project-config.mjs`, or
- print a clear error instructing `npm run dev` to migrate first.

Preferred: call `ensureProjectConfig()` so `npm run scan` also migrates safely.

- [ ] **Step 4: Run scanner tests**

Run:

```bash
npm test -- tests/run-scan.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scan-projects.mjs tests/run-scan.test.mjs
git commit -m "Use canonical app-data scan config"
```

### Task 5: Express Management API And Watcher Refresh

**Files:**
- Modify: `server.mjs`
- Create: `tests/server-api.test.mjs`

**Interfaces:**
- Consumes: config/discovery helpers and `runScan`.
- Produces: local API endpoints from design.

- [ ] **Step 1: Write failing API tests**

Create `tests/server-api.test.mjs`:

```js
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
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

test('project management API persists added project and rejects missing path', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  const projectRoot = path.join(tmp, 'sample');
  await fs.mkdir(projectRoot, { recursive: true });
  const app = await createApp({ appDataDir, legacyConfigPath: path.join(tmp, 'missing.json'), skipStartupScan: true, skipWatcher: true });
  const server = await startTestServer(app);
  try {
    const missing = await fetch(`${server.url}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: path.join(tmp, 'missing') }) });
    assert.equal(missing.status, 400);

    const added = await fetch(`${server.url}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: projectRoot, name: 'Sample' }) });
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
  await fs.mkdir(candidateRoot, { recursive: true });
  await fs.writeFile(path.join(candidateRoot, 'README.md'), '# Candidate');
  const app = await createApp({ appDataDir, legacyConfigPath: path.join(tmp, 'missing.json'), skipStartupScan: true, skipWatcher: true });
  const server = await startTestServer(app);
  try {
    const workspaceResponse = await fetch(`${server.url}/api/workspaces`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: workspaceRoot, name: 'Workspace', discoveryDepth: 2 }) });
    assert.equal(workspaceResponse.status, 201);
    const { workspace } = await workspaceResponse.json();

    const discoveryResponse = await fetch(`${server.url}/api/workspaces/${workspace.id}/discover`, { method: 'POST' });
    assert.equal(discoveryResponse.status, 200);
    const { candidates } = await discoveryResponse.json();
    assert.equal(candidates.length, 1);

    const trackResponse = await fetch(`${server.url}/api/projects/track-discovered`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths: [candidateRoot] }) });
    assert.equal(trackResponse.status, 201);
    const tracked = await trackResponse.json();
    assert.equal(tracked.projects.length, 1);
  } finally {
    await server.close();
  }
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/server-api.test.mjs
```

Expected: FAIL until `createApp` export and endpoints exist.

- [ ] **Step 3: Refactor `server.mjs` for injection**

Export `createApp(options = {})` and keep direct startup guarded:

```js
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp().then((app) => {
    app.listen(PORT, HOST, () => {
      console.log(`Projects Viewer live dashboard: http://${HOST}:${PORT}`);
    });
  }).catch((err) => {
    console.error(`Server failed: ${err.message}`);
    process.exit(1);
  });
}
```

Use `ensureProjectConfig()` during app startup. Change `readProjectsOutput()` to read `app-data/projects.generated.json`.

- [ ] **Step 4: Add endpoints**

Add these handlers before Vite/static middleware:

```js
app.get('/api/config', async (_req, res) => {
  res.json(await readProjectConfig(configOptions));
});

app.post('/api/projects', async (req, res) => {
  const result = await addProject(req.body, configOptions);
  await restartWatcher();
  res.status(result.created ? 201 : 200).json(result);
});

app.patch('/api/projects/:id', async (req, res) => {
  const result = await updateProject(req.params.id, req.body, configOptions);
  await restartWatcher();
  res.json(result);
});

app.delete('/api/projects/:id', async (req, res) => {
  const result = await removeProject(req.params.id, configOptions);
  await restartWatcher();
  res.json(result);
});
```

Add workspace/discovery endpoints using `addWorkspace()` and `discoverWorkspaceProjects()`. Wrap route handlers in a helper:

```js
function sendError(res, err) {
  res.status(err.statusCode ?? 500).json({ error: err.message });
}
```

For `POST /api/projects/track-discovered`, load config, verify each selected path is under one saved workspace using `assertPathInsideWorkspace`, then call `addProject` for each path.

- [ ] **Step 5: Refresh watcher after config mutation**

Keep a `watcher` variable in `createApp`. Implement:

```js
async function restartWatcher() {
  if (skipWatcher) return;
  if (watcher) await watcher.close();
  watcher = await createWatcher(controller, configOptions);
}
```

Update `createWatcher` to read `settings.watchDocs` and enabled projects only.

- [ ] **Step 6: Run API tests and existing tests**

Run:

```bash
npm test -- tests/server-api.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server.mjs tests/server-api.test.mjs
git commit -m "Add project management API"
```

### Task 6: Manage Projects UI

**Files:**
- Create: `src/components/ManageProjects.tsx`
- Modify: `src/App.tsx`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `/api/config`, `/api/projects`, `/api/workspaces`, `/api/workspaces/:id/discover`, `/api/projects/track-discovered`, `/api/rescan`.
- Produces: user workflow for adding, discovering, tracking, enabling/disabling, removing, and rescanning.

- [ ] **Step 1: Add TypeScript types**

In `src/types.ts`, add:

```ts
export interface TrackedProjectConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  discoveryDepth: 1 | 2 | 3;
}

export interface ProjectConfigSettings {
  watchDocs: boolean;
  autoRescanIntervalSec: number;
  activeDays?: number;
}

export interface ProjectConfig {
  workspaces: WorkspaceConfig[];
  projects: TrackedProjectConfig[];
  settings: ProjectConfigSettings;
}

export interface DiscoveredProjectCandidate {
  name: string;
  path: string;
  reasons: string[];
}
```

- [ ] **Step 2: Create `ManageProjects.tsx`**

Implement a controlled modal/section component:

```tsx
export default function ManageProjects({
  liveMode,
  config,
  projects,
  onClose,
  onConfigChanged,
  onRescan,
}: {
  liveMode: boolean;
  config: ProjectConfig | null;
  projects: ProjectData[];
  onClose: () => void;
  onConfigChanged: () => Promise<void>;
  onRescan: () => Promise<void>;
}) {
  // form state:
  // projectPath, projectName, workspacePath, workspaceName, discoveryDepth
  // discovered candidates, selected candidate paths, busy, message, error
}
```

Required UI text:

```tsx
<p className="text-xs text-mute">
  Tracked projects are saved in <code>app-data/projects.config.json</code> and will remain after restart.
</p>
```

Implement actions:

- `addProject`: `POST /api/projects`, then `onConfigChanged()`.
- `addWorkspaceAndDiscover`: `POST /api/workspaces`, then `POST /api/workspaces/:id/discover`.
- `trackSelected`: `POST /api/projects/track-discovered`, then `onConfigChanged()` and `onRescan()`.
- `toggleEnabled`: `PATCH /api/projects/:id`.
- `removeProject`: `DELETE /api/projects/:id`.
- `rescanProject`: call `onRescan()` unless per-project rescan was implemented.

Keep manual path inputs plain text. Folder picker is not required.

- [ ] **Step 3: Wire into `App.tsx`**

Add state and loaders:

```tsx
const [config, setConfig] = useState<ProjectConfig | null>(null);
const [manageOpen, setManageOpen] = useState(false);

const loadConfig = useCallback(async () => {
  const response = await fetch('/api/config', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Config unavailable: ${response.status}`);
  const nextConfig = (await response.json()) as ProjectConfig;
  setConfig(nextConfig);
  return nextConfig;
}, []);
```

Load config in live initial load. Add a `Manage Projects` button near `LiveControls`. Render:

```tsx
{manageOpen && (
  <ManageProjects
    liveMode={liveMode}
    config={config}
    projects={data.projects}
    onClose={() => setManageOpen(false)}
    onConfigChanged={async () => {
      await loadConfig();
      await loadLiveData();
    }}
    onRescan={() => requestRescan('manual')}
  />
)}
```

- [ ] **Step 4: Run type/build checks**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/App.tsx src/components/ManageProjects.tsx
git commit -m "Add manage projects UI"
```

### Task 7: Documentation And Audit Updates

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/00_FILE_STRUCTURE.md`
- Modify: `docs/CONTEXT.md`
- Modify: `docs/CURRENT_PROJECT_AUDIT.md`

**Interfaces:**
- Consumes: completed implementation behavior.
- Produces: user-facing and agent-facing documentation aligned with code.

- [ ] **Step 1: Update README**

Update sections:

- Quick start says first run migrates legacy root config into `app-data/projects.config.json`.
- Project setup explains `Manage Projects`.
- Configuration section points to `app-data/projects.config.json`.
- Add subsections:
  - "Add one project"
  - "Add a workspace folder"
  - "Track discovered projects"
  - "Disable a project without deleting it"
  - "Manual config editing"
  - "Where generated scan data lives"

Required statements:

```md
Tracked projects are stored in `app-data/projects.config.json`, so they remain after restarting the local server or rebooting the computer.

Generated scan results are stored separately in `app-data/projects.generated.json`.

Removing a project from the dashboard removes only the tracking entry. It never deletes the actual project folder.
```

- [ ] **Step 2: Update docs map and context**

In `docs/00_FILE_STRUCTURE.md`, add rows for:

- `app-data/`
- `server/project-config.mjs`
- `server/project-discovery.mjs`
- `src/components/ManageProjects.tsx`
- `openspec/changes/add-persistent-project-management/`

In `docs/CONTEXT.md`, add terms:

- Canonical project config
- Workspace
- Discovered project candidate
- Generated scan data
- Disabled tracked project

- [ ] **Step 3: Update audit**

Add verification rows for:

- Config migration.
- API tests.
- Discovery tests.
- Scanner enabled-project filtering.
- Build.
- Manual restart persistence check.

If manual browser verification has not yet run, record it as residual risk instead of claiming it passed.

- [ ] **Step 4: Commit docs**

```bash
git add README.md docs/README.md docs/00_FILE_STRUCTURE.md docs/CONTEXT.md docs/CURRENT_PROJECT_AUDIT.md
git commit -m "Document persistent project management"
```

### Task 8: End-To-End Verification

**Files:**
- Modify only if verification reveals a defect.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: evidence that feature works end-to-end.

- [ ] **Step 1: Run automated checks**

Run:

```bash
npm test
npm run build
git diff --check
openspec list
openspec list --specs
openspec validate --all --strict
```

Expected: all pass. If `openspec` is unavailable, record exact failure and continue with `npm test`, `npm run build`, and manual verification.

- [ ] **Step 2: Run live server**

Run:

```bash
npm run dev
```

Expected: server starts at `http://127.0.0.1:5173` or prints a different local port.

- [ ] **Step 3: Verify API persistence manually**

Use PowerShell in another terminal, replacing port if needed:

```powershell
Invoke-RestMethod http://127.0.0.1:5173/api/config
```

Expected: JSON includes `workspaces`, `projects`, and `settings`.

- [ ] **Step 4: Verify UI workflow manually**

In the browser:

1. Open `Manage Projects`.
2. Add one project path.
3. Restart the local server.
4. Confirm the project is still listed.
5. Add one workspace folder.
6. Discover projects.
7. Select at least one candidate.
8. Track selected.
9. Restart the local server again.
10. Confirm tracked projects persist.
11. Run rescan.
12. Confirm dashboard uses saved enabled config.
13. Disable one project.
14. Run rescan.
15. Confirm disabled project is not scanned or watched.

- [ ] **Step 5: Stop server and update audit evidence**

If the manual verification passed, add concrete date and command/UI evidence to `docs/CURRENT_PROJECT_AUDIT.md`.

- [ ] **Step 6: Final commit**

If verification updated audit or fixed defects:

```bash
git add docs/CURRENT_PROJECT_AUDIT.md
git commit -m "Record project management verification"
```

If there are no changes:

```bash
git status --short
```

Expected: clean working tree.

## Self-Review Notes

- Spec coverage: tasks cover OpenSpec, canonical config, generated output separation, migration, API, discovery, UI, scanner/watcher enabled filtering, docs, and final manual restart verification.
- Scope: one cohesive feature; no cloud/auth/shell/whole-disk behavior included.
- Risk focus: highest-risk path handling is covered by config/discovery/API tests before UI work.
