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
