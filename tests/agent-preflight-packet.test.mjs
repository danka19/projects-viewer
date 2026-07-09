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

test('agent preflight composition module stays pure and avoids forbidden side-effect dependencies', async () => {
  const source = await fs.readFile(path.join(process.cwd(), 'server/agent-preflight-packet.mjs'), 'utf8');
  assert.equal(source.includes("from 'node:fs"), false);
  assert.equal(source.includes('express'), false);
  assert.equal(source.includes('generateFindings'), false);
  assert.equal(source.includes('updateFindingReviewState'), false);
  assert.equal(source.includes('writeAiContextSnapshot'), false);
  assert.equal(source.includes('runScan'), false);
});
