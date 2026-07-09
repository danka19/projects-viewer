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
  findings,
  openspecState = null,
  phaseSignals = null,
  auditSignals = null,
  checklistSignals = null,
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
  const phaseBundle = normalizeSignalBundle(phaseSignals);
  const auditBundle = normalizeSignalBundle(auditSignals);
  const checklistBundle = normalizeSignalBundle(checklistSignals);
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
      phaseDocsAvailable: phaseBundle.requiredReading.length > 0 || phaseBundle.items.length > 0,
      auditDocsAvailable: auditBundle.requiredReading.length > 0 || auditBundle.items.length > 0,
      checklistDocsAvailable: checklistBundle.requiredReading.length > 0 || checklistBundle.items.length > 0,
    },
    safeStates: buildSafeStates({
      changeId,
      change,
      findings,
      openspecState,
      phaseSignalsPresent: phaseBundle.present,
      auditSignalsPresent: auditBundle.present,
      checklistSignalsPresent: checklistBundle.present,
    }),
    requiredReading: buildRequiredReading({ change, phaseBundle, auditBundle, checklistBundle }),
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
    verificationPlan: buildVerificationPlan(checklistBundle),
    workBoundaries: WORK_BOUNDARIES,
    evidence: evidence.length > 0 ? evidence : [{ kind: 'derived-summary', text: generatedProject.statusReason ?? generatedProject.name }],
    derivedLabels: [
      { field: 'projectState.status', reason: 'derived-status', evidenceKind: 'derived-summary' },
      { field: 'projectState.healthScore', reason: 'derived-health-score', evidenceKind: 'derived-summary' },
    ],
  };
}

function buildSafeStates({
  changeId,
  change,
  findings,
  openspecState,
  phaseSignalsPresent,
  auditSignalsPresent,
  checklistSignalsPresent,
}) {
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
  if (!phaseSignalsPresent) safeStates.push(infoState('missing-phase-signals', 'Phase documentation signals were not provided.'));
  if (!auditSignalsPresent) safeStates.push(infoState('missing-audit-signals', 'Audit documentation signals were not provided.'));
  if (!checklistSignalsPresent) safeStates.push(infoState('missing-checklist-signals', 'Checklist documentation signals were not provided.'));
  return safeStates;
}

function infoState(code, message) {
  return { code, severity: 'info', message, blocksPacket: false };
}

function buildRequiredReading({ change, phaseBundle, auditBundle, checklistBundle }) {
  const items = [];

  items.push(baseReading('project-rule', 'Agent operating guide', 'AGENTS.md', 'Canonical project instructions.'));
  items.push(baseReading('project-doc', 'Documentation home', 'docs/README.md', 'Project overview and current state.'));
  items.push(baseReading('project-doc', 'File structure', 'docs/00_FILE_STRUCTURE.md', 'Repository map for safe navigation.'));
  items.push(baseReading('project-doc', 'Roadmap', 'docs/ROADMAP.md', 'Roadmap context and active phase references.'));
  items.push(...readingEntries(phaseBundle.requiredReading, 'phase-doc'));
  items.push(...(change?.artifacts ?? []).map((artifactPath) => baseReading('change-artifact', artifactTitle(artifactPath), artifactPath, 'Active proposed change reference.')));
  items.push(...withFallbackReading(auditBundle.requiredReading, baseReading('project-doc', 'Current audit', 'docs/CURRENT_PROJECT_AUDIT.md', 'Current evidence and known risks.')));
  items.push(
    ...withFallbackReading(
      checklistBundle.requiredReading,
      baseReading('checklist', 'AI verification checklist', 'docs/AI_STEP_VERIFICATION_CHECKLIST.md', 'Required verification guardrails.'),
    ),
  );

  return items.map((item, index) => ({ ...item, order: index + 1 }));
}

function reading(kind, title, filePath, status, reason, evidence) {
  return {
    kind,
    title,
    path: filePath,
    status,
    reason,
    evidence: evidence?.length ? evidence : [{ kind: 'source', file: filePath }],
  };
}

function baseReading(kind, title, filePath, reason) {
  return reading(kind, title, filePath, 'available', reason);
}

function readingEntries(entries, fallbackKind) {
  return dedupeByPath(entries)
    .filter((entry) => entry?.path)
    .map((entry) =>
      reading(
        entry.kind ?? fallbackKind,
        entry.title ?? artifactTitle(entry.path),
        entry.path,
        entry.status ?? 'available',
        entry.reason ?? 'Relevant project reading reference.',
        entry.evidence,
      ),
    );
}

function withFallbackReading(entries, fallbackEntry) {
  const normalizedEntries = readingEntries(entries, fallbackEntry.kind);
  if (normalizedEntries.length === 0) return [fallbackEntry];
  return normalizedEntries;
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

function buildVerificationPlan(checklistBundle) {
  const plan = [];
  for (const signal of checklistBundle.items) {
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

function dedupeByPath(entries = []) {
  return [...new Map(entries.map((entry) => [normalizePath(entry?.path), entry])).values()].filter((entry) => entry);
}

function normalizeSignalBundle(value) {
  if (value == null) return { present: false, items: [], requiredReading: [] };
  if (Array.isArray(value)) return { present: true, items: value, requiredReading: [] };
  return {
    present: true,
    items: Array.isArray(value.signals) ? value.signals : [],
    requiredReading: Array.isArray(value.requiredReading) ? value.requiredReading : [],
  };
}

function artifactTitle(filePath) {
  const normalized = String(filePath ?? '').replace(/\\/g, '/');
  if (normalized.endsWith('/proposal.md')) return 'OpenSpec proposal';
  if (normalized.endsWith('/design.md')) return 'OpenSpec design';
  if (normalized.endsWith('/tasks.md')) return 'OpenSpec tasks';
  if (normalized.endsWith('/spec.md')) return 'OpenSpec spec';
  const fileName = normalized.split('/').pop() ?? normalized;
  return fileName || 'Referenced document';
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
