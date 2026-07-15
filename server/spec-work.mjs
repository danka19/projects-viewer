const TASK_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/;
const FINAL_RE = /\b(accepted|closed|done|archived|complete(?:d)?)\b/i;
const ACTIVE_RE = /\b(in[_ -]?progress|currently working|active)\b/i;
const PENDING_RE = /pending[_ -]?(acceptance|approval)|needs review|awaiting review/i;
const BLOCKED_RE = /\bblocked\b/i;

function normalizePath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function inRoots(file, roots) {
  return roots.some((root) => file === root || file.startsWith(`${root}/`));
}

function parseFrontmatter(content) {
  const lines = String(content ?? '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { work: null, bodyStart: 0 };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (end < 0) return { work: null, bodyStart: 0, malformed: true };
  const work = { id: null, dependsOn: [], group: null };
  let inWork = false;
  let inDepends = false;
  for (const raw of lines.slice(1, end)) {
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (indent === 0) {
      inWork = line === 'work:';
      inDepends = false;
      continue;
    }
    if (!inWork) continue;
    const field = line.match(/^(id|group):\s*(.+)$/);
    if (field) {
      const value = field[2].trim().replace(/^['"]|['"]$/g, '');
      work[field[1]] = value || null;
      inDepends = false;
      continue;
    }
    const inline = line.match(/^dependsOn:\s*\[(.*)\]\s*$/);
    if (inline) {
      work.dependsOn = inline[1].split(',').map((value) => value.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      inDepends = false;
      continue;
    }
    if (line === 'dependsOn:') {
      inDepends = true;
      continue;
    }
    const item = inDepends ? line.match(/^-\s+(.+)$/) : null;
    if (item) work.dependsOn.push(item[1].trim().replace(/^['"]|['"]$/g, ''));
  }
  return { work, bodyStart: end + 1 };
}

function titleOf(content, fallback) {
  return String(content ?? '').match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function roadmapMetadata(content, file, kind) {
  const lines = String(content ?? '').split(/\r?\n/);
  const heading = lines.findIndex((line) => /^##\s+Roadmap\s*$/i.test(line));
  if (heading < 0) return { phaseId: null, stepId: null, relatedPhaseIds: [], evidence: [] };
  const end = lines.findIndex((line, index) => index > heading && /^##\s+/.test(line));
  const section = lines.slice(heading + 1, end < 0 ? lines.length : end);
  const phaseField = kind === 'accepted-capability' ? 'Roadmap phase' : 'Execution phase';
  const stepField = kind === 'accepted-capability' ? 'Roadmap step' : 'Execution step';
  const read = (field) => {
    const index = section.findIndex((line) => new RegExp(`^[-*]?\\s*${field}:\\s*(.+)$`, 'i').test(line));
    if (index < 0) return { value: null, line: null };
    const value = section[index].match(/^[-*]?\s*[^:]+:\s*(.+)$/)?.[1]?.trim() ?? null;
    return { value: value && value.toLowerCase() !== 'none' ? value : null, line: heading + index + 2 };
  };
  const phase = read(phaseField);
  const step = read(stepField);
  const related = read('Related phases');
  const normalizePhase = (value) => {
    const match = String(value ?? '').trim().match(/^P?(\d+)$/i);
    return match ? `P${Number(match[1])}` : null;
  };
  return {
    phaseId: normalizePhase(phase.value),
    stepId: step.value,
    relatedPhaseIds: related.value ? related.value.split(',').map(normalizePhase).filter(Boolean) : [],
    evidence: [[phaseField, phase], [stepField, step]]
      .filter(([, item]) => item.line !== null)
      .map(([field, item]) => ({ file, line: item.line, field })),
  };
}

function ownershipIssue(item, phases) {
  if (!Array.isArray(phases) || phases.length === 0 || !item.roadmapPhaseId) return null;
  const phase = phases.find((candidate) => candidate.id === item.roadmapPhaseId);
  if (!phase) return `Unknown roadmap phase ${item.roadmapPhaseId}.`;
  if (item.roadmapStepId && !phase.steps.some((step) => step.id === item.roadmapStepId)) {
    return `Unknown roadmap step ${item.roadmapStepId} in phase ${item.roadmapPhaseId}.`;
  }
  return null;
}

function lifecycleOf(content, archived = false) {
  if (archived) return 'archived';
  const status = String(content ?? '').match(/^Status:\s*(.+)$/im)?.[1] ?? '';
  if (PENDING_RE.test(status)) return 'pending_acceptance';
  if (BLOCKED_RE.test(status)) return 'blocked';
  if (ACTIVE_RE.test(status)) return 'in_progress';
  if (FINAL_RE.test(status)) return 'closed';
  return 'planned';
}

function tasksFrom(doc, ownerId = null) {
  return String(doc.content ?? '').split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(TASK_RE);
    if (!match) return [];
    return [{
      key: `${normalizePath(doc.file)}:${index + 1}`,
      id: null,
      name: match[2].trim(),
      status: match[1].trim() ? 'closed' : 'planned',
      source: { file: normalizePath(doc.file), line: index + 1 },
      order: index,
      ownerId,
    }];
  });
}

function identityFor(doc) {
  const file = normalizePath(doc.file);
  let match = file.match(/^(?:\.?)openspec\/changes\/archive\/([^/]+)\/proposal\.md$/i);
  if (match) return { sourceId: match[1], kind: 'openspec-change', archived: true };
  match = file.match(/^(?:\.?)openspec\/changes\/([^/]+)\/proposal\.md$/i);
  if (match) return { sourceId: match[1], kind: 'openspec-change', archived: /\/archive\//i.test(file) };
  match = file.match(/^(?:\.?)openspec\/specs\/([^/]+)\/spec\.md$/i);
  if (match) return { sourceId: match[1], kind: 'accepted-capability', archived: false };
  const frontmatter = parseFrontmatter(doc.content);
  if (frontmatter.work?.id) return { sourceId: frontmatter.work.id, kind: 'generic-spec', archived: false };
  return null;
}

function findCycles(ids, dependencies) {
  const graph = new Map(ids.map((id) => [id, []]));
  for (const edge of dependencies) if (graph.has(edge.prerequisiteId) && graph.has(edge.dependentId)) graph.get(edge.prerequisiteId).push(edge.dependentId);
  const visiting = new Set();
  const visited = new Set();
  const cyclic = new Set();
  function visit(id, stack) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      for (const item of stack.slice(start)) cyclic.add(item);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of graph.get(id) ?? []) visit(next, [...stack, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id, []);
  return cyclic;
}

export function buildSpecWork({ projectId, docs = [], documentationViews, phases = [], truncated = false }) {
  const normalizedDocs = docs.map((doc) => ({ ...doc, file: normalizePath(doc.file) }));
  const configuredRoots = documentationViews?.specs?.roots?.map(normalizePath) ?? [];
  const candidates = configuredRoots.length > 0
    ? normalizedDocs.filter((doc) => inRoots(doc.file, configuredRoots))
    : normalizedDocs.filter((doc) => doc.category === 'spec' || /^(?:\.?)openspec\//i.test(doc.file));
  const integrityIssues = [];
  const byId = new Map();
  const items = [];
  for (const doc of candidates) {
    const identity = identityFor(doc);
    if (!identity) continue;
    const frontmatter = parseFrontmatter(doc.content);
    if (frontmatter.malformed) integrityIssues.push({ kind: 'invalid-frontmatter', message: `Unclosed frontmatter in ${doc.file}`, source: { file: doc.file } });
    const id = frontmatter.work?.id || identity.sourceId;
    const ownership = roadmapMetadata(doc.content, doc.file, identity.kind);
    const item = {
      key: `${projectId}:${doc.file}`,
      id,
      name: titleOf(doc.content, identity.sourceId),
      kind: identity.kind,
      lifecycleStatus: lifecycleOf(doc.content, identity.archived),
      _hasExplicitLifecycle: /^Status:\s*.+$/im.test(String(doc.content ?? '')),
      confidence: 'high',
      source: { file: doc.file, line: 1 },
      sourceScopeId: doc.file.split('/').slice(0, 2).join('/'),
      groupId: frontmatter.work?.group ?? null,
      tasks: [],
      dependsOnIds: [...new Set(frontmatter.work?.dependsOn ?? [])],
      roadmapPhaseId: ownership.phaseId,
      roadmapStepId: ownership.stepId,
      relatedPhaseIds: ownership.relatedPhaseIds,
      ownershipEvidence: ownership.evidence,
    };
    const ownershipError = ownershipIssue(item, phases);
    if (ownershipError) {
      integrityIssues.push({ kind: 'invalid-ownership', message: `${id}: ${ownershipError}`, source: item.source });
      item.roadmapPhaseId = null;
      item.roadmapStepId = null;
    }
    items.push(item);
    if (byId.has(id)) {
      const kinds = new Set([byId.get(id).kind, item.kind]);
      if (kinds.has('accepted-capability') && kinds.has('openspec-change')) {
        integrityIssues.push({ kind: 'parallel-lifecycle', message: `Accepted capability and active change share logical id: ${id}.`, source: item.source });
      } else {
        integrityIssues.push({ kind: 'duplicate-id', message: `Duplicate specification id: ${id}`, source: item.source });
      }
    } else {
      byId.set(id, item);
    }
  }
  for (const doc of candidates) {
    const match = doc.file.match(/^(?:\.?)openspec\/changes\/(?:archive\/)?([^/]+)\/tasks\.md$/i);
    if (match) {
      const owner = items.find((item) => item.kind === 'openspec-change' && (item.id === match[1] || item.source.file.includes(`/changes/${match[1]}/`)));
      if (owner) {
        const secondary = parseFrontmatter(doc.content).work;
        if (secondary && (
          (secondary.id && secondary.id !== owner.id) ||
          (secondary.group && secondary.group !== owner.groupId) ||
          secondary.dependsOn.some((id) => !owner.dependsOnIds.includes(id)) ||
          owner.dependsOnIds.some((id) => !secondary.dependsOn.includes(id))
        )) {
          integrityIssues.push({
            kind: 'contradictory-metadata',
            message: `Identity metadata in ${owner.source.file} overrides contradictory work metadata in ${doc.file}`,
            source: { file: doc.file, line: 1 },
          });
        }
        owner.tasks.push(...tasksFrom(doc, owner.id));
      }
    }
    const genericOwner = items.find((item) => item.kind === 'generic-spec' && item.source.file === doc.file);
    if (genericOwner) genericOwner.tasks.push(...tasksFrom(doc, genericOwner.id));
  }
  for (const item of items) {
    if (item.kind === 'accepted-capability') item.lifecycleStatus = 'accepted';
    else if (item.lifecycleStatus !== 'archived' && !item._hasExplicitLifecycle && item.tasks.length > 0) {
      item.lifecycleStatus = item.tasks.every((task) => task.status === 'closed')
        ? 'pending_acceptance'
        : item.tasks.some((task) => task.status === 'closed' || task.status === 'in_progress')
          ? 'in_progress'
          : 'planned';
    }
  }
  const ownedSources = new Set(items.flatMap((item) => item.tasks.map((task) => `${task.source.file}:${task.source.line}`)));
  const unassignedTasks = candidates
    .filter((doc) => !/^(?:\.?)openspec\//i.test(doc.file) && /(^|[/_.-])(tasks?|todo)([/_.-]|$)/i.test(doc.file.split('/').pop() ?? ''))
    .flatMap((doc) => tasksFrom(doc))
    .filter((task) => !ownedSources.has(`${task.source.file}:${task.source.line}`));
  const dependencies = [];
  for (const item of items) {
    for (const prerequisiteId of item.dependsOnIds) {
      const edge = {
        key: `${prerequisiteId}->${item.id}`,
        prerequisiteId,
        dependentId: item.id,
        sourceEvidence: [item.source],
        state: prerequisiteId === item.id ? 'invalid' : byId.has(prerequisiteId) ? 'unknown' : 'invalid',
      };
      dependencies.push(edge);
      if (prerequisiteId === item.id) integrityIssues.push({ kind: 'self-dependency', message: `${item.id} depends on itself`, source: item.source });
      else if (!byId.has(prerequisiteId)) integrityIssues.push({ kind: 'missing-target', message: `Missing prerequisite: ${prerequisiteId}`, source: item.source });
    }
  }
  const cyclic = findCycles([...byId.keys()], dependencies.filter((edge) => edge.prerequisiteId !== edge.dependentId));
  if (cyclic.size > 0) integrityIssues.push({ kind: 'cycle', message: `Dependency cycle: ${[...cyclic].sort().join(', ')}` });
  return {
    projectId,
    specifications: items.map(({ _hasExplicitLifecycle: _ignored, ...item }) => item).sort((a, b) => a.key.localeCompare(b.key)),
    dependencies: dependencies.sort((a, b) => a.key.localeCompare(b.key)),
    unassignedTasks,
    integrityIssues,
    isPartial: Boolean(truncated),
  };
}
