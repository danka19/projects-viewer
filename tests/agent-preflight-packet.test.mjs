import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { buildAgentPreflightPacket } from '../server/agent-preflight-packet.mjs';

function minimalProject(name, overrides = {}) {
  const projectPath = overrides.path ?? `C:/projects/${name.toLowerCase()}`;
  return {
    name,
    path: projectPath,
    status: overrides.status ?? 'active',
    statusReason: overrides.statusReason ?? 'Ready for focused implementation work',
    lastModified: overrides.lastModified ?? '2026-07-09T00:00:00.000Z',
    error: null,
    summary: {
      status: overrides.status ?? 'active',
      healthScore: overrides.healthScore ?? 82,
      currentPhase: overrides.currentPhase ?? 'Phase 3',
      nextAction: overrides.nextAction ?? 'Implement task 2',
      mainBlocker: overrides.mainBlocker ?? null,
      mainRisk: overrides.mainRisk ?? 'Keep packet semantics separate from the human brief',
      recentDecision: overrides.recentDecision ?? null,
      docsCoverage: {
        readme: true,
        claude: true,
        roadmap: true,
        sddOrSpecs: true,
        audits: true,
      },
    },
    signalGroups: {
      realBlockers: overrides.realBlockers ?? [],
      approvalGates: overrides.approvalGates ?? [],
      needsReview: overrides.needsReview ?? [],
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
    gaps: overrides.gaps ?? [],
  };
}

function scanWith(projects) {
  return {
    generatedAt: '2026-07-09T01:00:00.000Z',
    activeDays: 14,
    projects,
  };
}

function configFor(projects, overrides = {}) {
  return {
    workspaces: [],
    projects: projects.map((project, index) => ({
      id: overrides.idByPath?.[project.path] ?? `project-${index + 1}`,
      name: project.name,
      path: overrides.pathByPath?.[project.path] ?? project.path,
      enabled: overrides.enabledByPath?.[project.path] ?? true,
      tags: [],
      createdAt: '2026-07-09T00:00:00.000Z',
      updatedAt: '2026-07-09T00:00:00.000Z',
    })),
    settings: { watchDocs: false, autoRescanIntervalSec: 0 },
  };
}

function signal(kind, text, line = 1) {
  return {
    group: kind === 'blocked' ? 'realBlockers' : kind === 'approval-gate' ? 'approvalGates' : 'needsReview',
    kind,
    severe: kind === 'blocked',
    text,
    file: 'docs/ROADMAP.md',
    line,
  };
}

function changeState(overrides = {}) {
  return {
    id: overrides.id ?? 'agent-preflight-packet',
    status: overrides.status ?? 'proposed',
    requirementCount: overrides.requirementCount ?? 1,
    scenarioCount: overrides.scenarioCount ?? 1,
    taskCount: overrides.taskCount ?? 2,
    openTaskCount: overrides.openTaskCount ?? 2,
    artifacts: overrides.artifacts ?? ['openspec/changes/agent-preflight-packet/proposal.md'],
  };
}

function acceptedSpec(overrides = {}) {
  return {
    id: overrides.id ?? 'accepted-spec-1',
    title: overrides.title ?? 'Accepted packet contract',
    evidenceTarget: overrides.evidenceTarget ?? 'Accepted behavior has verification evidence.',
    file: overrides.file ?? 'openspec/specs/agent-preflight-packet/spec.md',
    line: overrides.line ?? 12,
  };
}

function checklistExpectation(overrides = {}) {
  return {
    kind: overrides.kind ?? 'command',
    command: overrides.command,
    reason: overrides.reason ?? 'Checklist verification guidance.',
    expectedEvidence: overrides.expectedEvidence ?? 'Verification evidence recorded.',
    evidence: overrides.evidence ?? [{ kind: 'source', file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md', line: 1 }],
  };
}

function phaseExpectation(overrides = {}) {
  return {
    kind: overrides.kind ?? 'review',
    command: overrides.command,
    reason: overrides.reason ?? 'Phase expectation for the active work item.',
    expectedEvidence: overrides.expectedEvidence ?? 'Phase evidence recorded.',
    evidence: overrides.evidence ?? [{ kind: 'source', file: 'docs/phases/PHASE_3.md', line: 1 }],
  };
}

test('buildAgentPreflightPacket returns agent packet shape, role, project identity, source list, and work boundaries', () => {
  const project = minimalProject('Alpha', {
    realBlockers: [signal('blocked', 'Human approval is still required.', 14)],
  });

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    agentRole: 'implementation',
    changeId: 'agent-preflight-packet',
    aiContext: { projectPath: project.path },
    findings: [],
    openspecState: { changes: [changeState()] },
    phaseSignals: [],
    auditSignals: [],
    checklistSignals: [],
    now: () => new Date('2026-07-09T02:00:00.000Z'),
  });

  assert.equal(packet.kind, 'agent-preflight-packet');
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.agentRole, 'implementation');
  assert.equal(packet.project.id, 'project-1');
  assert.equal(packet.generatedFrom.remoteServicesUsed, false);
  assert.equal(packet.workBoundaries.localOnly, true);
  assert.equal(packet.workBoundaries.derivedFromGeneratedScan, true);
  assert.equal(packet.workBoundaries.scannedProjectsReadOnly, true);
  assert.equal(packet.workBoundaries.noModelProviderRequired, true);
  assert.equal(packet.workBoundaries.reviewRequiredFindingsOnly, true);
  assert.equal(packet.workBoundaries.noAutomaticAction, true);
  assert.equal(packet.workBoundaries.noCommandsExecuted, true);
  assert.equal(packet.workBoundaries.noCommitsCreated, true);
  assert.equal(packet.workBoundaries.noTaskOrCalendarWrites, true);
  assert.equal(packet.workBoundaries.noRemoteCalls, true);
  assert.equal(packet.workBoundaries.proposedChangesAreNotAccepted, true);
  assert.equal(Object.hasOwn(packet, 'mode'), false);
  assert.equal(Object.hasOwn(packet, 'recommendedHumanDecision'), false);
  assert.equal(Object.hasOwn(packet, 'noAttentionMessage'), false);
});

test('buildAgentPreflightPacket treats missing or invalid generated scan data as a domain error', () => {
  for (const scanOutput of [null, {}, { generatedAt: 1, projects: 'bad' }, { generatedAt: '2026-07-09T00:00:00.000Z' }]) {
    assert.throws(
      () =>
        buildAgentPreflightPacket({
          scanOutput,
          config: configFor([]),
          projectId: 'project-1',
        }),
      (err) => err.code === 'missing-generated-scan-data' && err.statusCode === 404,
    );
  }
});

test('buildAgentPreflightPacket rejects missing, unknown, or disabled project ids', () => {
  const project = minimalProject('Alpha');
  const scanOutput = scanWith([project]);

  assert.throws(
    () =>
      buildAgentPreflightPacket({
        scanOutput,
        config: configFor([project]),
      }),
    (err) => err.code === 'project-id-required',
  );

  assert.throws(
    () =>
      buildAgentPreflightPacket({
        scanOutput,
        config: configFor([project]),
        projectId: 'missing-project',
      }),
    (err) => err.code === 'project-not-found' && err.statusCode === 404,
  );

  assert.throws(
    () =>
      buildAgentPreflightPacket({
        scanOutput,
        config: configFor([project], {
          enabledByPath: { [project.path]: false },
        }),
        projectId: 'project-1',
      }),
    (err) => err.code === 'project-not-found' && err.statusCode === 404,
  );
});

test('buildAgentPreflightPacket matches generated project by normalized saved config path', () => {
  const project = minimalProject('Alpha', {
    path: 'C:/Projects/Alpha',
  });

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project], {
      pathByPath: {
        'C:/Projects/Alpha': 'c:\\projects\\alpha\\',
      },
    }),
    projectId: 'project-1',
    now: () => new Date('2026-07-09T02:00:00.000Z'),
  });

  assert.equal(packet.project.id, 'project-1');
  assert.equal(packet.project.generatedScanName, 'Alpha');
  assert.equal(packet.project.path, 'c:\\projects\\alpha\\');
});

test('buildAgentPreflightPacket composes ordered required reading and non-blocking safe states', () => {
  const project = minimalProject('Alpha');
  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    changeId: 'agent-preflight-packet',
    findings: [],
    openspecState: {
      changes: [
        changeState({
          artifacts: [
            'openspec/changes/agent-preflight-packet/proposal.md',
            'openspec/changes/agent-preflight-packet/design.md',
            'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md',
            'openspec/changes/agent-preflight-packet/tasks.md',
          ],
        }),
      ],
    },
    phaseSignals: {
      requiredReading: [
        {
          path: 'docs/phases/PHASE_3.md',
          title: 'Phase 3 plan',
          reason: 'Current roadmap phase implementation details.',
          evidence: [{ kind: 'source', file: 'docs/phases/PHASE_3.md' }],
        },
      ],
    },
    auditSignals: {
      requiredReading: [
        {
          path: 'docs/CURRENT_PROJECT_AUDIT.md',
          title: 'Current project audit',
          reason: 'Known findings and implementation risks.',
          evidence: [{ kind: 'source', file: 'docs/CURRENT_PROJECT_AUDIT.md' }],
        },
      ],
    },
    checklistSignals: {
      requiredReading: [
        {
          path: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md',
          title: 'AI verification checklist',
          reason: 'Required verification guardrails.',
          evidence: [{ kind: 'source', file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md' }],
        },
      ],
    },
  });

  assert.deepEqual(
    packet.requiredReading.map((item) => item.path),
    [
      'AGENTS.md',
      'docs/README.md',
      'docs/00_FILE_STRUCTURE.md',
      'docs/ROADMAP.md',
      'docs/phases/PHASE_3.md',
      'openspec/changes/agent-preflight-packet/proposal.md',
      'openspec/changes/agent-preflight-packet/design.md',
      'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md',
      'openspec/changes/agent-preflight-packet/tasks.md',
      'docs/CURRENT_PROJECT_AUDIT.md',
      'docs/AI_STEP_VERIFICATION_CHECKLIST.md',
    ],
  );
  assert.deepEqual(
    packet.requiredReading.map((item) => item.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  );

  const safePacket = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    openspecState: { changes: [] },
  });

  assert.deepEqual(
    safePacket.safeStates.map((item) => item.code),
    [
      'missing-findings-store',
      'missing-phase-signals',
      'missing-audit-signals',
      'missing-checklist-signals',
    ],
  );
  assert.equal(safePacket.safeStates.every((item) => item.blocksPacket === false), true);
});

test('buildAgentPreflightPacket treats empty legacy signal arrays as missing safe-state inputs', () => {
  const project = minimalProject('Alpha');

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    findings: [],
    openspecState: { changes: [] },
    phaseSignals: [],
    auditSignals: [],
    checklistSignals: [],
  });

  assert.deepEqual(
    packet.safeStates.map((item) => item.code),
    [
      'missing-phase-signals',
      'missing-audit-signals',
      'missing-checklist-signals',
    ],
  );
});

test('buildAgentPreflightPacket uses openspecState artifacts even without a resolved change object', () => {
  const project = minimalProject('Alpha');

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    findings: [],
    openspecState: {
      artifacts: [
        'openspec/changes/agent-preflight-packet/proposal.md',
        'openspec/changes/agent-preflight-packet/design.md',
        'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md',
        'openspec/changes/agent-preflight-packet/tasks.md',
      ],
      changes: [],
    },
  });

  assert.deepEqual(
    packet.requiredReading.map((item) => item.path),
    [
      'AGENTS.md',
      'docs/README.md',
      'docs/00_FILE_STRUCTURE.md',
      'docs/ROADMAP.md',
      'openspec/changes/agent-preflight-packet/proposal.md',
      'openspec/changes/agent-preflight-packet/design.md',
      'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md',
      'openspec/changes/agent-preflight-packet/tasks.md',
      'docs/CURRENT_PROJECT_AUDIT.md',
      'docs/AI_STEP_VERIFICATION_CHECKLIST.md',
    ],
  );
  assert.deepEqual(
    packet.requiredReading.slice(4, 8).map((item) => ({
      kind: item.kind,
      title: item.title,
    })),
    [
      { kind: 'change-artifact', title: 'OpenSpec proposal' },
      { kind: 'change-artifact', title: 'OpenSpec design' },
      { kind: 'change-artifact', title: 'OpenSpec spec' },
      { kind: 'change-artifact', title: 'OpenSpec tasks' },
    ],
  );
});

test('buildAgentPreflightPacket labels proposed change requirements and tasks without treating them as accepted', () => {
  const project = minimalProject('Alpha');

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    changeId: 'agent-preflight-packet',
    findings: [],
    openspecState: {
      acceptedSpecs: [
        acceptedSpec({
          id: 'accepted:packet-kind',
          title: 'Packet identifies its own kind',
          evidenceTarget: 'tests/agent-preflight-packet.test.mjs covers kind separation.',
        }),
      ],
      changes: [changeState()],
      change: {
        id: 'agent-preflight-packet',
        requirements: [
          {
            id: 'req-1',
            title: 'Packet includes active change context',
            evidenceTarget: 'Focused packet composition assertions prove change context is present.',
            file: 'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md',
            line: 28,
          },
        ],
      },
      tasks: [
        {
          id: '1.4',
          title: 'Compose acceptance mapping from accepted specs and proposed change deltas',
          body: 'Long task body that must not be copied into acceptanceMap output.',
          evidenceTarget: 'Focused task assertions cover acceptanceMap references only.',
          file: 'openspec/changes/agent-preflight-packet/tasks.md',
          line: 4,
        },
      ],
    },
  });

  const proposedRequirement = packet.acceptanceMap.find((item) => item.id === 'req-1');
  const acceptedRequirement = packet.acceptanceMap.find((item) => item.id === 'accepted:packet-kind');
  const taskReference = packet.acceptanceMap.find((item) => item.id === '1.4');

  assert.equal(proposedRequirement?.source, 'proposed-change');
  assert.equal(proposedRequirement?.status, 'proposed');
  assert.equal(acceptedRequirement?.source, 'accepted-spec');
  assert.equal(acceptedRequirement?.status, 'accepted');
  assert.match(taskReference?.evidenceTarget ?? '', /Focused task assertions cover acceptanceMap references only\./);
  assert.equal(taskReference?.title.includes('Long task body that must not be copied'), false);
});

test('buildAgentPreflightPacket ranks attention and verification first for verification role', () => {
  const project = minimalProject('Alpha', {
    realBlockers: [signal('blocked', 'Release is blocked pending decision.', 10)],
    approvalGates: [signal('approval-gate', 'Human sign-off is required before merge.', 11)],
    mainRisk: 'Verification ordering could drift from the role contract.',
    gaps: [
      {
        title: 'README does not mention agent preflight packet yet.',
        file: 'docs/README.md',
        line: 20,
      },
    ],
  });

  const findings = [
    {
      title: 'Focused verification scenario still missing coverage.',
      reviewState: 'new',
      project: { path: project.path },
      evidence: [{ kind: 'source', file: 'docs/CURRENT_PROJECT_AUDIT.md', line: 9 }],
    },
  ];

  const verificationPacket = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    agentRole: 'verification',
    findings,
    openspecState: {
      tasks: [
        {
          id: '1.4',
          title: 'Compose acceptance mapping from accepted specs and proposed change deltas',
          evidenceTarget: 'Acceptance map assertions remain covered.',
          file: 'openspec/changes/agent-preflight-packet/tasks.md',
          line: 4,
        },
      ],
    },
    auditSignals: {
      signals: [
        {
          kind: 'stale-doc',
          title: 'Audit says README is stale.',
          file: 'docs/CURRENT_PROJECT_AUDIT.md',
          line: 14,
          evidence: [{ kind: 'source', file: 'docs/CURRENT_PROJECT_AUDIT.md', line: 14 }],
        },
      ],
    },
    checklistSignals: {
      signals: [
        {
          kind: 'verification-gap',
          title: 'git diff --check has not been recorded yet.',
          file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md',
          line: 8,
          evidence: [{ kind: 'source', file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md', line: 8 }],
        },
      ],
      expectations: [
        checklistExpectation({
          command: 'git diff --check',
          reason: 'Detect whitespace and patch formatting issues.',
          expectedEvidence: 'git diff --check exits cleanly.',
        }),
      ],
    },
    phaseSignals: {
      expectations: [
        phaseExpectation({
          reason: 'Complete acceptance map task implementation.',
          expectedEvidence: 'Task 1.4 implementation is finished.',
        }),
      ],
    },
  });

  const implementationPacket = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    agentRole: 'implementation',
    findings,
    openspecState: {
      tasks: [
        {
          id: '1.4',
          title: 'Compose acceptance mapping from accepted specs and proposed change deltas',
          evidenceTarget: 'Acceptance map assertions remain covered.',
          file: 'openspec/changes/agent-preflight-packet/tasks.md',
          line: 4,
        },
      ],
    },
    auditSignals: {
      signals: [
        {
          kind: 'stale-doc',
          title: 'Audit says README is stale.',
          file: 'docs/CURRENT_PROJECT_AUDIT.md',
          line: 14,
          evidence: [{ kind: 'source', file: 'docs/CURRENT_PROJECT_AUDIT.md', line: 14 }],
        },
      ],
    },
    checklistSignals: {
      signals: [
        {
          kind: 'verification-gap',
          title: 'git diff --check has not been recorded yet.',
          file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md',
          line: 8,
          evidence: [{ kind: 'source', file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md', line: 8 }],
        },
      ],
      expectations: [
        checklistExpectation({
          command: 'git diff --check',
          reason: 'Detect whitespace and patch formatting issues.',
          expectedEvidence: 'git diff --check exits cleanly.',
        }),
      ],
    },
    phaseSignals: {
      expectations: [
        phaseExpectation({
          reason: 'Complete acceptance map task implementation.',
          expectedEvidence: 'Task 1.4 implementation is finished.',
        }),
      ],
    },
  });

  assert.deepEqual(
    verificationPacket.attentionSignals.map((item) => item.kind),
    ['blocker', 'approval-gate', 'finding', 'stale-doc', 'verification-gap', 'risk', 'documentation-gap'],
  );
  assert.equal(verificationPacket.workBoundaries, implementationPacket.workBoundaries);
  assert.equal(verificationPacket.generatedFrom.remoteServicesUsed, implementationPacket.generatedFrom.remoteServicesUsed);
  assert.match(verificationPacket.verificationPlan[0]?.expectedEvidence ?? '', /git diff --check exits cleanly\./);
  assert.match(implementationPacket.verificationPlan[0]?.expectedEvidence ?? '', /Task 1\.4 implementation is finished\./);
});

test('agent preflight composition module stays pure and avoids forbidden side-effect dependencies', async () => {
  const source = await fs.readFile(path.join(process.cwd(), 'server/agent-preflight-packet.mjs'), 'utf8');
  assert.equal(source.includes("from 'node:fs"), false);
  assert.equal(source.includes('express'), false);
  assert.equal(source.includes('generateFindings'), false);
  assert.equal(source.includes('updateFindingReviewState'), false);
  assert.equal(source.includes('writeAiContextSnapshot'), false);
  assert.equal(source.includes('runScan'), false);
});
