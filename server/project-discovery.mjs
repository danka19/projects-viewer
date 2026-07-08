import fs from 'node:fs/promises';
import path from 'node:path';

const EXCLUDED_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  'archives',
  'images',
  'videos',
  'audio',
]);
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

export async function discoverWorkspaceProjects(workspace, _options = {}) {
  if (!workspace || workspace.enabled === false) return [];

  const root = path.resolve(workspace.path);
  const maxDepth = normalizeDiscoveryDepth(workspace.discoveryDepth);
  const candidates = [];
  const seen = new Set();

  async function walk(dir, depth) {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const reasons = detectProjectReasons(entries);
    if (reasons.length > 0 && dir !== root) {
      const resolved = path.resolve(dir);
      if (!seen.has(resolved)) {
        seen.add(resolved);
        candidates.push({
          name: path.basename(resolved),
          path: resolved,
          reasons,
        });
      }
    }

    if (depth === maxDepth) return;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.isSymbolicLink()) continue;
      if (isExcludedDiscoveryName(entry.name)) continue;
      await walk(path.join(dir, entry.name), depth + 1);
    }
  }

  await walk(root, 0);
  candidates.sort((a, b) => a.path.localeCompare(b.path));
  return candidates;
}
