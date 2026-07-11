import type { PhaseItem, PhaseStep, ProjectData } from '../../src/types';

export function makeStep(overrides: Partial<PhaseStep> = {}): PhaseStep {
  return {
    phaseId: '1',
    id: '1.1',
    name: 'Fixture step',
    status: 'planned',
    rule: 'fixture',
    evidence: 'fixture evidence',
    file: 'docs/ROADMAP.md',
    line: 12,
    ...overrides,
  };
}

export function makePhase(overrides: Partial<PhaseItem> = {}): PhaseItem {
  return {
    id: '1',
    name: 'Fixture phase',
    statusText: 'Status: planned.',
    status: 'planned',
    rule: 'fixture',
    confidence: 'high',
    issue: 'none',
    issueNote: null,
    branch: null,
    steps: [],
    file: 'docs/ROADMAP.md',
    line: 10,
    ...overrides,
  };
}

export function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    id: 'fixture-project',
    name: 'fixture-project',
    path: 'C:/tmp/fixture-project',
    status: 'active',
    statusReason: 'fixture',
    lastModified: '2026-07-10T00:00:00.000Z',
    error: null,
    summary: {
      status: 'active',
      healthScore: 90,
      currentPhase: null,
      nextAction: null,
      mainBlocker: null,
      mainRisk: null,
      recentDecision: null,
      recentChange: null,
      docsCoverage: {
        readme: true,
        claude: true,
        roadmap: true,
        sddOrSpecs: true,
        audits: true,
      },
    },
    openTasks: [],
    completedTasks: [],
    nextTasks: [],
    markers: [],
    headings: [],
    phases: [],
    decisions: [],
    blockers: [],
    signalGroups: {
      realBlockers: [],
      approvalGates: [],
      needsReview: [],
      pausedDeferred: [],
    },
    blockedGatedDiagnostics: {
      includedProjectSignals: [],
      filteredAgentRules: [],
      filteredProcessPolicies: [],
      filteredExamplesOrTemplates: [],
      summary: {
        oldRawCandidateCount: 0,
        includedProjectSignalCount: 0,
        filteredOutCount: 0,
        filteredAgentRuleCount: 0,
        filteredProcessPolicyCount: 0,
        filteredExampleOrTemplateCount: 0,
      },
    },
    risks: [],
    specs: [],
    specFileCount: 0,
    audits: [],
    gaps: [],
    intel: {
      readmeFound: true,
      roadmapFound: true,
      claudeFound: true,
      specsFound: true,
      openTaskCount: 0,
      completedTaskCount: 0,
      attentionMarkerCount: 0,
      lastDocUpdate: '2026-07-10T00:00:00.000Z',
    },
    docs: [],
    stats: {
      docsCount: 0,
      totalSizeBytes: 0,
      openTaskCount: 0,
      completedTaskCount: 0,
      nextTaskCount: 0,
      markerCounts: {},
      completionPercent: null,
    },
    ...overrides,
  };
}

export function makeDenseSpecProject(count = 32): ProjectData {
  const specifications = Array.from({ length: count }, (_, index) => ({
    key: `dense:spec-${index}`,
    id: `spec-${index}`,
    name: `Specification ${String(index).padStart(2, '0')}`,
    kind: (index % 7 === 0 ? 'accepted-capability' : 'openspec-change') as 'accepted-capability' | 'openspec-change',
    lifecycleStatus: (index >= 26 ? 'archived' : index === 4 ? 'in_progress' : index === 12 ? 'blocked' : 'planned') as 'archived' | 'in_progress' | 'blocked' | 'planned',
    confidence: 'high' as const,
    source: { file: `openspec/changes/spec-${index}/proposal.md`, line: 1 },
    sourceScopeId: index % 2 ? 'analytics/search' : 'openspec/changes',
    groupId: index % 3 === 0 ? 'search' : index % 3 === 1 ? 'reports' : null,
    tasks: Array.from({ length: index % 8 }, (_, taskIndex) => ({
      key: `dense:spec-${index}:task-${taskIndex}`,
      id: null,
      name: `Task ${index}.${taskIndex}`,
      status: (taskIndex < 2 ? 'closed' : taskIndex === 2 && index === 4 ? 'in_progress' : 'planned') as 'closed' | 'in_progress' | 'planned',
      source: { file: `openspec/changes/spec-${index}/tasks.md`, line: taskIndex + 1 },
      order: taskIndex,
    })),
    dependsOnIds: index > 0 && index < 18 && index % 6 !== 0 ? [`spec-${index - 1}`] : index === 20 ? ['spec-21'] : index === 21 ? ['spec-20'] : [],
  }));
  const dependencies = specifications.flatMap((spec) => spec.dependsOnIds.map((prerequisiteId) => ({
    key: `${prerequisiteId}->${spec.id}`,
    prerequisiteId,
    dependentId: spec.id,
    sourceEvidence: [spec.source],
    state: 'unknown' as const,
  })));
  return makeProject({
    id: 'dense-project', name: 'dense-project', path: 'C:/projects/dense', phases: [],
    specWork: {
      projectId: 'dense-project', specifications, dependencies,
      unassignedTasks: [{ key: 'unassigned:1', id: null, name: 'Loose task', status: 'planned', source: { file: 'docs/TASKS.md', line: 1 }, order: 0 }],
      integrityIssues: [{ kind: 'cycle', message: 'Dependency cycle: spec-20, spec-21' }],
      isPartial: true,
    },
  });
}
