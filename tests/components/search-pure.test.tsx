import { describe, expect, it } from 'vitest';
import { searchProjects, SEARCH_LIMIT } from '../../src/search';
import type { BlockedGatedCandidate, BlockerItem, TaskItem } from '../../src/types';
import { makePhase, makeProject } from './fixtures';

function task(text: string, file: string, line: number): TaskItem {
  return { text, file, line, section: null };
}

function blocker(text: string, file: string, line: number): BlockerItem {
  return {
    group: 'realBlockers',
    kind: 'blocked',
    severe: true,
    text,
    file,
    line,
  };
}

function diagnostic(text: string, file: string, line: number): BlockedGatedCandidate {
  return {
    text,
    file,
    line,
    classification: 'agent_rule',
    includedInProjectStatus: false,
    confidence: 'high',
    reason: 'Filtered diagnostic evidence',
    matchedKeywords: ['needle'],
    nearbyContext: text,
  };
}

describe('searchProjects pure contract', () => {
  it('indexes specification identities and owned tasks with Specs routing descriptors', () => {
    const project = makeProject({
      specWork: {
        projectId: 'fixture-project',
        specifications: [{
          key: 'spec:ranking', id: 'ranking', name: 'Needle ranking', kind: 'openspec-change', lifecycleStatus: 'in_progress', confidence: 'high',
          source: { file: 'openspec/changes/ranking/proposal.md', line: 1 }, sourceScopeId: 'openspec/changes', groupId: 'search', dependsOnIds: [],
          tasks: [{ key: 'task:tune', id: null, name: 'Needle tune weights', status: 'planned', source: { file: 'openspec/changes/ranking/tasks.md', line: 2 }, order: 0 }],
        }],
        dependencies: [], unassignedTasks: [], integrityIssues: [], isPartial: false,
      },
    });
    const result = searchProjects([project], 'needle');
    expect(result.hits).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'Specification', primaryView: 'specs', specKey: 'spec:ranking' }),
      expect.objectContaining({ kind: 'Spec task', primaryView: 'specs', specKey: 'spec:ranking', taskKey: 'task:tune' }),
    ]));
  });

  it('ranks project and current work ahead of ordinary tasks, docs, and diagnostics', () => {
    const project = makeProject({
      name: 'Needle project',
      path: 'C:/projects/needle-project',
      phases: [makePhase({ name: 'Needle delivery', status: 'in_progress' })],
      nextTasks: [task('Needle next action', 'docs/NEXT.md', 3)],
      openTasks: [task('Needle ordinary task', 'docs/TASKS.md', 4)],
      docs: [
        {
          file: 'docs/needle-reference.md',
          category: 'other',
          sizeBytes: 100,
          modified: '2026-07-11T00:00:00.000Z',
        },
      ],
    });
    project.signalGroups.realBlockers = [
      blocker('Needle delivery is blocked', 'docs/BLOCKERS.md', 5),
    ];
    project.blockedGatedDiagnostics.filteredAgentRules = [
      diagnostic('Needle historical rule', 'docs/AGENTS.md', 6),
    ];

    const result = searchProjects([project], 'needle', { includeDiagnostics: true });

    expect(result.hits.map((hit) => hit.kind)).toEqual([
      'Project',
      'Roadmap',
      'Next action',
      'Blocker',
      'Task',
      'Doc',
      'Diagnostic',
    ]);
    expect(result.hits.at(-1)).toMatchObject({ kind: 'Diagnostic', score: 10 });
  });

  it('deduplicates next-action evidence from ordinary open tasks', () => {
    const evidence = task('Needle shared evidence', 'docs/ROADMAP.md', 22);
    const project = makeProject({
      nextTasks: [evidence],
      openTasks: [{ ...evidence }],
    });

    const result = searchProjects([project], 'needle');

    expect(result.total).toBe(1);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]).toMatchObject({ kind: 'Next action', score: 84 });
  });

  it('does not leak filtered diagnostic evidence through open tasks', () => {
    const leakedEvidence = task('Needle policy example', 'docs/AGENTS.md', 9);
    const project = makeProject({
      openTasks: [
        leakedEvidence,
        task('Needle legitimate task', 'docs/TASKS.md', 10),
      ],
    });
    project.blockedGatedDiagnostics.filteredAgentRules = [
      diagnostic(leakedEvidence.text, leakedEvidence.file, leakedEvidence.line),
    ];

    const excluded = searchProjects([project], 'needle');
    expect(excluded.diagnosticsAvailable).toBe(1);
    expect(excluded.total).toBe(1);
    expect(excluded.hits).toEqual([
      expect.objectContaining({ kind: 'Task', label: 'Needle legitimate task' }),
    ]);

    const included = searchProjects([project], 'needle', { includeDiagnostics: true });
    expect(included.diagnosticsAvailable).toBe(1);
    expect(included.total).toBe(2);
    expect(included.hits.map((hit) => hit.kind)).toEqual(['Task', 'Diagnostic']);
    expect(
      included.hits.filter(
        (hit) => hit.kind === 'Task' && hit.drawer?.file === leakedEvidence.file,
      ),
    ).toHaveLength(0);
  });

  it('searches every scanner-bounded task before applying the forty-hit limit', () => {
    const project = makeProject({
      openTasks: Array.from({ length: 405 }, (_, index) =>
        task(`Needle task ${String(index).padStart(3, '0')}`, 'docs/TASKS.md', index + 1),
      ),
    });

    const result = searchProjects([project], 'needle');

    expect(result.total).toBe(405);
    expect(result.hits).toHaveLength(SEARCH_LIMIT);
    expect(result.truncated).toBe(true);
  });

  it('uses unique stable keys and deterministic path/label/evidence tie-breakers', () => {
    const alphaTasks = [
      task('Needle equal label', 'docs/z.md', 2),
      task('Needle equal label', 'docs/a.md', 2),
      task('Needle equal label', 'docs/a.md', 1),
    ];
    const alpha = makeProject({
      name: 'Same name',
      path: 'C:/projects/alpha',
      openTasks: alphaTasks,
    });
    const beta = makeProject({
      name: 'Same name',
      path: 'C:/projects/beta',
      openTasks: [task('Needle equal label', 'docs/a.md', 1)],
    });

    const forward = searchProjects([beta, alpha], 'needle').hits;
    const reversed = searchProjects(
      [{ ...alpha, openTasks: [...alphaTasks].reverse() }, beta],
      'needle',
    ).hits;
    const forwardKeys = forward.map((hit) => hit.key);
    const reversedKeys = reversed.map((hit) => hit.key);

    expect(forwardKeys).toEqual(reversedKeys);
    expect(forwardKeys.every((key) => typeof key === 'string' && key.length > 0)).toBe(true);
    expect(new Set(forwardKeys).size).toBe(forwardKeys.length);
    expect(forward.map((hit) => hit.project.path)).toEqual([
      'C:/projects/alpha',
      'C:/projects/alpha',
      'C:/projects/alpha',
      'C:/projects/beta',
    ]);
    expect(forward.slice(0, 3).map((hit) => hit.drawer && `${hit.drawer.file}:${hit.drawer.line}`)).toEqual([
      'docs/a.md:1',
      'docs/a.md:2',
      'docs/z.md:2',
    ]);
  });
});
