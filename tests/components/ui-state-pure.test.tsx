import { describe, expect, it, vi } from 'vitest';
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
} from '../../src/drawer';
import { buildProjectTimelineModel } from '../../src/timeline/model';
import { initTimelineViewState } from '../../src/timeline/state';
import {
  UI_STATE_HISTORY_KEY,
  UI_STATE_STORAGE_KEY,
  UI_STATE_VERSION,
  createDefaultUiState,
  createDrawerDescriptor,
  pushHistoryUiState,
  readHistoryUiState,
  readStoredUiState,
  replaceHistoryUiState,
  resolveDrawerDescriptor,
  restoreTimelineViewState,
  writeStoredUiState,
} from '../../src/uiState';
import type {
  DashboardUiState,
  DrawerDescriptor,
  DrawerDescriptorKind,
  HistoryLike,
  StorageLike,
} from '../../src/uiState';
import type { DrawerItem, ProjectData } from '../../src/types';
import { makePhase, makeProject, makeStep } from './fixtures';

function makeEvidenceProject(): ProjectData {
  const phase = makePhase({
    id: '2',
    name: 'Delivery',
    status: 'in_progress',
    file: 'docs/ROADMAP.md',
    line: 20,
    steps: [makeStep({ phaseId: '2', id: '2.1', file: 'docs/ROADMAP.md', line: 22 })],
  });
  const project = makeProject({
    name: 'evidence-project',
    path: 'C:/projects/evidence',
    phases: [phase],
    nextTasks: [
      { text: 'Next evidence', file: 'docs/NEXT.md', line: 3, section: null },
    ],
    openTasks: [
      { text: 'Open evidence', file: 'docs/TASKS.md', line: 4, section: null },
    ],
    completedTasks: [
      { text: 'Completed evidence', file: 'docs/DONE.md', line: 5, section: null },
    ],
    decisions: [
      { date: '2026-07-11', text: 'Decision evidence', file: 'docs/DECISIONS.md', line: 6 },
    ],
    specs: [
      { kind: 'openspec', name: 'change', file: 'openspec/changes/change/proposal.md', status: 'active' },
    ],
    docs: [
      {
        file: 'docs/README.md',
        category: 'core',
        sizeBytes: 100,
        modified: '2026-07-11T00:00:00.000Z',
      },
    ],
    audits: [
      {
        file: 'docs/audits/AUDIT.md',
        title: 'Audit evidence',
        date: '2026-07-11',
        status: 'recorded',
        severeSignals: 0,
      },
    ],
    risks: [{ kind: 'risk', text: 'Risk evidence', file: 'docs/RISKS.md', line: 7 }],
    markers: [{ type: 'TODO', text: 'Marker evidence', file: 'docs/MARKERS.md', line: 8 }],
    headings: [{ text: 'Heading evidence', level: 2, file: 'docs/README.md', line: 9 }],
  });
  project.signalGroups.realBlockers = [
    {
      group: 'realBlockers',
      kind: 'blocked',
      severe: true,
      text: 'Blocker evidence',
      file: 'docs/BLOCKERS.md',
      line: 10,
    },
  ];
  project.signalGroups.needsReview = [
    {
      group: 'needsReview',
      kind: 'needs-review',
      severe: false,
      text: 'Signal evidence',
      file: 'docs/SIGNALS.md',
      line: 11,
    },
  ];
  project.blockedGatedDiagnostics.filteredAgentRules = [
    {
      text: 'Diagnostic evidence',
      file: 'docs/AGENTS.md',
      line: 12,
      classification: 'agent_rule',
      includedInProjectStatus: false,
      confidence: 'high',
      reason: 'Filtered rule',
      matchedKeywords: ['blocked'],
      nearbyContext: 'Diagnostic evidence',
    },
  ];
  return project;
}

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function fullState(project: ProjectData, drawer: DrawerDescriptor): DashboardUiState {
  return {
    selectedPath: project.path,
    statusFilter: 'needs-review',
    activeTab: 'knowledge',
    knowledgeView: 'audits',
    query: 'remember me',
    includeDiagnostics: true,
    timeline: {
      projectId: project.path,
      revision: 'r1',
      expandedPhaseKey: 'phase:2',
    },
    drawer,
  };
}

describe('versioned local UI state', () => {
  it('round-trips all supported fields under one versioned storage contract', () => {
    const project = makeEvidenceProject();
    const drawer = createDrawerDescriptor(
      taskDrawer(project.nextTasks[0], project, 'Next action', 'next-action'),
    );
    expect(drawer).not.toBeNull();
    const state = fullState(project, drawer!);
    const storage = new MemoryStorage();

    expect(writeStoredUiState(storage, state)).toBe(true);
    expect(readStoredUiState(storage, [project])).toEqual(state);

    const persisted = JSON.parse(storage.values.get(UI_STATE_STORAGE_KEY)!);
    expect(persisted.version).toBe(UI_STATE_VERSION);
    expect(persisted.drawer).toEqual({
      projectPath: project.path,
      kind: 'next-action',
      file: 'docs/NEXT.md',
      line: 3,
    });
    expect(persisted.drawer).not.toHaveProperty('type');
    expect(persisted.drawer).not.toHaveProperty('title');
    expect(persisted.drawer).not.toHaveProperty('text');
  });

  it('defaults invalid fields independently while preserving valid fields', () => {
    const project = makeEvidenceProject();
    const storage = new MemoryStorage();
    storage.values.set(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: UI_STATE_VERSION,
        selectedPath: 'C:/arbitrary/stale',
        statusFilter: 'unsupported',
        activeTab: 'decisions',
        knowledgeView: 'unsupported',
        query: 'valid query',
        includeDiagnostics: true,
        timeline: {
          projectId: 'C:/arbitrary/stale',
          revision: 'r1',
          expandedPhaseKey: 'phase:2',
        },
        drawer: {
          projectPath: project.path,
          kind: 'task',
          file: project.openTasks[0].file,
          line: project.openTasks[0].line,
        },
      }),
    );

    expect(readStoredUiState(storage, [project])).toEqual({
      ...createDefaultUiState([project]),
      activeTab: 'decisions',
      query: 'valid query',
      includeDiagnostics: true,
      drawer: {
        projectPath: project.path,
        kind: 'task',
        file: 'docs/TASKS.md',
        line: 4,
      },
    });
  });

  it('drops a timeline descriptor that belongs to a loaded but unselected project', () => {
    const alpha = makeEvidenceProject();
    const beta = makeProject({ name: 'beta', path: 'C:/projects/beta' });
    const storage = new MemoryStorage();
    storage.values.set(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: UI_STATE_VERSION,
        selectedPath: alpha.path,
        statusFilter: 'all',
        activeTab: 'status',
        knowledgeView: 'specs',
        query: '',
        includeDiagnostics: false,
        timeline: {
          projectId: beta.path,
          revision: 'beta-revision',
          expandedPhaseKey: null,
        },
        drawer: null,
      }),
    );

    expect(readStoredUiState(storage, [alpha, beta])).toMatchObject({
      selectedPath: alpha.path,
      timeline: null,
    });
  });

  it('falls back safely for corrupt JSON, unknown versions, and unavailable storage', () => {
    const project = makeEvidenceProject();
    const expected = createDefaultUiState([project]);
    const storage = new MemoryStorage();

    storage.values.set(UI_STATE_STORAGE_KEY, '{broken');
    expect(readStoredUiState(storage, [project])).toEqual(expected);
    storage.values.set(UI_STATE_STORAGE_KEY, JSON.stringify({ version: 999, query: 'stale' }));
    expect(readStoredUiState(storage, [project])).toEqual(expected);

    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error('blocked read');
      },
      setItem: () => {
        throw new Error('blocked write');
      },
    };
    expect(readStoredUiState(throwingStorage, [project])).toEqual(expected);
    expect(writeStoredUiState(throwingStorage, expected)).toBe(false);
  });
});

describe('namespaced history state', () => {
  it('pushes and replaces the same validated state without adding a URL', () => {
    const project = makeEvidenceProject();
    const descriptor = createDrawerDescriptor(docDrawer(project.docs[0], project))!;
    const state = fullState(project, descriptor);
    const history: HistoryLike = {
      state: { foreignFeature: { keep: true } },
      pushState: vi.fn(function (this: HistoryLike, value: unknown) {
        this.state = value;
      }),
      replaceState: vi.fn(function (this: HistoryLike, value: unknown) {
        this.state = value;
      }),
    };

    expect(pushHistoryUiState(history, state)).toBe(true);
    expect(history.pushState).toHaveBeenCalledTimes(1);
    expect(vi.mocked(history.pushState).mock.calls[0]).toHaveLength(2);
    expect(history.state).toMatchObject({
      foreignFeature: { keep: true },
      [UI_STATE_HISTORY_KEY]: { version: UI_STATE_VERSION, selectedPath: project.path },
    });
    expect(readHistoryUiState(history, [project])).toEqual(state);

    expect(replaceHistoryUiState(history, { ...state, query: 'replacement' })).toBe(true);
    expect(vi.mocked(history.replaceState).mock.calls[0]).toHaveLength(2);
    expect(readHistoryUiState(history, [project]).query).toBe('replacement');
  });

  it('ignores foreign/malformed state and catches history read/write exceptions', () => {
    const project = makeEvidenceProject();
    const expected = createDefaultUiState([project]);
    const foreign: HistoryLike = {
      state: { anotherFeature: true },
      pushState: vi.fn(),
      replaceState: vi.fn(),
    };
    expect(readHistoryUiState(foreign, [project])).toEqual(expected);

    foreign.state = { [UI_STATE_HISTORY_KEY]: { version: 999, query: 'stale' } };
    expect(readHistoryUiState(foreign, [project])).toEqual(expected);

    const throwing = {
      get state(): unknown {
        throw new Error('blocked state');
      },
      pushState(): void {
        throw new Error('blocked push');
      },
      replaceState(): void {
        throw new Error('blocked replace');
      },
    } satisfies HistoryLike;
    expect(readHistoryUiState(throwing, [project])).toEqual(expected);
    expect(pushHistoryUiState(throwing, expected)).toBe(false);
    expect(replaceHistoryUiState(throwing, expected)).toBe(false);
  });
});

describe('stable drawer descriptors', () => {
  it('round-trips every supported stable kind through current project evidence', () => {
    const project = makeEvidenceProject();
    const phase = project.phases[0];
    const heading = docDrawer(project.docs[0], project).related![0].item;
    const cases: Array<[DrawerItem, DrawerDescriptorKind]> = [
      [phaseDrawer(phase, project), 'phase'],
      [stepDrawer(phase.steps[0], project), 'step'],
      [taskDrawer(project.openTasks[0], project, 'Open task'), 'task'],
      [taskDrawer(project.completedTasks[0], project, 'Completed task'), 'task'],
      [taskDrawer(project.nextTasks[0], project, 'Next action', 'next-action'), 'next-action'],
      [blockerDrawer(project.signalGroups.realBlockers[0], project), 'blocker'],
      [blockerDrawer(project.signalGroups.needsReview[0], project), 'signal'],
      [decisionDrawer(project.decisions[0], project), 'decision'],
      [specDrawer(project.specs[0], project), 'spec'],
      [docDrawer(project.docs[0], project), 'doc'],
      [auditDrawer(project.audits[0], project), 'audit'],
      [riskDrawer(project.risks[0], project), 'risk'],
      [markerDrawer(project.markers[0], project), 'marker'],
      [
        blockedGatedCandidateDrawer(
          project.blockedGatedDiagnostics.filteredAgentRules[0],
          project,
        ),
        'diagnostic',
      ],
      [heading, 'heading'],
    ];

    for (const [item, expectedKind] of cases) {
      expect(item).toHaveProperty('descriptorKind', expectedKind);
      expect(
        (createDrawerDescriptor as unknown as (value: DrawerItem) => DrawerDescriptor | null)(item),
        item.type,
      ).toMatchObject({
        projectPath: project.path,
        kind: expectedKind,
        file: item.file,
      });
      const descriptor = createDrawerDescriptor(item);
      expect(descriptor, item.type).toMatchObject({
        projectPath: project.path,
        kind: expectedKind,
        file: item.file,
      });
      expect(Object.keys(descriptor!).sort()).toEqual(
        (item.line === undefined
          ? ['file', 'kind', 'projectPath']
          : ['file', 'kind', 'line', 'projectPath']
        ).sort(),
      );
      expect(resolveDrawerDescriptor(descriptor!, [project]), item.type).toMatchObject({
        file: item.file,
        projectPath: project.path,
        ...(item.line === undefined ? {} : { line: item.line }),
      });
    }
  });

  it('requires one exact current match and rejects stale paths, lines, kinds, and ambiguity', () => {
    const project = makeEvidenceProject();
    const docDescriptor: DrawerDescriptor = {
      projectPath: project.path,
      kind: 'doc',
      file: project.docs[0].file,
    };
    expect(resolveDrawerDescriptor(docDescriptor, [project])).not.toBeNull();
    expect(
      resolveDrawerDescriptor({ ...docDescriptor, projectPath: 'C:/arbitrary/stale' }, [project]),
    ).toBeNull();
    expect(
      resolveDrawerDescriptor(
        {
          projectPath: project.path,
          kind: 'task',
          file: project.openTasks[0].file,
          line: 999,
        },
        [project],
      ),
    ).toBeNull();
    expect(
      resolveDrawerDescriptor(
        { projectPath: project.path, kind: 'unknown', file: 'docs/TASKS.md' } as DrawerDescriptor,
        [project],
      ),
    ).toBeNull();

    const ambiguous = makeProject({
      ...project,
      docs: [project.docs[0], { ...project.docs[0] }],
    });
    expect(resolveDrawerDescriptor(docDescriptor, [ambiguous])).toBeNull();
    const relabelled = docDrawer(project.docs[0], project);
    relabelled.type = 'Localized human-facing label';
    expect(
      (createDrawerDescriptor as unknown as (value: DrawerItem) => DrawerDescriptor | null)(
        relabelled,
      ),
    ).toEqual(docDescriptor);
    expect(createDrawerDescriptor(relabelled)).toEqual(docDescriptor);
    const invalidKind = {
      ...relabelled,
      descriptorKind: 'unknown' as DrawerDescriptorKind,
    };
    expect(createDrawerDescriptor(invalidKind)).toBeNull();
    const transientOnly = { ...relabelled } as DrawerItem & { descriptorKind?: string };
    delete transientOnly.descriptorKind;
    expect(
      (createDrawerDescriptor as unknown as (value: DrawerItem) => DrawerDescriptor | null)(
        transientOnly,
      ),
    ).toBeNull();

    const sameFileTasks = makeProject({
      ...project,
      openTasks: [
        { text: 'First', file: 'docs/SHARED.md', line: 20, section: null },
        { text: 'Second', file: 'docs/SHARED.md', line: 21, section: null },
      ],
      completedTasks: [],
    });
    expect(
      resolveDrawerDescriptor(
        {
          projectPath: project.path,
          kind: 'task',
          file: 'docs/SHARED.md',
          line: 21,
        },
        [sameFileTasks],
      ),
    ).toMatchObject({ title: 'Second', line: 21 });
    expect(
      resolveDrawerDescriptor(
        { projectPath: project.path, kind: 'task', file: 'docs/SHARED.md' },
        [sameFileTasks],
      ),
    ).toBeNull();
  });
});

describe('timeline descriptor restoration', () => {
  it('restores expansion only for the same project, revision, and existing phase key', () => {
    const project = makeEvidenceProject();
    const model = buildProjectTimelineModel(project, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    const descriptor = {
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: model.phases[0].key,
    };

    expect(restoreTimelineViewState(descriptor, model)).toEqual({
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: model.phases[0].key,
      focused: null,
      detailOriginKey: null,
    });

    const fallback = initTimelineViewState(model);
    expect(restoreTimelineViewState({ ...descriptor, projectId: 'C:/other' }, model)).toEqual(fallback);
    expect(restoreTimelineViewState({ ...descriptor, revision: 'stale' }, model)).toEqual(fallback);
    expect(restoreTimelineViewState({ ...descriptor, expandedPhaseKey: 'missing' }, model)).toEqual(
      fallback,
    );
    expect(restoreTimelineViewState(null, model)).toEqual(fallback);
  });
});
