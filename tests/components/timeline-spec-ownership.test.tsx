import { describe, expect, it } from 'vitest';
import type { RawSpecWorkModel } from '../../src/types';
import { buildTimelineSpecOwnership } from '../../src/timeline/specOwnership';

const source = (file: string) => ({ file, line: 1 });

function spec(overrides: Partial<RawSpecWorkModel['specifications'][number]> = {}) {
  return {
    key: 'project:openspec/changes/large/proposal.md',
    id: 'large',
    name: 'Large specification',
    kind: 'openspec-change' as const,
    lifecycleStatus: 'in_progress' as const,
    confidence: 'high' as const,
    source: source('openspec/changes/large/proposal.md'),
    sourceScopeId: 'openspec/changes',
    groupId: null,
    tasks: [{ key: 'task:1', id: null, name: 'Build it', status: 'planned' as const, source: source('openspec/changes/large/tasks.md'), order: 0 }],
    dependsOnIds: [],
    roadmapPhaseId: 'P4',
    roadmapStepId: '7.1',
    relatedPhaseIds: [],
    ownershipEvidence: [{ ...source('openspec/changes/large/proposal.md'), field: 'Execution phase' }],
    ...overrides,
  };
}

function work(specifications: RawSpecWorkModel['specifications']): RawSpecWorkModel {
  return { projectId: 'project', specifications, dependencies: [], unassignedTasks: [], integrityIssues: [], isPartial: false };
}

describe('buildTimelineSpecOwnership', () => {
  it('joins exact step-owned and phase-level specs without using related phases', () => {
    const result = buildTimelineSpecOwnership({
      id: 'P4', sequence: 0, steps: [{ id: '7.1' }],
    }, work([
      spec(),
      spec({ key: 'project:openspec/specs/phase/spec.md', id: 'phase', name: 'Phase spec', roadmapStepId: null }),
      spec({ key: 'project:openspec/changes/related/proposal.md', id: 'related', roadmapPhaseId: 'P1', roadmapStepId: null, relatedPhaseIds: ['P4'] }),
    ]));

    expect(result.stepSpecs['7.1'].map((item) => item.id)).toEqual(['large']);
    expect(result.phaseSpecs.map((item) => item.id)).toEqual(['phase']);
    expect(result.stepSpecs['7.1'][0].tasks[0].name).toBe('Build it');
    expect(result.phaseSpecs.some((item) => item.id === 'related')).toBe(false);
  });

  it('keeps invalid and unowned specs visible as unassigned evidence', () => {
    const result = buildTimelineSpecOwnership({
      id: 'P4', sequence: 0, steps: [{ id: '7.1' }],
    }, work([
      spec({ key: 'project:openspec/changes/missing/proposal.md', id: 'missing', roadmapPhaseId: null, roadmapStepId: '9.9' }),
      spec({ key: 'project:openspec/changes/unknown/proposal.md', id: 'unknown', roadmapPhaseId: 'P4', roadmapStepId: '9.9' }),
    ]));

    expect(result.unassignedSpecs.map((item) => item.id)).toEqual(['missing', 'unknown']);
    expect(result.issues.map((issue) => issue.kind)).toContain('invalid-ownership');
  });
});
