import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server.mjs';
import { buildAgentPreflightPacket } from '../server/agent-preflight-packet.mjs';
import { buildProjectBriefReport } from '../server/project-brief-report.mjs';

async function startTestServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

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

test('agent preflight packet stays separate from project brief report output', () => {
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

  const report = buildProjectBriefReport({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    findings: [],
    changes: null,
    previousSnapshotAvailable: false,
    mode: 'daily',
    since: null,
    now: () => new Date('2026-07-09T02:00:00.000Z'),
  });

  assert.equal(packet.kind, 'agent-preflight-packet');
  assert.equal(report.kind, 'project-brief-report');

  assert.equal(packet.agentRole, 'implementation');
  assert.ok(Array.isArray(packet.requiredReading));
  assert.ok(Array.isArray(packet.acceptanceMap));
  assert.ok(Array.isArray(packet.verificationPlan));

  assert.equal(report.mode, 'daily');
  assert.ok(Array.isArray(report.items));
  assert.ok(report.items[0]?.recommendedHumanDecision);
  assert.equal(Object.hasOwn(report, 'noAttentionMessage'), true);
  assert.equal(report.noAttentionMessage, null);

  assert.equal(Object.hasOwn(packet, 'mode'), false);
  assert.equal(Object.hasOwn(packet, 'recommendedHumanDecision'), false);
  assert.equal(Object.hasOwn(packet, 'noAttentionMessage'), false);

  assert.equal(Object.hasOwn(report, 'agentRole'), false);
  assert.equal(Object.hasOwn(report, 'requiredReading'), false);
  assert.equal(Object.hasOwn(report, 'acceptanceMap'), false);
  assert.equal(Object.hasOwn(report, 'verificationPlan'), false);
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

test('buildAgentPreflightPacket throws missing-project-id when projectId is absent', () => {
  const project = minimalProject('Alpha');
  const scanOutput = scanWith([project]);

  assert.throws(
    () =>
      buildAgentPreflightPacket({
        scanOutput,
        config: configFor([project]),
      }),
    (err) => err.code === 'missing-project-id' && err.statusCode === 400,
  );
});

test('buildAgentPreflightPacket throws project-not-found when projectId is unknown or disabled', () => {
  const project = minimalProject('Alpha');
  const scanOutput = scanWith([project]);

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

test('buildAgentPreflightPacket throws project-not-found when generated scan misses the saved config path', () => {
  const configProject = minimalProject('Alpha', {
    path: 'C:/projects/alpha-from-config',
  });
  const generatedProject = minimalProject('Alpha', {
    path: 'C:/projects/alpha-from-scan',
  });

  assert.throws(
    () =>
      buildAgentPreflightPacket({
        scanOutput: scanWith([generatedProject]),
        config: configFor([configProject]),
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

test('buildAgentPreflightPacket returns non-blocking unknown-change safe state for an unresolved changeId', () => {
  const project = minimalProject('Alpha');

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    changeId: 'missing-change',
    findings: [],
    openspecState: { changes: [] },
  });

  assert.equal(packet.change, null);
  assert.deepEqual(
    packet.safeStates.find((item) => item.code === 'unknown-change'),
    {
      code: 'unknown-change',
      severity: 'warning',
      message: 'Requested OpenSpec change was not found locally.',
      blocksPacket: false,
    },
  );
});

test('buildAgentPreflightPacket does not fabricate proposed requirements or tasks for an unresolved changeId', () => {
  const project = minimalProject('Alpha');

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    changeId: 'missing-change',
    findings: [],
    openspecState: {
      acceptedSpecs: [
        acceptedSpec({
          id: 'accepted:packet-kind',
          title: 'Accepted packet identifies its own kind',
        }),
      ],
      change: {
        id: 'different-change',
        requirements: [
          {
            id: 'req-foreign',
            title: 'Foreign proposed requirement',
            evidenceTarget: 'Should never appear for an unknown requested change.',
            file: 'openspec/changes/different-change/specs/different-change/spec.md',
            line: 21,
          },
        ],
      },
      tasks: [
        {
          id: 'task-foreign',
          title: 'Foreign proposed task',
          evidenceTarget: 'Should never appear for an unknown requested change.',
          file: 'openspec/changes/different-change/tasks.md',
          line: 8,
        },
      ],
      changes: [],
    },
  });

  assert.equal(packet.change, null);
  assert.deepEqual(packet.acceptanceMap, [
    {
      source: 'accepted-spec',
      id: 'accepted:packet-kind',
      title: 'Accepted packet identifies its own kind',
      status: 'accepted',
      evidenceTarget: 'Accepted behavior has verification evidence.',
      evidence: [{ kind: 'source', file: 'openspec/specs/agent-preflight-packet/spec.md', line: 12 }],
    },
  ]);
  assert.equal(packet.acceptanceMap.some((item) => item.id === 'req-foreign'), false);
  assert.equal(packet.acceptanceMap.some((item) => item.id === 'task-foreign'), false);
  assert.equal(
    packet.verificationPlan.some(
      (item) =>
        item.expectedEvidence === 'Should never appear for an unknown requested change.' ||
        item.reason === 'Foreign proposed task',
    ),
    false,
  );
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
    phaseSignals: {
      expectations: [phaseExpectation()],
    },
    checklistSignals: {
      expectations: [checklistExpectation()],
    },
  });

  const proposedRequirement = packet.acceptanceMap.find((item) => item.id === 'req-1');
  const acceptedRequirement = packet.acceptanceMap.find((item) => item.id === 'accepted:packet-kind');
  const taskReference = packet.acceptanceMap.find((item) => item.id === '1.4');
  const phaseReference = packet.acceptanceMap.find((item) => item.title === 'Phase expectation for the active work item.');
  const checklistReference = packet.acceptanceMap.find((item) => item.title === 'Checklist verification guidance.');

  assert.equal(proposedRequirement?.source, 'proposed-change');
  assert.equal(proposedRequirement?.status, 'proposed');
  assert.equal(acceptedRequirement?.source, 'accepted-spec');
  assert.equal(acceptedRequirement?.status, 'accepted');
  assert.match(taskReference?.evidenceTarget ?? '', /Focused task assertions cover acceptanceMap references only\./);
  assert.equal(taskReference?.title.includes('Long task body that must not be copied'), false);
  assert.deepEqual(
    phaseReference,
    {
      source: 'phase-plan',
      id: 'phase-plan:review:phase-expectation-for-the-active-work-item',
      title: 'Phase expectation for the active work item.',
      status: 'planned',
      evidenceTarget: 'Phase evidence recorded.',
      evidence: [{ kind: 'source', file: 'docs/phases/PHASE_3.md', line: 1 }],
    },
  );
  assert.deepEqual(
    checklistReference,
    {
      source: 'checklist',
      id: 'checklist:command:checklist-verification-guidance',
      title: 'Checklist verification guidance.',
      status: 'advisory',
      evidenceTarget: 'Verification evidence recorded.',
      evidence: [{ kind: 'source', file: 'docs/AI_STEP_VERIFICATION_CHECKLIST.md', line: 1 }],
    },
  );
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
    ['blocker', 'approval-gate', 'unresolved-finding', 'stale-doc', 'missing-verification', 'risk', 'documentation-gap'],
  );
  assert.equal(verificationPacket.workBoundaries, implementationPacket.workBoundaries);
  assert.equal(verificationPacket.generatedFrom.remoteServicesUsed, implementationPacket.generatedFrom.remoteServicesUsed);
  assert.match(verificationPacket.verificationPlan[0]?.expectedEvidence ?? '', /git diff --check exits cleanly\./);
  assert.match(implementationPacket.verificationPlan[0]?.expectedEvidence ?? '', /Task 1\.4 implementation is finished\./);
  assert.equal(verificationPacket.attentionSignals[2]?.kind, 'unresolved-finding');
  assert.equal(verificationPacket.attentionSignals[4]?.kind, 'missing-verification');
});

test('buildAgentPreflightPacket derives generic proposed-change fallback artifacts from the requested change id', () => {
  const project = minimalProject('Alpha');

  const packet = buildAgentPreflightPacket({
    scanOutput: scanWith([project]),
    config: configFor([project]),
    projectId: 'project-1',
    changeId: 'other-change',
    findings: [],
    openspecState: {
      changes: [changeState({ id: 'other-change', artifacts: [] })],
    },
  });

  assert.deepEqual(packet.acceptanceMap, [
    {
      source: 'proposed-change',
      id: 'other-change:packet-contract',
      title: 'Packet identifies its own kind',
      status: 'proposed',
      evidenceTarget: 'tests/agent-preflight-packet.test.mjs verifies kind and absent brief fields.',
      evidence: [{ kind: 'source', file: 'openspec/changes/other-change/specs/other-change/spec.md' }],
    },
  ]);
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

test('agent preflight packet API returns valid packet for saved project without unauthorized side effects', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-agent-preflight-api-'));
  const appDataDir = path.join(tmp, 'app-data');
  const trackedProject = path.join(tmp, 'tracked-project');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(trackedProject, { recursive: true });
  const sentinelPath = path.join(trackedProject, 'AGENTS.md');
  await fs.writeFile(sentinelPath, 'tracked project sentinel\n');

  const project = minimalProject('ApiProject', {
    path: trackedProject,
    realBlockers: [signal('blocked', 'API project is blocked.', 20)],
    mainBlocker: 'API project is blocked.',
  });
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scanWith([project])));

  const findingsStore = {
    generatedAt: '2026-07-09T00:00:00.000Z',
    findings: [
      {
        id: 'api-finding',
        type: 'missing-verification-evidence',
        title: 'Review API evidence',
        confidence: 'high',
        reviewState: 'new',
        reviewRequired: true,
        project: { name: project.name, path: project.path },
        evidence: [{ kind: 'source', file: 'docs/audit.md', line: 3, text: 'Needs evidence.' }],
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z',
      },
    ],
    reviewStates: {},
  };
  const findingsPath = path.join(appDataDir, 'ai.findings.generated.json');
  await fs.writeFile(findingsPath, JSON.stringify(findingsStore, null, 2));
  const findingsBefore = await fs.readFile(findingsPath, 'utf8');
  const aiContextSnapshot = {
    savedAt: '2026-07-08T23:00:00.000Z',
    context: {
      kind: 'all-project-ai-context',
      generatedAt: '2026-07-08T23:00:00.000Z',
      activeDays: 14,
      projectCount: 1,
      projects: [
        {
          kind: 'project-ai-context',
          identity: {
            id: 'project-1',
            name: project.name,
            path: project.path,
          },
        },
      ],
    },
  };
  const aiContextPath = path.join(appDataDir, 'ai.context.snapshot.json');
  await fs.writeFile(aiContextPath, `${JSON.stringify(aiContextSnapshot, null, 2)}\n`);
  const aiContextBefore = await fs.readFile(aiContextPath, 'utf8');

  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  try {
    const response = await fetch(
      `${server.url}/api/agent-preflight-packet?projectId=project-1&changeId=agent-preflight-packet&agentRole=verification`,
    );
    assert.equal(response.status, 200);
    const packet = await response.json();
    assert.equal(packet.kind, 'agent-preflight-packet');
    assert.equal(packet.project.id, 'project-1');
    assert.equal(packet.inputState.aiContextAvailable, true);
    assert.equal(Object.hasOwn(packet, 'mode'), false);
    assert.equal(Object.hasOwn(packet, 'recommendedHumanDecision'), false);
    assert.equal(Object.hasOwn(packet, 'noAttentionMessage'), false);

    assert.equal(await fs.readFile(findingsPath, 'utf8'), findingsBefore);
    assert.equal(await fs.readFile(aiContextPath, 'utf8'), aiContextBefore);
    await assert.rejects(fs.access(path.join(appDataDir, 'report-history.json')));
    for (const forbiddenArtifact of [
      'task-records.json',
      'calendar-records.json',
      'commit-records.json',
      'shell-command-records.json',
      'remote-call-records.json',
      'agent-work-records.json',
    ]) {
      await assert.rejects(fs.access(path.join(appDataDir, forbiddenArtifact)), forbiddenArtifact);
    }
    assert.equal(await fs.readFile(sentinelPath, 'utf8'), 'tracked project sentinel\n');
  } finally {
    await server.close();
  }
});

test('agent preflight packet API rejects unsafe or invalid query parameters', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-agent-preflight-api-invalid-'));
  const appDataDir = path.join(tmp, 'app-data');
  const trackedProject = path.join(tmp, 'tracked-project');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(trackedProject, { recursive: true });

  const project = minimalProject('ApiProject', { path: trackedProject });
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scanWith([project])));

  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);
  const cases = [
    '',
    'agentRole=builder',
    'projectId=project-1&projectId=project-2',
    'projectId=project-1&changeId=one&changeId=two',
    'projectId=project-1&agentRole=implementation&agentRole=verification',
    'projectId=project-1&path=C:/projects/example',
    'projectId=project-1&projectPath=C:/projects/example',
    'projectId=project-1&workspacePath=C:/projects',
    'projectId=project-1&rootPath=C:/projects',
    'projectId=project-1&scanPath=C:/projects',
    'projectId=project-1&file=README.md',
    'projectId=project-1&files=README.md',
    'projectId=project-1&glob=**/*.md',
    'projectId=project-1&include=docs',
    'projectId=project-1&exclude=node_modules',
    'projectId=project-1&command=npm test',
    'projectId=project-1&action=commit',
    'projectId=project-1&commit=true',
    'projectId=project-1&task=follow-up',
    'projectId=project-1&calendar=slot',
    'projectId=project-1&notification=send',
    'projectId=project-1&remoteProvider=openai',
    'projectId=project-1&auth=token',
    'projectId=project-1&model=gpt',
    'projectId=project-1&agent=run',
    'projectId=project-1&unknown=value',
  ];

  try {
    for (const query of cases) {
      const url = query
        ? `${server.url}/api/agent-preflight-packet?${query}`
        : `${server.url}/api/agent-preflight-packet`;
      const response = await fetch(url);
      assert.equal(response.status, 400, `expected 400 for query "${query || '<empty>'}"`);
      const body = await response.json();
      assert.match(body.error, /Allowed parameters: projectId, changeId, agentRole|must be provided at most once|projectId is required|agentRole must be one of: implementation, verification\./);
    }
  } finally {
    await server.close();
  }
});

test('agent preflight packet API returns expected error states for missing project or generated scan inputs', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-agent-preflight-api-errors-'));
  const appDataDir = path.join(tmp, 'app-data');
  const trackedProject = path.join(tmp, 'tracked-project');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(trackedProject, { recursive: true });

  const project = minimalProject('ApiProject', { path: trackedProject });
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scanWith([project])));

  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);

  try {
    const unknownProject = await fetch(`${server.url}/api/agent-preflight-packet?projectId=missing-project`);
    assert.equal(unknownProject.status, 404);
    assert.equal((await unknownProject.json()).code, 'project-not-found');

    await fs.writeFile(
      path.join(appDataDir, 'projects.config.json'),
      JSON.stringify(
        configFor([project], {
          enabledByPath: { [project.path]: false },
        }),
      ),
    );
    const disabledProject = await fetch(`${server.url}/api/agent-preflight-packet?projectId=project-1`);
    assert.equal(disabledProject.status, 404);
    assert.equal((await disabledProject.json()).code, 'project-not-found');

    await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
    await fs.rm(path.join(appDataDir, 'projects.generated.json'));
    const missingGeneratedScan = await fetch(`${server.url}/api/agent-preflight-packet?projectId=project-1`);
    assert.equal(missingGeneratedScan.status, 404);
    assert.equal((await missingGeneratedScan.json()).code, 'missing-generated-scan-data');

    await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), '{not valid json');
    const corruptGeneratedScan = await fetch(`${server.url}/api/agent-preflight-packet?projectId=project-1`);
    assert.equal(corruptGeneratedScan.status, 404);
    assert.equal((await corruptGeneratedScan.json()).code, 'missing-generated-scan-data');
  } finally {
    await server.close();
  }
});

test('agent preflight packet API returns unknown-change safe state for unresolved local changeId', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-viewer-agent-preflight-api-unknown-change-'));
  const appDataDir = path.join(tmp, 'app-data');
  const trackedProject = path.join(tmp, 'tracked-project');
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(trackedProject, { recursive: true });

  const project = minimalProject('ApiProject', { path: trackedProject });
  await fs.writeFile(path.join(appDataDir, 'projects.config.json'), JSON.stringify(configFor([project])));
  await fs.writeFile(path.join(appDataDir, 'projects.generated.json'), JSON.stringify(scanWith([project])));

  const app = await createApp({
    appDataDir,
    legacyConfigPath: path.join(tmp, 'missing.json'),
    skipStartupScan: true,
    skipWatcher: true,
    skipFrontend: true,
  });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.url}/api/agent-preflight-packet?projectId=project-1&changeId=missing-change`);
    assert.equal(response.status, 200);
    const packet = await response.json();
    assert.equal(packet.change, null);
    assert.deepEqual(
      packet.safeStates.find((item) => item.code === 'unknown-change'),
      {
        code: 'unknown-change',
        severity: 'warning',
        message: 'Requested OpenSpec change was not found locally.',
        blocksPacket: false,
      },
    );
  } finally {
    await server.close();
  }
});
