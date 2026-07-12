import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_APP_DATA_DIR = path.join(REPO_ROOT, 'app-data');

export function getConfigPaths({ appDataDir = DEFAULT_APP_DATA_DIR } = {}) {
  return {
    appDataDir,
    configPath: path.join(appDataDir, 'projects.config.json'),
    generatedPath: path.join(appDataDir, 'projects.generated.json'),
  };
}

export async function ensureProjectConfig(options = {}) {
  const paths = getConfigPaths(options);
  await fs.mkdir(paths.appDataDir, { recursive: true });
  try {
    return normalizeProjectConfig(JSON.parse(await fs.readFile(paths.configPath, 'utf8')), options);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const config = normalizeProjectConfig({}, options);
  await writeProjectConfig(config, options);
  return config;
}

export async function readProjectConfig(options = {}) {
  await ensureProjectConfig(options);
  const { configPath } = getConfigPaths(options);
  return normalizeProjectConfig(JSON.parse(await fs.readFile(configPath, 'utf8')), options);
}

export async function writeProjectConfig(config, options = {}) {
  const paths = getConfigPaths(options);
  await fs.mkdir(paths.appDataDir, { recursive: true });
  const normalized = normalizeProjectConfig(config, options);
  const tmpPath = `${paths.configPath}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, paths.configPath);
  return normalized;
}

export function normalizeProjectConfig(input = {}, { now = () => new Date() } = {}) {
  const existingIds = new Set();
  const timestamp = toIso(now());
  const legacyProjects = Array.isArray(input.projects) ? input.projects : [];
  const legacyWorkspaces = Array.isArray(input.workspaces) ? input.workspaces : [];
  const settingsInput = input.settings && typeof input.settings === 'object' ? input.settings : {};
  const settings = {
    watchDocs:
      typeof settingsInput.watchDocs === 'boolean'
        ? settingsInput.watchDocs
        : input.watchDocs !== false,
    autoRescanIntervalSec: Number.isFinite(settingsInput.autoRescanIntervalSec)
      ? settingsInput.autoRescanIntervalSec
      : 0,
  };

  const activeDays = Number.isFinite(settingsInput.activeDays)
    ? settingsInput.activeDays
    : Number.isFinite(input.activeDays)
      ? input.activeDays
      : null;
  if (activeDays !== null) settings.activeDays = activeDays;

  const workspaces = legacyWorkspaces
    .filter((workspace) => workspace && typeof workspace.path === 'string')
    .map((workspace) => {
      const name = cleanName(workspace.name, path.basename(workspace.path) || 'Workspace');
      const id = cleanName(workspace.id, stableId(name, existingIds));
      existingIds.add(id);
      return {
        id,
        name,
        path: path.resolve(workspace.path),
        enabled: workspace.enabled !== false,
        discoveryDepth: normalizeDiscoveryDepth(workspace.discoveryDepth),
        allowNestedProjects: normalizeAllowNestedProjects(workspace.allowNestedProjects),
      };
    });

  const projects = legacyProjects
    .filter((project) => project && typeof project.path === 'string')
    .map((project) => {
      const name = cleanName(project.name, path.basename(project.path) || 'Project');
      const id = cleanName(project.id, stableId(name, existingIds));
      existingIds.add(id);
      const createdAt = validIso(project.createdAt) ? project.createdAt : timestamp;
      const updatedAt = validIso(project.updatedAt) ? project.updatedAt : createdAt;
      const documentationViews = normalizeDocumentationViews(project.documentationViews);
      return {
        id,
        name,
        path: path.resolve(project.path),
        enabled: project.enabled !== false,
        tags: normalizeTags(project.tags),
        ...(project.defaultView === 'roadmap' || project.defaultView === 'specs'
          ? { defaultView: project.defaultView }
          : {}),
        ...(documentationViews ? { documentationViews } : {}),
        createdAt,
        updatedAt,
      };
    });

  return { workspaces, projects, settings };
}

export function getConfiguredProjectIdentities(config) {
  return (Array.isArray(config?.projects) ? config.projects : [])
    .filter((project) => project && typeof project.path === 'string')
    .map((project) => ({
      id: project.id,
      name: project.name,
      path: project.path,
      enabled: project.enabled !== false,
      tags: normalizeTags(project.tags),
    }));
}

export function getEnabledProjects(config) {
  return (Array.isArray(config?.projects) ? config.projects : []).filter(
    (project) => project?.enabled !== false,
  );
}

export async function addProject(input, options = {}) {
  const resolved = await assertDirectory(input?.path);
  const config = await readProjectConfig(options);
  const existing = config.projects.find((project) => samePath(project.path, resolved));
  if (existing) return { project: existing, config, created: false };

  const existingIds = new Set([
    ...config.projects.map((project) => project.id),
    ...config.workspaces.map((workspace) => workspace.id),
  ]);
  const timestamp = toIso(options.now?.() ?? new Date());
  const name = cleanName(input?.name, path.basename(resolved) || 'Project');
  const project = {
    id: stableId(name, existingIds),
    name,
    path: resolved,
    enabled: true,
    tags: normalizeTags(input?.tags),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const next = { ...config, projects: [...config.projects, project] };
  const saved = await writeProjectConfig(next, options);
  return { project: saved.projects.find((entry) => entry.id === project.id), config: saved, created: true };
}

export async function updateProject(id, patch, options = {}) {
  const config = await readProjectConfig(options);
  const index = config.projects.findIndex((project) => project.id === id);
  if (index === -1) throwStatus(404, 'Project not found.');

  const timestamp = toIso(options.now?.() ?? new Date());
  const current = config.projects[index];
  const defaultView =
    patch?.defaultView === undefined
      ? current.defaultView
      : patch.defaultView === null || patch.defaultView === ''
        ? undefined
        : normalizeDefaultView(patch.defaultView);
  const documentationViews =
    patch?.documentationViews === undefined
      ? current.documentationViews
      : await validateDocumentationViews(current.path, patch.documentationViews);
  const projects = config.projects.map((project, projectIndex) => {
    if (projectIndex !== index) return project;
    const nextProject = {
      ...project,
      name: patch?.name === undefined ? project.name : cleanName(patch.name, project.name),
      enabled: typeof patch?.enabled === 'boolean' ? patch.enabled : project.enabled,
      tags: patch?.tags === undefined ? project.tags : normalizeTags(patch.tags),
      updatedAt: timestamp,
    };
    delete nextProject.defaultView;
    delete nextProject.documentationViews;
    if (defaultView) nextProject.defaultView = defaultView;
    if (documentationViews) nextProject.documentationViews = documentationViews;
    return nextProject;
  });
  const saved = await writeProjectConfig({ ...config, projects }, options);
  return { project: saved.projects[index], config: saved };
}

export async function validateDocumentationViews(projectRoot, input) {
  if (input === null) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throwStatus(400, 'Documentation views must be an object.');
  }
  const normalized = normalizeDocumentationViews(input, { strict: true });
  if (!normalized) return undefined;
  const rootReal = await fs.realpath(projectRoot).catch(() => null);
  if (!rootReal) throwStatus(400, 'Saved project root must exist and be a directory.');
  for (const view of ['roadmap', 'specs']) {
    for (const relativeRoot of normalized[view]?.roots ?? []) {
      const candidate = path.resolve(projectRoot, ...relativeRoot.split('/'));
      const stat = await fs.stat(candidate).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        throwStatus(400, `Documentation root "${relativeRoot}" must exist and be a directory.`);
      }
      const real = await fs.realpath(candidate).catch(() => null);
      if (!real || !isInsideRoot(real, rootReal)) {
        throwStatus(400, `Documentation root "${relativeRoot}" must remain inside the saved project root.`);
      }
    }
  }
  return normalized;
}

export async function removeProject(id, options = {}) {
  const config = await readProjectConfig(options);
  const removed = config.projects.find((project) => project.id === id);
  if (!removed) throwStatus(404, 'Project not found.');
  const saved = await writeProjectConfig(
    { ...config, projects: config.projects.filter((project) => project.id !== id) },
    options,
  );
  return { removed, config: saved };
}

export async function addWorkspace(input, options = {}) {
  const resolved = await assertDirectory(input?.path);
  const config = await readProjectConfig(options);
  const existing = config.workspaces.find((workspace) => samePath(workspace.path, resolved));
  if (existing) return { workspace: existing, config, created: false };

  const existingIds = new Set([
    ...config.projects.map((project) => project.id),
    ...config.workspaces.map((workspace) => workspace.id),
  ]);
  const name = cleanName(input?.name, path.basename(resolved) || 'Workspace');
  const workspace = {
    id: stableId(name, existingIds),
    name,
    path: resolved,
    enabled: true,
    discoveryDepth: normalizeDiscoveryDepth(input?.discoveryDepth),
    allowNestedProjects: normalizeAllowNestedProjects(input?.allowNestedProjects),
  };
  const saved = await writeProjectConfig({ ...config, workspaces: [...config.workspaces, workspace] }, options);
  return {
    workspace: saved.workspaces.find((entry) => entry.id === workspace.id),
    config: saved,
    created: true,
  };
}

export function assertPathInsideWorkspace(candidatePath, workspaces = []) {
  const resolved = path.resolve(candidatePath);
  const enabledWorkspaces = workspaces.filter((workspace) => workspace?.enabled !== false);
  const match = enabledWorkspaces.find((workspace) => isInsideRoot(resolved, path.resolve(workspace.path)));
  if (!match) throwStatus(400, 'Selected project path must be inside a saved workspace.');
  return resolved;
}

async function assertDirectory(candidatePath) {
  if (typeof candidatePath !== 'string' || candidatePath.trim() === '') {
    throwStatus(400, 'Path is required.');
  }
  const resolved = path.resolve(candidatePath);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throwStatus(400, 'Path must exist and be a directory.');
  }
  return resolved;
}

function stableId(name, existingIds = new Set()) {
  const base =
    String(name || 'project')
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

function normalizeDiscoveryDepth(value) {
  return [1, 2, 3].includes(Number(value)) ? Number(value) : 1;
}

function normalizeAllowNestedProjects(value) {
  return value === true;
}

function normalizeTags(tags) {
  return Array.isArray(tags)
    ? [...new Set(tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))]
    : [];
}

function normalizeDefaultView(value) {
  if (value !== 'roadmap' && value !== 'specs') {
    throwStatus(400, 'Default view must be "roadmap" or "specs".');
  }
  return value;
}

function normalizeDocumentationViews(input, { strict = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const result = {};
  for (const view of ['roadmap', 'specs']) {
    const candidate = input[view];
    if (candidate === undefined || candidate === null) continue;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      if (strict) throwStatus(400, `Documentation ${view} view must be an object.`);
      continue;
    }
    if (!Array.isArray(candidate.roots)) {
      if (strict) throwStatus(400, `Documentation ${view} roots must be an array.`);
      continue;
    }
    const roots = [];
    for (const raw of candidate.roots) {
      if (typeof raw !== 'string') {
        if (strict) throwStatus(400, 'Documentation roots must be project-relative strings.');
        continue;
      }
      const normalized = raw.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
      if (
        !normalized ||
        path.isAbsolute(normalized) ||
        /^[a-z]:/i.test(normalized) ||
        normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')
      ) {
        if (strict) throwStatus(400, 'Documentation roots must be normalized project-relative paths.');
        continue;
      }
      if (!roots.includes(normalized)) roots.push(normalized);
    }
    result[view] = { roots };
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function cleanName(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function samePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isInsideRoot(candidatePath, root) {
  const rel = path.relative(root, candidatePath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function validIso(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function throwStatus(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}
