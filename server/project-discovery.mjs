import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORED_INTERNAL_NAMES = new Set([
  'node_modules',
  '.git',
  '.pytest_cache',
  '__pycache__',
  '.next',
  'dist',
  'build',
  'coverage',
  'vendor',
  'docs',
  'doc',
  'documentation',
  'specs',
  'spec',
  'openspec',
  '.openspec',
  'src',
  'test',
  'tests',
  'web',
  'api',
  'frontend',
  'backend',
  'public',
  'assets',
  'static',
]);

const STRONG_PROJECT_FILES = new Set([
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'CLAUDE.md',
  'AGENTS.md',
]);

const STRONG_PROJECT_DIRS = new Set(['.git']);

export function normalizeDiscoveryDepth(value) {
  return [1, 2, 3].includes(Number(value)) ? Number(value) : 1;
}

export function normalizeAllowNestedProjects(value) {
  return value === true;
}

export function isExcludedDiscoveryName(name) {
  return IGNORED_INTERNAL_NAMES.has(String(name).toLowerCase());
}

export function detectProjectReasons(entries, folderName = '', { depth = 1, allowWeakReadme = true } = {}) {
  const names = new Set(entries.map((entry) => entry.name));
  const reasons = [];
  const badges = [];
  let hasStrongSignal = false;

  for (const entry of entries) {
    if (entry.isFile() && STRONG_PROJECT_FILES.has(entry.name)) {
      reasons.push(entry.name);
      hasStrongSignal = true;
      if (entry.name === 'package.json') badges.push('package.json');
      if (entry.name === 'CLAUDE.md') badges.push('CLAUDE.md');
      if (entry.name === 'AGENTS.md') badges.push('AGENTS.md');
    }
    if (entry.isDirectory() && STRONG_PROJECT_DIRS.has(entry.name)) {
      reasons.push(`${entry.name}/`);
      hasStrongSignal = true;
      badges.push('git');
    }
  }

  const hasReadme = names.has('README.md');
  const hasClaude = names.has('CLAUDE.md');
  const hasAgents = names.has('AGENTS.md');
  const hasDocs = entries.some((entry) => entry.isDirectory() && entry.name === 'docs');
  const hasSdd = entries.some(
    (entry) =>
      entry.isDirectory() &&
      ['.openspec', 'openspec', 'specs'].includes(entry.name.toLowerCase()),
  );
  const hasRoadmap = names.has('ROADMAP.md');

  if (hasReadme && hasClaude) {
    reasons.push('README.md + CLAUDE.md');
    hasStrongSignal = true;
  }
  if (hasReadme && hasAgents) {
    reasons.push('README.md + AGENTS.md');
    hasStrongSignal = true;
  }
  if (hasReadme && hasDocs) {
    reasons.push('README.md + docs/');
    hasStrongSignal = true;
  }
  if (hasDocs) badges.push('docs');
  if (hasSdd) badges.push('SDD');
  if (hasRoadmap) badges.push('roadmap');

  const internalName = isExcludedDiscoveryName(folderName);
  if (!hasStrongSignal && hasReadme && allowWeakReadme && depth === 1 && !internalName) {
    reasons.push('README.md');
  }

  return {
    reasons: [...new Set(reasons)].sort(),
    badges: [...new Set(badges)].sort(),
    hasStrongSignal,
    hasWeakReadmeOnly: !hasStrongSignal && hasReadme && !internalName,
  };
}

export async function discoverWorkspaceProjects(workspace, _options = {}) {
  const workspaceRoot = workspace?.path ? path.resolve(workspace.path) : null;
  if (!workspace || workspace.enabled === false || !workspaceRoot) {
    return { workspaceRoot, discoveredProjects: [], candidates: [], internalFolders: [] };
  }

  const allowNestedProjects = normalizeAllowNestedProjects(workspace.allowNestedProjects);
  const maxDepth = allowNestedProjects ? normalizeDiscoveryDepth(workspace.discoveryDepth) : 1;
  const discoveredProjects = [];
  const internalFolders = [];
  const seenCandidates = new Set();
  const seenSkipped = new Set();

  function addInternalFolder(folderPath, reason) {
    const resolved = path.resolve(folderPath);
    if (seenSkipped.has(resolved)) return;
    seenSkipped.add(resolved);
    internalFolders.push({ path: resolved, reason });
  }

  async function readDir(dir) {
    try {
      return await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }
  }

  async function addCandidate(dir, entries, depth) {
    const resolved = path.resolve(dir);
    if (seenCandidates.has(resolved)) return false;
    const folderName = path.basename(resolved);
    if (isExcludedDiscoveryName(folderName)) {
      addInternalFolder(resolved, internalFolderReason(folderName));
      return false;
    }

    const detection = detectProjectReasons(entries, folderName, {
      depth,
      allowWeakReadme: depth === 1,
    });
    const enoughSignals = detection.hasStrongSignal || (depth === 1 && detection.hasWeakReadmeOnly);
    if (!enoughSignals) return false;

    seenCandidates.add(resolved);
    discoveredProjects.push({
      name: folderName,
      path: resolved,
      reasons: detection.reasons,
      confidence: detection.hasStrongSignal ? 'high' : 'medium',
      badges: depth > 1 ? [...detection.badges, 'nested project'] : detection.badges,
      isNested: depth > 1,
    });
    await collectImmediateInternalFolders(resolved);
    return true;
  }

  async function collectImmediateInternalFolders(projectRoot) {
    const entries = await readDir(projectRoot);
    if (!entries) return;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (isExcludedDiscoveryName(entry.name)) {
        addInternalFolder(path.join(projectRoot, entry.name), internalFolderReason(entry.name));
      }
    }
  }

  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    const entries = await readDir(dir);
    if (!entries) return;

    if (depth > 0) {
      const added = await addCandidate(dir, entries, depth);
      if (!allowNestedProjects || added) {
        if (!allowNestedProjects) return;
      }
    }

    if (!allowNestedProjects || depth >= maxDepth) return;

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const child = path.join(dir, entry.name);
      if (isExcludedDiscoveryName(entry.name)) {
        addInternalFolder(child, internalFolderReason(entry.name));
        continue;
      }
      await walk(child, depth + 1);
    }
  }

  const rootEntries = await readDir(workspaceRoot);
  if (rootEntries) {
    for (const entry of rootEntries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const child = path.join(workspaceRoot, entry.name);
      if (isExcludedDiscoveryName(entry.name)) {
        addInternalFolder(child, internalFolderReason(entry.name));
        continue;
      }
      await walk(child, 1);
    }
  }

  discoveredProjects.sort((a, b) => a.path.localeCompare(b.path));
  internalFolders.sort((a, b) => a.path.localeCompare(b.path));
  return {
    workspaceRoot,
    discoveredProjects,
    candidates: discoveredProjects,
    internalFolders,
  };
}

export async function validateDiscoveredProjectSelection(paths, workspaces = [], trackedProjects = []) {
  const valid = [];
  const invalid = [];
  const selected = paths.map((candidatePath) => path.resolve(candidatePath));

  for (const candidatePath of selected) {
    const workspace = findWorkspaceForPath(candidatePath, workspaces);
    if (!workspace) {
      invalid.push({ path: candidatePath, reason: 'not inside a saved workspace' });
      continue;
    }
    if (trackedProjects.some((project) => samePath(project.path, candidatePath))) {
      invalid.push({ path: candidatePath, reason: 'already tracked' });
      continue;
    }
    const folderName = path.basename(candidatePath);
    if (isExcludedDiscoveryName(folderName)) {
      invalid.push({ path: candidatePath, reason: internalFolderReason(folderName) });
      continue;
    }
    const stat = await fs.stat(candidatePath).catch(() => null);
    if (!stat?.isDirectory()) {
      invalid.push({ path: candidatePath, reason: 'path must exist and be a directory' });
      continue;
    }

    const rel = path.relative(path.resolve(workspace.path), candidatePath);
    const depth = rel.split(path.sep).filter(Boolean).length;
    if (depth < 1) {
      invalid.push({ path: candidatePath, reason: 'workspace root is not a project candidate' });
      continue;
    }
    const allowNestedProjects = normalizeAllowNestedProjects(workspace.allowNestedProjects);
    if (!allowNestedProjects && depth !== 1) {
      invalid.push({ path: candidatePath, reason: 'nested project discovery is disabled' });
      continue;
    }
    if (
      !allowNestedProjects &&
      selected.some((otherPath) => otherPath !== candidatePath && isInsideRoot(candidatePath, otherPath))
    ) {
      invalid.push({ path: candidatePath, reason: 'inside another selected project' });
      continue;
    }

    const entries = await fs.readdir(candidatePath, { withFileTypes: true }).catch(() => null);
    if (!entries) {
      invalid.push({ path: candidatePath, reason: 'path is not readable' });
      continue;
    }
    const detection = detectProjectReasons(entries, folderName, {
      depth,
      allowWeakReadme: depth === 1,
    });
    const enoughSignals = detection.hasStrongSignal || (depth === 1 && detection.hasWeakReadmeOnly);
    if (!enoughSignals) {
      invalid.push({ path: candidatePath, reason: 'not enough project-root signals' });
      continue;
    }

    valid.push({ path: candidatePath, reasons: detection.reasons });
  }

  return { valid, invalid };
}

function findWorkspaceForPath(candidatePath, workspaces) {
  return workspaces
    .filter((workspace) => workspace?.enabled !== false)
    .find((workspace) => isInsideRoot(candidatePath, path.resolve(workspace.path)));
}

function internalFolderReason(name) {
  const lower = String(name).toLowerCase();
  if (['docs', 'doc', 'documentation'].includes(lower)) return 'internal documentation folder';
  if (['specs', 'spec', 'openspec', '.openspec'].includes(lower)) return 'internal specs folder';
  if (['.pytest_cache', '__pycache__'].includes(lower)) return 'ignored cache folder';
  return 'ignored internal folder';
}

function samePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isInsideRoot(candidatePath, root) {
  const rel = path.relative(root, candidatePath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
