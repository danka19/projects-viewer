import { describe, expect, it } from 'vitest';
import { buildSpecCanvasModel, previewSpecTasks, resolvePrimaryView } from '../../src/specs/model';
import { makeProject } from './fixtures';
import type { RawSpecWorkModel } from '../../src/types';

function raw(overrides: Partial<RawSpecWorkModel> = {}): RawSpecWorkModel {
  return {
    projectId: 'fixture',
    specifications: [
      {
        key: 'fixture:base', id: 'base', name: 'Base', kind: 'openspec-change',
        lifecycleStatus: 'closed', confidence: 'high', source: { file: 'openspec/changes/base/proposal.md', line: 1 },
        sourceScopeId: 'openspec/changes', groupId: null,
        tasks: [{ key: 'base:1', id: null, name: 'Done', status: 'closed', source: { file: 'openspec/changes/base/tasks.md', line: 1 }, order: 0 }],
        dependsOnIds: [],
      },
      {
        key: 'fixture:feature', id: 'feature', name: 'Feature', kind: 'openspec-change',
        lifecycleStatus: 'in_progress', confidence: 'high', source: { file: 'openspec/changes/feature/proposal.md', line: 1 },
        sourceScopeId: 'openspec/changes', groupId: 'product',
        tasks: [
          { key: 'feature:1', id: null, name: 'First', status: 'closed', source: { file: 'openspec/changes/feature/tasks.md', line: 1 }, order: 0 },
          { key: 'feature:2', id: null, name: 'Second', status: 'blocked', source: { file: 'openspec/changes/feature/tasks.md', line: 2 }, order: 1 },
          { key: 'feature:3', id: null, name: 'Third', status: 'cancelled', source: { file: 'openspec/changes/feature/tasks.md', line: 3 }, order: 2 },
        ],
        dependsOnIds: ['base'],
      },
    ],
    dependencies: [{ key: 'base->feature', prerequisiteId: 'base', dependentId: 'feature', sourceEvidence: [{ file: 'openspec/changes/feature/proposal.md' }], state: 'unknown' }],
    unassignedTasks: [], integrityIssues: [], isPartial: false,
    ...overrides,
  };
}

describe('spec canvas model', () => {
  it('keeps lifecycle separate, calculates eligible progress, and finds exactly one current spec', () => {
    const model = buildSpecCanvasModel(makeProject({ specWork: raw() }), { generatedAt: '2026-07-11T00:00:00Z', sourceMode: 'live' });
    const feature = model.specifications.find((item) => item.id === 'feature')!;
    expect(feature.progress).toMatchObject({ percent: 50, completed: 1, total: 2 });
    expect(feature.lifecycleStatus).toBe('in_progress');
    expect(feature.dependencyState).toBe('clear');
    expect(model.explicitCurrentSpecKey).toBe(feature.key);
  });

  it('keeps no-task accepted capability progress unknown while retaining final change progress', () => {
    const input = raw({
      specifications: [
        {
          key: 'fixture:accepted-capability', id: 'accepted-capability', name: 'Accepted capability', kind: 'accepted-capability',
          lifecycleStatus: 'accepted', confidence: 'high', source: { file: 'openspec/specs/accepted-capability/spec.md', line: 1 },
          sourceScopeId: 'openspec/specs', groupId: null, tasks: [], dependsOnIds: [],
        },
        {
          key: 'fixture:closed-change', id: 'closed-change', name: 'Closed change', kind: 'openspec-change',
          lifecycleStatus: 'closed', confidence: 'high', source: { file: 'openspec/changes/closed-change/proposal.md', line: 1 },
          sourceScopeId: 'openspec/changes', groupId: null, tasks: [], dependsOnIds: [],
        },
      ],
      dependencies: [],
    });

    const model = buildSpecCanvasModel(makeProject({ specWork: input }), { generatedAt: 'x', sourceMode: 'live' });

    expect(model.specifications.find((item) => item.id === 'accepted-capability')?.progress).toBeNull();
    expect(model.specifications.find((item) => item.id === 'closed-change')?.progress).toMatchObject({ percent: 100, completed: 0, total: 0 });
    expect(model.progress.unknown).toBe(1);
  });

  it('blocks an otherwise planned dependent and invalidates cycles without inventing current work', () => {
    const input = raw();
    input.specifications[0].lifecycleStatus = 'pending_acceptance';
    input.specifications[1].lifecycleStatus = 'planned';
    input.specifications[0].dependsOnIds = ['feature'];
    input.dependencies.push({ key: 'feature->base', prerequisiteId: 'feature', dependentId: 'base', sourceEvidence: [], state: 'unknown' });
    input.integrityIssues.push({ kind: 'cycle', message: 'Dependency cycle: base, feature' });
    const model = buildSpecCanvasModel(makeProject({ specWork: input }), { generatedAt: 'x', sourceMode: 'static' });
    expect(model.explicitCurrentSpecKey).toBeNull();
    expect(model.specifications.every((item) => item.dependencyState === 'invalid')).toBe(true);
  });

  it('uses deterministic task previews and stable revisions independent of input order', () => {
    const input = raw();
    const many = Array.from({ length: 9 }, (_, index) => ({
      key: `task:${index}`, id: index === 5 ? 'current' : null, name: `Task ${index}`,
      status: index < 4 ? 'closed' as const : index === 5 ? 'in_progress' as const : 'planned' as const,
      source: { file: 'tasks.md', line: index + 1 }, order: index,
    }));
    expect(previewSpecTasks(many).tasks.map((task) => task.name)).toEqual(['Task 3', 'Task 4', 'Task 5', 'Task 6', 'Task 7', 'Task 8']);
    const first = buildSpecCanvasModel(makeProject({ specWork: input }), { generatedAt: 'a', sourceMode: 'live' });
    const shuffled = { ...input, specifications: [...input.specifications].reverse(), dependencies: [...input.dependencies].reverse() };
    const second = buildSpecCanvasModel(makeProject({ specWork: shuffled }), { generatedAt: 'b', sourceMode: 'stale' });
    expect(second.revision).toBe(first.revision);
    expect(second.specifications.map((item) => item.key)).toEqual(first.specifications.map((item) => item.key));
  });

  it('resolves saved, configured, only-view, roadmap tie, and empty priorities', () => {
    expect(resolvePrimaryView({ saved: 'specs', configured: 'roadmap', roadmapCount: 2, specsCount: 3 }).view).toBe('specs');
    expect(resolvePrimaryView({ saved: null, configured: 'specs', roadmapCount: 2, specsCount: 3 }).view).toBe('specs');
    expect(resolvePrimaryView({ saved: 'roadmap', configured: null, roadmapCount: 0, specsCount: 3 })).toMatchObject({ view: 'specs', reason: 'No roadmap detected — showing Specs' });
    expect(resolvePrimaryView({ saved: null, configured: null, roadmapCount: 2, specsCount: 3 }).view).toBe('roadmap');
    expect(resolvePrimaryView({ saved: null, configured: null, roadmapCount: 0, specsCount: 0 }).view).toBeNull();
  });

  it('keeps the checked-in legacy static spec list useful without inventing dependencies', () => {
    const project = makeProject({
      specWork: undefined,
      specs: [{ kind: 'openspec', name: 'legacy-change', file: 'openspec/changes/legacy-change/proposal.md', status: 'active' }],
    });
    const model = buildSpecCanvasModel(project, { generatedAt: 'static', sourceMode: 'static' });
    expect(model.specifications).toHaveLength(1);
    expect(model.specifications[0]).toMatchObject({ id: 'legacy-change', lifecycleStatus: 'in_progress', dependencyState: 'unknown' });
    expect(model.dependencies).toEqual([]);
  });
});
