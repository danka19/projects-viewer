const GENERATED_FROM = {
  projectConfig: 'app-data/projects.config.json',
  scanData: 'app-data/projects.generated.json',
  aiContext: 'derived',
  aiFindings: 'app-data/ai.findings.generated.json',
  openspec: 'local-artifacts',
  projectDocs: 'local-docs',
  remoteServicesUsed: false,
};

const WORK_BOUNDARIES = {
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
};

const VALID_AGENT_ROLES = new Set(['implementation', 'reviewer', 'verification', 'handoff']);

export function buildAgentPreflightPacket({
  scanOutput,
  config = null,
  projectId,
  agentRole = 'implementation',
  changeId = null,
  aiContext = null,
  findings = [],
  openspecState = null,
  phaseSignals = [],
  auditSignals = [],
  checklistSignals = [],
  now = () => new Date(),
} = {}) {
  assertScanOutput(scanOutput);
  assertProjectId(projectId);

  const configProject = findConfigProject(config, projectId);
  if (!configProject || configProject.enabled === false) throw domainError('project-not-found', 404, 'Tracked project was not found.');

  const generatedProject = findGeneratedProject(scanOutput.projects, configProject.path);
  if (!generatedProject) throw domainError('project-not-found', 404, 'Tracked project was not found in generated scan data.');

  const normalizedRole = VALID_AGENT_ROLES.has(agentRole) ? agentRole : 'implementation';
  const change = findChange(openspecState, changeId);
  const evidence = dedupeEvidence([
    ...signalEvidence(generatedProject.signalGroups?.realBlockers),
    ...signalEvidence(generatedProject.signalGroups?.approvalGates),
    ...signalEvidence(generatedProject.signalGroups?.needsReview),
  ]);

  return {
    kind: 'agent-preflight-packet',
    schemaVersion: 1,
    generatedAt: toIso(now()),
    project: {
      id: configProject.id,
      name: configProject.name ?? generatedProject.name,
      path: configProject.path,
      enabled: configProject.enabled !== false,
      generatedScanName: generatedProject.name,
    },
    agentRole: normalizedRole,
    change,
    generatedFrom: GENERATED_FROM,
    inputState: {
      generatedScanAvailable: true,
      trackedProjectAvailable: true,
      projectEnabled: true,
      aiContextAvailable: Boolean(aiContext),
      findingsAvailable: Array.isArray(findings),
      openspecAvailable: Boolean(openspecState),
      phaseDocsAvailable: phaseSignals.length > 0,
      auditDocsAvailable: auditSignals.length > 0,
      checklistDocsAvailable: checklistSignals.length > 0,
    },
    safeStates: buildSafeStates({ changeId, change, findings, openspecState, phaseSignals, auditSignals, checklistSignals }),
    requiredReading: buildRequiredReading(changeId, change),
    projectState: {
      status: generatedProject.status ?? generatedProject.summary?.status ?? null,
      healthScore: generatedProject.summary?.healthScore ?? null,
      currentPhase: generatedProject.summary?.currentPhase ?? null,
      nextAction: generatedProject.summary?.nextAction ?? null,
      mainBlocker: generatedProject.summary?.mainBlocker ?? null,
      mainRisk: generatedProject.summary?.mainRisk ?? null,
      recentDecision: generatedProject.summary?.recentDecision ?? null,
    },
    acceptanceMap: buildAcceptanceMap(change),
    attentionSignals: buildAttentionSignals(generatedProject, findings),
    verificationPlan: buildVerificationPlan(checklistSignals),
    workBoundaries: WORK_BOUNDARIES,
    evidence: evidence.length > 0 ? evidence : [{ kind: 'derived-summary', text: generatedProject.statusReason ?? generatedProject.name }],
    derivedLabels: [
      { field: 'projectState.status', reason: 'derived-status', evidenceKind: 'derived-summary' },
      { field: 'projectState.healthScore', reason: 'derived-health-score', evidenceKind: 'derived-summary' },
    ],
  };
}

function buildSafeStates({ changeId, change, findings, openspecState, phaseSignals, auditSignals, checklistSignals }) {
  const safeStates = [];
  if (changeId && !change) {
    safeStates.push({
      code: 'unknown-change',
      severity: 'warning',
      message: 'Requested OpenSpec change was not found locally.',
      blocksPacket: false,
    });
  }
  if (!Array.isArray(findings)) {
    safeStates.push({
      code: 'missing-findings-store',
      severity: 'warning',
      message: 'Findings input is unavailable; packet uses remaining local inputs only.',
      blocksPacket: false,
    });
  }
  if (!openspecState) safeStates.push(infoState('missing-openspec-state', 'OpenSpec metadata was not provided.'));
  if (phaseSignals.length === 0) safeStates.push(infoState('missing-phase-signals', 'Phase documentation signals were not provided.'));
  if (auditSignals.length === 0) safeStates.push(infoState('missing-audit-signals', 'Audit documentation signals were not provided.'));
  if (checklistSignals.length === 0) safeStates.push(infoState('missing-checklist-signals', 'Checklist documentation signals were not provided.'));
  return safeStates;
}

function infoState(code, message) {
  return { code, severity: 'info', message, blocksPacket: false };
}

function buildRequiredReading(changeId, change) {
  const items = [
    reading(1, 'project-rule', 'Agent operating guide', 'AGENTS.md', 'available', 'Canonical project instructions.'),
    reading(2, 'project-doc', 'Documentation home', 'docs/README.md', 'available', 'Project overview and current state.'),
    reading(3, 'project-doc', 'File structure', 'docs/00_FILE_STRUCTURE.md', 'available', 'Repository map for safe navigation.'),
    reading(4, 'project-doc', 'Current audit', 'docs/CURRENT_PROJECT_AUDIT.md', 'available', 'Current evidence and known risks.'),
    reading(5, 'checklist', 'AI verification checklist', 'docs/AI_STEP_VERIFICATION_CHECKLIST.md', 'available', 'Required verification guardrails.'),
  ];
  if (changeId) {
    items.push(
      reading(
        items.length + 1,
        'change-artifact',
        change ? `OpenSpec change ${change.id}` : `Requested change ${changeId}`,
        change?.artifacts?.[0] ?? `openspec/changes/${changeId}/proposal.md`,
        change ? 'available' : 'missing',
        change ? 'Requested proposed change context.' : 'Requested change id was not found locally.',
      ),
    );
  }
  return items;
}

function reading(order, kind, title, filePath, status, reason) {
  return {
    order,
    kind,
    title,
    path: filePath,
    status,
    reason,
    evidence: [{ kind: 'source', file: filePath }],
  };
}

function buildAcceptanceMap(change) {
  if (!change) return [];
  return [
    {
      source: 'proposed-change',
      id: `${change.id}:packet-contract`,
      title: 'Packet identifies its own kind',
      status: 'proposed',
      evidenceTarget: 'tests/agent-preflight-packet.test.mjs verifies kind and absent brief fields.',
      evidence: [{ kind: 'source', file: 'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md' }],
    },
  ];
}

function buildAttentionSignals(project, findings) {
  const signals = [];
  for (const signal of project.signalGroups?.realBlockers ?? []) {
    signals.push(attention('blocker', 'high', signal.text, 'proposed-change', 'blocked', signal));
  }
  for (const signal of project.signalGroups?.approvalGates ?? []) {
    signals.push(attention('approval-gate', 'high', signal.text, 'proposed-change', 'warning', signal));
  }
  for (const signal of project.signalGroups?.needsReview ?? []) {
    signals.push(attention('needs-review', 'medium', signal.text, 'checklist', 'advisory', signal));
  }
  for (const finding of Array.isArray(findings) ? findings.filter((item) => item.reviewState === 'new') : []) {
    if (samePath(finding.project?.path, project.path)) {
      signals.push({
        kind: 'unresolved-finding',
        severity: 'high',
        title: finding.title,
        source: 'accepted-spec',
        status: 'warning',
        evidence: finding.evidence?.length ? finding.evidence : [{ kind: 'derived-summary', text: finding.title }],
      });
    }
  }
  if (project.summary?.mainRisk) {
    signals.push({
      kind: 'risk',
      severity: 'medium',
      title: project.summary.mainRisk,
      source: 'project-doc',
      status: 'advisory',
      evidence: [{ kind: 'derived-summary', text: project.summary.mainRisk }],
    });
  }
  return signals;
}

function attention(kind, severity, title, source, status, signal) {
  return {
    kind,
    severity,
    title,
    source,
    status,
    evidence: signalEvidence([signal]),
  };
}

function buildVerificationPlan(checklistSignals) {
  const plan = [];
  for (const signal of checklistSignals ?? []) {
    if (signal?.command || signal?.reason || signal?.expectedEvidence) {
      plan.push({
        kind: signal.kind ?? 'command',
        command: signal.command,
        reason: signal.reason ?? 'Advisory verification step from checklist signals.',
        expectedEvidence: signal.expectedEvidence ?? 'Verification evidence recorded.',
        advisoryOnly: true,
      });
    }
  }
  if (plan.length === 0) {
    plan.push({
      kind: 'command',
      command: 'npm test -- tests/agent-preflight-packet.test.mjs',
      reason: 'Verify packet composition behavior for the focused Task 2 surface.',
      expectedEvidence: 'Focused agent preflight packet tests pass.',
      advisoryOnly: true,
    });
  }
  return plan;
}

function findConfigProject(config, projectId) {
  return (config?.projects ?? []).find((project) => project.id === projectId) ?? null;
}

function findGeneratedProject(projects, configPath) {
  return projects.find((project) => samePath(project.path, configPath)) ?? null;
}

function findChange(openspecState, changeId) {
  if (!changeId) return null;
  const change = openspecState?.changes?.find((item) => item.id === changeId);
  if (!change) return null;
  return {
    id: change.id,
    status: change.status ?? 'proposed',
    requirementCount: change.requirementCount ?? 0,
    scenarioCount: change.scenarioCount ?? 0,
    taskCount: change.taskCount ?? 0,
    openTaskCount: change.openTaskCount ?? 0,
    artifacts: Array.isArray(change.artifacts) ? change.artifacts : [],
  };
}

function signalEvidence(signals = []) {
  return signals.map((signal) => ({
    kind: 'source',
    file: signal.file,
    line: signal.line,
    text: signal.text,
  }));
}

function dedupeEvidence(evidence) {
  return [...new Map(evidence.map((item) => [JSON.stringify(item), item])).values()];
}

function samePath(left, right) {
  return normalizePath(left) === normalizePath(right);
}

function normalizePath(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function assertScanOutput(scanOutput) {
  if (!scanOutput || !Array.isArray(scanOutput.projects) || typeof scanOutput.generatedAt !== 'string') {
    throw domainError('missing-generated-scan-data', 404, 'Generated scan data is missing or invalid.');
  }
}

function assertProjectId(projectId) {
  if (typeof projectId !== 'string' || projectId.trim() === '') {
    throw domainError('project-id-required', 400, 'projectId is required.');
  }
}

function domainError(code, statusCode, message) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}
