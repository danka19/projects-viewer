import type {
  ProjectData,
  RawSpecTask,
  RawSpecWorkItem,
  SpecDependencyState,
  SpecLifecycleStatus,
  SpecSourceEvidence,
} from '../types';

export type PrimaryWorkView = 'roadmap' | 'specs';

export interface SpecProgress {
  percent: number;
  completed: number;
  total: number;
}

export interface SpecWorkItemModel extends RawSpecWorkItem {
  dependencyState: SpecDependencyState;
  progress: SpecProgress | null;
  dependencyText: string[];
}

export interface SpecDependencyModel {
  key: string;
  prerequisiteKey: string;
  dependentKey: string;
  prerequisiteId: string;
  dependentId: string;
  label: string;
  state: 'satisfied' | 'unsatisfied' | 'invalid' | 'unknown';
  sourceEvidence: SpecSourceEvidence[];
}

export interface SpecCanvasModel {
  projectId: string;
  revision: string;
  generatedAt: string;
  sourceMode: 'live' | 'static' | 'stale';
  specifications: SpecWorkItemModel[];
  dependencies: SpecDependencyModel[];
  unassignedTasks: RawSpecTask[];
  explicitCurrentSpecKey: string | null;
  progress: { percent: number | null; known: number; unknown: number };
  integrityIssues: NonNullable<ProjectData['specWork']>['integrityIssues'];
  isPartial: boolean;
}

const FINAL = new Set<SpecLifecycleStatus>(['accepted', 'closed', 'archived']);
const RESOLVED_TASK = new Set(['accepted', 'closed']);
const EXCLUDED_TASK = new Set(['cancelled', 'superseded']);

function stableHash(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

function progressOf(item: RawSpecWorkItem): SpecProgress | null {
  const eligible = item.tasks.filter((task) => !EXCLUDED_TASK.has(task.status));
  if (eligible.length === 0) {
    if (item.kind === 'accepted-capability') return null;
    return FINAL.has(item.lifecycleStatus) ? { percent: 100, completed: 0, total: 0 } : null;
  }
  const completed = eligible.filter((task) => RESOLVED_TASK.has(task.status)).length;
  return { percent: Math.round((completed / eligible.length) * 100), completed, total: eligible.length };
}

export function previewSpecTasks(tasks: RawSpecTask[]) {
  const ordered = [...tasks].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  if (ordered.length <= 6) return { tasks: ordered, hiddenCount: 0, total: ordered.length };
  const current = ordered.findIndex((task) => task.status === 'in_progress');
  let preview: RawSpecTask[];
  if (current >= 0) {
    const start = Math.max(0, Math.min(current - 2, ordered.length - 6));
    preview = ordered.slice(start, start + 6);
  } else {
    const unresolved = ordered.filter((task) => !RESOLVED_TASK.has(task.status) && !EXCLUDED_TASK.has(task.status));
    preview = unresolved.length > 0 ? unresolved.slice(0, 6) : ordered.slice(-6);
  }
  return { tasks: preview, hiddenCount: ordered.length - preview.length, total: ordered.length };
}

export function buildSpecCanvasModel(
  project: ProjectData,
  options: { generatedAt: string; sourceMode: 'live' | 'static' | 'stale' },
): SpecCanvasModel {
  const legacySpecifications: RawSpecWorkItem[] = project.specs
    .filter((item) => item.kind === 'openspec')
    .map((item) => ({
      key: `${project.id ?? project.path}:${item.file}`,
      id: item.name,
      name: item.name,
      kind: 'openspec-change',
      lifecycleStatus: item.status === 'active' ? 'in_progress' : item.status === 'archived' ? 'archived' : item.status === 'done' ? 'pending_acceptance' : 'planned',
      confidence: 'medium',
      source: { file: item.file },
      sourceScopeId: item.file.split('/').slice(0, 2).join('/'),
      groupId: null,
      tasks: [],
      dependsOnIds: [],
    }));
  const raw = project.specWork ?? { projectId: project.id ?? project.path, specifications: legacySpecifications, dependencies: [], unassignedTasks: [], integrityIssues: [], isPartial: false };
  const sorted = [...raw.specifications].sort((a, b) => a.key.localeCompare(b.key));
  const byId = new Map(sorted.map((item) => [item.id, item]));
  const cycleIds = new Set<string>();
  for (const issue of raw.integrityIssues) {
    if (issue.kind === 'cycle') {
      const declaredIds = new Set(issue.message.replace(/^.*?:\s*/, '').split(',').map((id) => id.trim()));
      for (const item of sorted) if (declaredIds.has(item.id)) cycleIds.add(item.id);
    }
  }
  const dependencies: SpecDependencyModel[] = raw.dependencies.map((edge) => {
    const prerequisite = byId.get(edge.prerequisiteId);
    const dependent = byId.get(edge.dependentId);
    const invalid = edge.state === 'invalid' || !prerequisite || !dependent || cycleIds.has(edge.prerequisiteId) || cycleIds.has(edge.dependentId);
    const state: SpecDependencyModel['state'] = invalid ? 'invalid' : FINAL.has(prerequisite.lifecycleStatus) ? 'satisfied' : 'unsatisfied';
    return {
      ...edge,
      prerequisiteKey: prerequisite?.key ?? `missing:${edge.prerequisiteId}`,
      dependentKey: dependent?.key ?? `missing:${edge.dependentId}`,
      label: state === 'unsatisfied' ? `Blocked by ${edge.prerequisiteId}` : `Requires ${edge.prerequisiteId}`,
      state,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));
  const specifications = sorted.map((item): SpecWorkItemModel => {
    const incoming = dependencies.filter((edge) => edge.dependentId === item.id);
    const outgoing = dependencies.filter((edge) => edge.prerequisiteId === item.id);
    const dependencyState: SpecDependencyState = cycleIds.has(item.id) || incoming.some((edge) => edge.state === 'invalid')
      ? 'invalid'
      : incoming.some((edge) => edge.state === 'unsatisfied')
        ? 'blocked'
        : incoming.length > 0 || outgoing.length > 0 ? 'clear' : 'unknown';
    return {
      ...item,
      tasks: [...item.tasks].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key)),
      progress: progressOf(item),
      dependencyState,
      dependencyText: [
        ...incoming.map((edge) => `${edge.state === 'unsatisfied' ? 'Blocked by' : 'Requires'} ${edge.prerequisiteId}`),
        ...outgoing.map((edge) => `Enables ${edge.dependentId}`),
      ],
    };
  });
  const current = specifications.filter((item) => item.lifecycleStatus === 'in_progress');
  const known = specifications.map((item) => item.progress?.percent).filter((value): value is number => value !== undefined && value !== null);
  const revisionInput = {
    specs: specifications.map(({ key, lifecycleStatus, dependencyState, progress, tasks }) => ({ key, lifecycleStatus, dependencyState, progress, tasks: tasks.map((task) => [task.key, task.status]) })),
    edges: dependencies.map(({ key, state }) => [key, state]),
    issues: raw.integrityIssues.map((issue) => [issue.kind, issue.message]).sort(),
    partial: raw.isPartial,
  };
  return {
    projectId: raw.projectId,
    revision: stableHash(revisionInput),
    generatedAt: options.generatedAt,
    sourceMode: options.sourceMode,
    specifications,
    dependencies,
    unassignedTasks: raw.unassignedTasks,
    explicitCurrentSpecKey: current.length === 1 ? current[0].key : null,
    progress: { percent: known.length ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length) : null, known: known.length, unknown: specifications.length - known.length },
    integrityIssues: raw.integrityIssues,
    isPartial: raw.isPartial,
  };
}

export function resolvePrimaryView({
  saved,
  configured,
  roadmapCount,
  specsCount,
}: {
  saved: PrimaryWorkView | null;
  configured: PrimaryWorkView | null;
  roadmapCount: number;
  specsCount: number;
}): { view: PrimaryWorkView | null; reason: string | null } {
  const available = { roadmap: roadmapCount > 0, specs: specsCount > 0 };
  if (saved && available[saved]) return { view: saved, reason: null };
  if (!saved && configured && available[configured]) return { view: configured, reason: null };
  if (available.roadmap && !available.specs) return { view: 'roadmap', reason: saved === 'specs' ? 'No specifications detected — showing Roadmap' : null };
  if (available.specs && !available.roadmap) return { view: 'specs', reason: saved === 'roadmap' ? 'No roadmap detected — showing Specs' : null };
  if (available.roadmap && available.specs) return { view: 'roadmap', reason: saved ? `Saved ${saved} view is unavailable — showing Roadmap` : null };
  return { view: null, reason: null };
}
