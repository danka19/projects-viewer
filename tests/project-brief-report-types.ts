import type {
  ProjectBriefReport,
  ProjectBriefReportAttentionReasonKind,
  ProjectBriefReportSafeStateCode,
} from '../src/types';

const reasonKind: ProjectBriefReportAttentionReasonKind = 'unresolved-finding';
const safeStateCode: ProjectBriefReportSafeStateCode = 'missing-previous-baseline';

export const reportContractSample: ProjectBriefReport = {
  kind: 'project-brief-report',
  schemaVersion: 1,
  generatedAt: '2026-07-09T00:00:00.000Z',
  mode: 'daily',
  since: null,
  generatedFrom: {
    projectConfig: 'app-data/projects.config.json',
    scanData: 'app-data/projects.generated.json',
    aiContextChanges: 'unavailable',
    aiFindings: 'app-data/ai.findings.generated.json',
    remoteServicesUsed: false,
  },
  inputState: {
    generatedScanAvailable: true,
    trackedProjectCount: 1,
    previousBaselineAvailable: false,
    findingsAvailable: true,
    changesAvailable: false,
  },
  baseline: {
    kind: 'ai-context-snapshot',
    requestedSince: null,
    previousSnapshotAvailable: false,
    comparisonAvailable: false,
    message: 'Current signals only.',
  },
  safeStates: [
    {
      code: safeStateCode,
      severity: 'warning',
      message: 'Previous baseline is unavailable.',
      blocksReport: false,
    },
  ],
  summary: {
    projectCount: 1,
    itemCount: 1,
    highPriorityCount: 1,
    unresolvedFindingCount: 1,
    blockerCount: 0,
    approvalGateCount: 0,
    changedProjectCount: 0,
    safeStateCount: 1,
  },
  items: [
    {
      project: { id: 'sample', name: 'Sample', path: 'C:/projects/sample' },
      priority: 'high',
      rank: 1,
      attentionReasons: [
        {
          kind: reasonKind,
          label: 'Unresolved finding',
          severity: 'high',
          source: 'ai-finding',
        },
      ],
      changedCategories: [],
      findingsSummary: {
        unresolvedCount: 1,
        acceptedCount: 0,
        dismissedCount: 0,
        staleCount: 0,
        unresolvedIds: ['finding-1'],
        unresolved: [
          {
            id: 'finding-1',
            type: 'missing-specs',
            title: 'Review missing specs',
            confidence: 'medium',
            evidence: [{ kind: 'derived-summary', text: 'No specs found.' }],
          },
        ],
      },
      blockers: [],
      currentState: {
        status: 'needs-review',
        healthScore: 80,
        currentPhase: null,
        nextAction: 'Review finding.',
        mainBlocker: null,
        mainRisk: null,
      },
      evidence: [{ kind: 'derived-summary', text: 'Review finding.' }],
      derivedLabels: [
        {
          field: 'recommendedHumanDecision',
          reason: 'derived-recommendation',
          evidenceKind: 'derived-summary',
        },
      ],
      recommendedHumanDecision: {
        kind: 'review-findings',
        prompt: 'Review unresolved findings before choosing next work.',
        rationale: 'The report found one unresolved finding.',
        actionTaken: false,
        acceptedDecision: false,
      },
    },
  ],
  noAttentionMessage: null,
  workBoundaries: {
    localOnly: true,
    derivedFromGeneratedScan: true,
    scannedProjectsReadOnly: true,
    noModelProviderRequired: true,
    reviewRequiredFindingsOnly: true,
    noAutomaticAction: true,
  },
};
