import {
  auditDrawer,
  blockedGatedCandidateDrawer,
  blockerDrawer,
  decisionDrawer,
  docDrawer,
  markerDrawer,
  phaseDrawer,
  riskDrawer,
  specDrawer,
  stepDrawer,
  taskDrawer,
} from './drawer';
import type { ProjectTimelineModel } from './timeline/model';
import { initTimelineViewState } from './timeline/state';
import type { TimelineViewState } from './timeline/state';
import type {
  BlockerItem,
  DrawerDescriptorKind,
  DrawerItem,
  KnowledgeViewId,
  ProjectData,
  ProjectStatus,
  TabId,
} from './types';

export const UI_STATE_VERSION = 2 as const;
export const UI_STATE_STORAGE_KEY = 'projects-viewer.ui-state';
export const UI_STATE_HISTORY_KEY = 'projectsViewer';

export type { DrawerDescriptorKind } from './types';

export type ProjectStatusFilter = ProjectStatus | 'all';

export interface TimelineDescriptor {
  projectId: string;
  revision: string;
  expandedPhaseKey: string | null;
}

export interface DrawerDescriptor {
  projectPath: string;
  kind: DrawerDescriptorKind;
  file: string;
  line?: number;
}

export interface DashboardUiState {
  selectedPath: string | null;
  statusFilter: ProjectStatusFilter;
  activeTab: TabId;
  knowledgeView: KnowledgeViewId;
  query: string;
  includeDiagnostics: boolean;
  timeline: TimelineDescriptor | null;
  drawer: DrawerDescriptor | null;
  primaryViews?: Record<string, PrimaryViewDescriptor>;
}

export interface PrimaryViewDescriptor {
  view: 'roadmap' | 'specs';
  selectedSpecKey: string | null;
  expandedSpecKey: string | null;
  zoom: number;
  panX: number;
  panY: number;
}

interface PersistedUiState extends DashboardUiState {
  version: typeof UI_STATE_VERSION;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HistoryLike {
  readonly state: unknown;
  pushState(data: unknown, unused: string, url?: string | URL | null): void;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

const PROJECT_STATUS_FILTERS = new Set<ProjectStatusFilter>([
  'all',
  'active',
  'stalled',
  'done',
  'pending-approval',
  'needs-review',
  'paused',
  'needs-attention',
  'unknown',
]);
const TAB_IDS = new Set<TabId>(['status', 'work', 'decisions', 'knowledge']);
const KNOWLEDGE_VIEW_IDS = new Set<KnowledgeViewId>(['specs', 'audits', 'docs', 'activity']);
const DRAWER_KINDS = new Set<DrawerDescriptorKind>([
  'phase',
  'step',
  'task',
  'next-action',
  'blocker',
  'signal',
  'decision',
  'spec',
  'doc',
  'audit',
  'risk',
  'marker',
  'diagnostic',
  'heading',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isOptionalSourceLine(value: unknown): value is number | undefined {
  return value === undefined || (Number.isInteger(value) && Number(value) > 0);
}

export function createDefaultUiState(projects: ProjectData[]): DashboardUiState {
  return {
    selectedPath: projects[0]?.path ?? null,
    statusFilter: 'all',
    activeTab: 'status',
    knowledgeView: 'specs',
    query: '',
    includeDiagnostics: false,
    timeline: null,
    drawer: null,
    primaryViews: {},
  };
}

function parseTimelineDescriptor(
  value: unknown,
  projects?: ProjectData[],
): TimelineDescriptor | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.projectId) || !isNonEmptyString(value.revision)) return null;
  if (value.expandedPhaseKey !== null && !isNonEmptyString(value.expandedPhaseKey)) return null;
  if (projects && !projects.some((project) => project.path === value.projectId)) return null;
  return {
    projectId: value.projectId,
    revision: value.revision,
    expandedPhaseKey: value.expandedPhaseKey,
  };
}

function parseDrawerDescriptor(value: unknown): DrawerDescriptor | null {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.projectPath) ||
    !isNonEmptyString(value.file) ||
    typeof value.kind !== 'string' ||
    !DRAWER_KINDS.has(value.kind as DrawerDescriptorKind) ||
    !isOptionalSourceLine(value.line)
  ) {
    return null;
  }
  return {
    projectPath: value.projectPath,
    kind: value.kind as DrawerDescriptorKind,
    file: value.file,
    ...(value.line === undefined ? {} : { line: value.line }),
  };
}

function toPersistedUiState(state: DashboardUiState): PersistedUiState {
  return { version: UI_STATE_VERSION, ...state, primaryViews: state.primaryViews ?? {} };
}

function parsePrimaryViews(value: unknown, projects: ProjectData[]): Record<string, PrimaryViewDescriptor> {
  if (!isRecord(value)) return {};
  const projectIds = new Set(projects.map((project) => project.id ?? project.path));
  const result: Record<string, PrimaryViewDescriptor> = {};
  for (const [projectId, raw] of Object.entries(value)) {
    if (!projectIds.has(projectId) || !isRecord(raw) || (raw.view !== 'roadmap' && raw.view !== 'specs')) continue;
    const zoom = typeof raw.zoom === 'number' && Number.isFinite(raw.zoom) ? Math.max(50, Math.min(150, raw.zoom)) : 100;
    result[projectId] = {
      view: raw.view,
      selectedSpecKey: typeof raw.selectedSpecKey === 'string' ? raw.selectedSpecKey : null,
      expandedSpecKey: typeof raw.expandedSpecKey === 'string' ? raw.expandedSpecKey : null,
      zoom,
      panX: typeof raw.panX === 'number' && Number.isFinite(raw.panX) ? raw.panX : 0,
      panY: typeof raw.panY === 'number' && Number.isFinite(raw.panY) ? raw.panY : 0,
    };
  }
  return result;
}

export function restoreUiState(value: unknown, projects: ProjectData[]): DashboardUiState {
  const defaults = createDefaultUiState(projects);
  if (!isRecord(value) || (value.version !== UI_STATE_VERSION && value.version !== 1)) return defaults;

  const selectedPath =
    typeof value.selectedPath === 'string' &&
    projects.some((project) => project.path === value.selectedPath)
      ? value.selectedPath
      : defaults.selectedPath;
  const statusFilter =
    typeof value.statusFilter === 'string' &&
    PROJECT_STATUS_FILTERS.has(value.statusFilter as ProjectStatusFilter)
      ? (value.statusFilter as ProjectStatusFilter)
      : defaults.statusFilter;
  const activeTab =
    typeof value.activeTab === 'string' && TAB_IDS.has(value.activeTab as TabId)
      ? (value.activeTab as TabId)
      : defaults.activeTab;
  const knowledgeView =
    typeof value.knowledgeView === 'string' &&
    KNOWLEDGE_VIEW_IDS.has(value.knowledgeView as KnowledgeViewId)
      ? (value.knowledgeView as KnowledgeViewId)
      : defaults.knowledgeView;
  const parsedTimeline = parseTimelineDescriptor(value.timeline, projects);
  const timeline =
    parsedTimeline?.projectId === selectedPath ? parsedTimeline : null;
  const drawer = parseDrawerDescriptor(value.drawer);
  const resolvedDrawer = drawer && resolveDrawerDescriptor(drawer, projects) ? drawer : null;

  return {
    selectedPath,
    statusFilter,
    activeTab,
    knowledgeView,
    query: typeof value.query === 'string' ? value.query : defaults.query,
    includeDiagnostics:
      typeof value.includeDiagnostics === 'boolean'
        ? value.includeDiagnostics
        : defaults.includeDiagnostics,
    timeline,
    drawer: resolvedDrawer,
    primaryViews: value.version === 1 ? {} : parsePrimaryViews(value.primaryViews, projects),
  };
}

export function readStoredUiState(
  storage: StorageLike | null | undefined,
  projects: ProjectData[],
): DashboardUiState {
  if (!storage) return createDefaultUiState(projects);
  try {
    const raw = storage.getItem(UI_STATE_STORAGE_KEY);
    return raw === null ? createDefaultUiState(projects) : restoreUiState(JSON.parse(raw), projects);
  } catch {
    return createDefaultUiState(projects);
  }
}

export function writeStoredUiState(
  storage: StorageLike | null | undefined,
  state: DashboardUiState,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(toPersistedUiState(state)));
    return true;
  } catch {
    return false;
  }
}

export function readHistoryUiState(
  history: HistoryLike | null | undefined,
  projects: ProjectData[],
): DashboardUiState {
  if (!history) return createDefaultUiState(projects);
  try {
    const root = history.state;
    const value = isRecord(root) ? root[UI_STATE_HISTORY_KEY] : undefined;
    return restoreUiState(value, projects);
  } catch {
    return createDefaultUiState(projects);
  }
}

export function readInitialUiState(
  history: HistoryLike | null | undefined,
  storage: StorageLike | null | undefined,
  projects: ProjectData[],
): DashboardUiState {
  try {
    const root = history?.state;
    if (
      isRecord(root) &&
      Object.prototype.hasOwnProperty.call(root, UI_STATE_HISTORY_KEY)
    ) {
      return readHistoryUiState(history, projects);
    }
  } catch {
    // Fall back to exception-safe local storage when history is unavailable.
  }
  return readStoredUiState(storage, projects);
}

export function validateUiState(
  state: DashboardUiState,
  projects: ProjectData[],
): DashboardUiState {
  return restoreUiState(toPersistedUiState(state), projects);
}

function writeHistoryUiState(
  history: HistoryLike | null | undefined,
  state: DashboardUiState,
  method: 'pushState' | 'replaceState',
): boolean {
  if (!history) return false;
  try {
    const current = history.state;
    const root = isRecord(current) ? current : {};
    const next = { ...root, [UI_STATE_HISTORY_KEY]: toPersistedUiState(state) };
    // Omitting the optional URL keeps raw local project paths out of browser URLs.
    history[method](next, '');
    return true;
  } catch {
    return false;
  }
}

export function pushHistoryUiState(
  history: HistoryLike | null | undefined,
  state: DashboardUiState,
): boolean {
  return writeHistoryUiState(history, state, 'pushState');
}

export function replaceHistoryUiState(
  history: HistoryLike | null | undefined,
  state: DashboardUiState,
): boolean {
  return writeHistoryUiState(history, state, 'replaceState');
}

export function createDrawerDescriptor(item: DrawerItem): DrawerDescriptor | null {
  const kind = item.descriptorKind;
  if (
    !kind ||
    !DRAWER_KINDS.has(kind) ||
    !isNonEmptyString(item.projectPath) ||
    !isNonEmptyString(item.file) ||
    !isOptionalSourceLine(item.line)
  ) {
    return null;
  }
  return {
    projectPath: item.projectPath,
    kind,
    file: item.file,
    ...(item.line === undefined ? {} : { line: item.line }),
  };
}

function allSignals(project: ProjectData): BlockerItem[] {
  return [
    ...project.signalGroups.realBlockers,
    ...project.signalGroups.approvalGates,
    ...project.signalGroups.needsReview,
    ...project.signalGroups.pausedDeferred,
  ];
}

function headingDrawer(project: ProjectData, index: number): DrawerItem {
  const heading = project.headings[index];
  return {
    descriptorKind: 'heading',
    type: 'Heading',
    title: heading.text,
    file: heading.file,
    line: heading.line,
    projectPath: project.path,
  };
}

function drawerCandidates(project: ProjectData, kind: DrawerDescriptorKind): DrawerItem[] {
  switch (kind) {
    case 'phase':
      return project.phases.map((phase) => phaseDrawer(phase, project));
    case 'step':
      return project.phases.flatMap((phase) =>
        phase.steps.map((step) => stepDrawer(step, project)),
      );
    case 'task':
      return [
        ...project.openTasks.map((item) => taskDrawer(item, project, 'Open task')),
        ...project.completedTasks.map((item) => taskDrawer(item, project, 'Completed task')),
      ];
    case 'next-action':
      return project.nextTasks.map((item) =>
        taskDrawer(item, project, 'Next action', 'next-action'),
      );
    case 'blocker':
      return allSignals(project)
        .filter((item) => item.kind === 'blocked' || item.kind === 'rejection')
        .map((item) => blockerDrawer(item, project));
    case 'signal':
      return allSignals(project)
        .filter((item) => item.kind !== 'blocked' && item.kind !== 'rejection')
        .map((item) => blockerDrawer(item, project));
    case 'decision':
      return project.decisions.map((item) => decisionDrawer(item, project));
    case 'spec':
      return project.specs.map((item) => specDrawer(item, project));
    case 'doc':
      return project.docs.map((item) => docDrawer(item, project));
    case 'audit':
      return project.audits.map((item) => auditDrawer(item, project));
    case 'risk':
      return project.risks.map((item) => riskDrawer(item, project));
    case 'marker':
      return project.markers.map((item) => markerDrawer(item, project));
    case 'diagnostic':
      return [
        ...project.blockedGatedDiagnostics.includedProjectSignals,
        ...project.blockedGatedDiagnostics.filteredAgentRules,
        ...project.blockedGatedDiagnostics.filteredProcessPolicies,
        ...project.blockedGatedDiagnostics.filteredExamplesOrTemplates,
      ].map((item) => blockedGatedCandidateDrawer(item, project));
    case 'heading':
      return project.headings.map((_, index) => headingDrawer(project, index));
  }
}

export function resolveDrawerDescriptor(
  value: unknown,
  projects: ProjectData[],
): DrawerItem | null {
  const descriptor = parseDrawerDescriptor(value);
  if (!descriptor) return null;
  const project = projects.find((item) => item.path === descriptor.projectPath);
  if (!project) return null;
  const matches = drawerCandidates(project, descriptor.kind).filter(
    (item) =>
      item.file === descriptor.file &&
      (descriptor.line === undefined || item.line === descriptor.line),
  );
  return matches.length === 1 ? matches[0] : null;
}

export function restoreTimelineViewState(
  value: unknown,
  model: ProjectTimelineModel,
): TimelineViewState {
  const descriptor = parseTimelineDescriptor(value);
  if (
    !descriptor ||
    descriptor.projectId !== model.projectId ||
    descriptor.revision !== model.revision ||
    (descriptor.expandedPhaseKey !== null &&
      !model.phases.some((phase) => phase.key === descriptor.expandedPhaseKey))
  ) {
    return initTimelineViewState(model);
  }
  return {
    projectId: model.projectId,
    revision: model.revision,
    expandedPhaseKey: descriptor.expandedPhaseKey,
    focused: null,
    detailOriginKey: null,
  };
}
