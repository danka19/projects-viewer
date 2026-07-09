import type {
  AgentPreflightAgentRole,
  AgentPreflightAttentionSignalKind,
  AgentPreflightPacket,
  AgentPreflightSafeStateCode,
} from '../src/types';

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
  ? true
  : false;

type Expect<T extends true> = T;

type ExpectedAgentPreflightSafeStateCode =
  | 'missing-findings-store'
  | 'missing-openspec-state'
  | 'missing-phase-signals'
  | 'missing-audit-signals'
  | 'missing-checklist-signals'
  | 'unknown-change';

type ExpectedAgentPreflightAttentionSignalKind =
  | 'risk'
  | 'blocker'
  | 'approval-gate'
  | 'needs-review'
  | 'unresolved-finding'
  | 'documentation-gap'
  | 'missing-verification'
  | 'stale-doc';

export type _AgentPreflightSafeStatesAreExact = Expect<
  Equal<AgentPreflightSafeStateCode, ExpectedAgentPreflightSafeStateCode>
>;
export type _AgentPreflightAttentionKindsAreExact = Expect<
  Equal<AgentPreflightAttentionSignalKind, ExpectedAgentPreflightAttentionSignalKind>
>;

const role: AgentPreflightAgentRole = 'handoff';

export const packetContractSample: AgentPreflightPacket = {
  kind: 'agent-preflight-packet',
  schemaVersion: 1,
  generatedAt: '2026-07-09T00:00:00.000Z',
  project: {
    id: 'sample',
    name: 'Sample',
    path: 'C:/projects/sample',
    enabled: true,
    generatedScanName: 'Sample',
  },
  agentRole: role,
  change: {
    id: 'agent-preflight-packet',
    status: 'proposed',
    requirementCount: 1,
    scenarioCount: 1,
    taskCount: 1,
    openTaskCount: 1,
    artifacts: ['openspec/changes/agent-preflight-packet/proposal.md'],
  },
  generatedFrom: {
    projectConfig: 'app-data/projects.config.json',
    scanData: 'app-data/projects.generated.json',
    aiContext: 'derived',
    aiFindings: 'app-data/ai.findings.generated.json',
    openspec: 'local-artifacts',
    projectDocs: 'local-docs',
    remoteServicesUsed: false,
  },
  inputState: {
    generatedScanAvailable: true,
    trackedProjectAvailable: true,
    projectEnabled: true,
    aiContextAvailable: true,
    findingsAvailable: true,
    openspecAvailable: true,
    phaseDocsAvailable: true,
    auditDocsAvailable: true,
    checklistDocsAvailable: true,
  },
  safeStates: [
    {
      code: 'missing-findings-store',
      severity: 'info',
      message: 'Findings store was not available.',
      blocksPacket: false,
    },
    {
      code: 'missing-openspec-state',
      severity: 'info',
      message: 'OpenSpec state was not available.',
      blocksPacket: false,
    },
    {
      code: 'missing-phase-signals',
      severity: 'info',
      message: 'Phase signals were not available.',
      blocksPacket: false,
    },
    {
      code: 'missing-audit-signals',
      severity: 'info',
      message: 'Audit signals were not available.',
      blocksPacket: false,
    },
    {
      code: 'missing-checklist-signals',
      severity: 'info',
      message: 'Checklist signals were not available.',
      blocksPacket: false,
    },
    {
      code: 'unknown-change',
      severity: 'warning',
      message: 'Requested change was not found.',
      blocksPacket: false,
    },
  ],
  requiredReading: [
    {
      order: 1,
      kind: 'project-rule',
      title: 'Agent operating guide',
      path: 'AGENTS.md',
      status: 'available',
      reason: 'Canonical project instructions.',
      evidence: [{ kind: 'source', file: 'AGENTS.md', line: 1, text: 'Agent Operating Guide' }],
    },
    {
      order: 2,
      kind: 'project-doc',
      title: 'Documentation home',
      path: 'docs/README.md',
      status: 'available',
      reason: 'Project overview.',
      evidence: [{ kind: 'source', file: 'docs/README.md' }],
    },
    {
      order: 3,
      kind: 'change-artifact',
      title: 'Proposal',
      path: 'openspec/changes/agent-preflight-packet/proposal.md',
      status: 'available',
      reason: 'Proposed change reference.',
      evidence: [{ kind: 'source', file: 'openspec/changes/agent-preflight-packet/proposal.md' }],
    },
    {
      order: 4,
      kind: 'checklist',
      title: 'AI verification checklist',
      path: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md',
      status: 'missing',
      reason: 'Expected verification guardrails.',
      evidence: [{ kind: 'source', file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md' }],
    },
  ],
  projectState: {
    status: null,
    healthScore: null,
    currentPhase: null,
    nextAction: 'Implement agent preflight packet.',
    mainBlocker: null,
    mainRisk: 'Packet must stay separate from human brief reports.',
    recentDecision: null,
  },
  acceptanceMap: [
    {
      source: 'proposed-change',
      id: 'agent-preflight-packet:Packet identifies its own kind',
      title: 'Packet identifies its own kind',
      status: 'proposed',
      evidenceTarget: 'tests/agent-preflight-packet.test.mjs verifies kind and absent brief fields.',
      evidence: [
        { kind: 'source', file: 'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md' },
      ],
    },
  ],
  attentionSignals: [
    {
      kind: 'risk',
      severity: 'medium',
      title: 'Separate contract risk',
      source: 'proposed-change',
      status: 'advisory',
      evidence: [{ kind: 'derived-summary', text: 'Packet could drift into brief semantics.' }],
    },
    {
      kind: 'needs-review',
      severity: 'medium',
      title: 'Review needed',
      source: 'checklist',
      status: 'advisory',
      evidence: [{ kind: 'derived-summary', text: 'Review needed.' }],
    },
    {
      kind: 'unresolved-finding',
      severity: 'high',
      title: 'Finding still open',
      source: 'accepted-spec',
      status: 'warning',
      evidence: [{ kind: 'derived-summary', text: 'Finding still open.' }],
    },
    {
      kind: 'missing-verification',
      severity: 'medium',
      title: 'Verification missing',
      source: 'checklist',
      status: 'warning',
      evidence: [{ kind: 'derived-summary', text: 'Verification missing.' }],
    },
  ],
  verificationPlan: [
    {
      kind: 'command',
      command: 'npm test -- tests/agent-preflight-packet.test.mjs',
      reason: 'Verify packet composition and API behavior.',
      expectedEvidence: 'All agent preflight packet tests pass.',
      advisoryOnly: true,
    },
  ],
  workBoundaries: {
    localOnly: true,
    derivedFromGeneratedScan: true,
    scannedProjectsReadOnly: true,
    noModelProviderRequired: true,
    reviewRequiredFindingsOnly: true,
    noAutomaticAction: true,
    noCommandsExecuted: true,
    noCommitsCreated: true,
    noTaskOrCalendarWrites: true,
    noRemoteCalls: true,
    proposedChangesAreNotAccepted: true,
  },
  evidence: [{ kind: 'derived-summary', text: 'Sample packet.' }],
  derivedLabels: [{ field: 'projectState.status', reason: 'derived-status', evidenceKind: 'derived-summary' }],
};
