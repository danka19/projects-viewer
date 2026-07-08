const CONTEXT_LIMITS = {
  constraints: 8,
  risks: 8,
  decisions: 8,
  specs: 8,
  audits: 8,
  gaps: 12,
};

export function buildAllProjectsAiContext(scanOutput, { config = null, findings = [] } = {}) {
  assertScanOutput(scanOutput);
  return {
    kind: 'all-project-ai-context',
    generatedAt: scanOutput.generatedAt,
    activeDays: scanOutput.activeDays,
    projectCount: scanOutput.projects.length,
    projects: scanOutput.projects.map((project) =>
      buildProjectAiContext(project, { configProject: findConfigProject(project, config), findings }),
    ),
  };
}

export function buildProjectAiContext(project, { configProject = null, findings = [] } = {}) {
  const projectFindings = findings.filter((finding) => sameProject(project, finding.project));
  return {
    kind: 'project-ai-context',
    identity: {
      id: configProject?.id ?? null,
      name: project.name,
      path: project.path,
    },
    generatedFrom: 'projects.generated.json',
    status: project.status,
    statusReason: project.statusReason,
    healthScore: project.summary?.healthScore ?? null,
    lastModified: project.lastModified ?? null,
    currentPhase: summaryItem(project.summary?.currentPhase, 'currentPhase'),
    nextAction: firstEvidenceItem(project.summary?.nextAction, [
      ...(project.nextTasks ?? []),
      ...phaseItems(project),
    ]),
    mainBlocker: firstEvidenceItem(project.summary?.mainBlocker, project.blockers ?? []),
    mainRisk: firstEvidenceItem(project.summary?.mainRisk, project.risks ?? []),
    recentDecision: firstEvidenceItem(project.summary?.recentDecision, project.decisions ?? []),
    gaps: (project.gaps ?? []).slice(0, CONTEXT_LIMITS.gaps).map((gap) => ({
      text: gap,
      evidence: [{ kind: 'derived-summary', text: gap }],
    })),
    constraints: {
      realBlockers: normalizeItems(project.signalGroups?.realBlockers, 'constraint', CONTEXT_LIMITS.constraints),
      approvalGates: normalizeItems(project.signalGroups?.approvalGates, 'constraint', CONTEXT_LIMITS.constraints),
      needsReview: normalizeItems(project.signalGroups?.needsReview, 'constraint', CONTEXT_LIMITS.constraints),
      pausedDeferred: normalizeItems(project.signalGroups?.pausedDeferred, 'constraint', CONTEXT_LIMITS.constraints),
    },
    risks: normalizeItems(project.risks, 'risk', CONTEXT_LIMITS.risks),
    decisions: normalizeItems(project.decisions, 'decision', CONTEXT_LIMITS.decisions),
    specs: normalizeSpecs(project.specs, CONTEXT_LIMITS.specs),
    audits: normalizeAudits(project.audits, CONTEXT_LIMITS.audits),
    findings: {
      unresolvedCount: projectFindings.filter((finding) => finding.reviewState === 'new').length,
      acceptedCount: projectFindings.filter((finding) => finding.reviewState === 'accepted').length,
      dismissedCount: projectFindings.filter((finding) => finding.reviewState === 'dismissed').length,
      staleCount: projectFindings.filter((finding) => finding.reviewState === 'stale').length,
      ids: projectFindings.map((finding) => finding.id),
    },
    workBoundaries: {
      localOnly: true,
      derivedFromGeneratedScan: true,
      scannedProjectsReadOnly: true,
      noModelProviderRequired: true,
      reviewRequiredFindingsOnly: true,
    },
  };
}

export function compareAiContextChanges(scanOutput, { since, findings = [] } = {}) {
  assertScanOutput(scanOutput);
  const sinceMs = Date.parse(since ?? '');
  if (!Number.isFinite(sinceMs)) {
    const err = new Error('A valid since timestamp is required.');
    err.statusCode = 400;
    throw err;
  }

  const generatedMs = Date.parse(scanOutput.generatedAt);
  const findingsChanged = findings.some((finding) => timestampAfter(finding.updatedAt ?? finding.createdAt, sinceMs));
  if (Number.isFinite(generatedMs) && generatedMs <= sinceMs && !findingsChanged) {
    return noChanges(scanOutput, since);
  }

  const projects = [];
  for (const project of scanOutput.projects) {
    const changedCategories = changedCategoriesForProject(project, sinceMs, findings);
    if (changedCategories.length > 0) {
      projects.push({
        project: { name: project.name, path: project.path },
        lastModified: project.lastModified ?? null,
        changedCategories,
      });
    }
  }

  return {
    kind: 'ai-context-changes',
    generatedAt: scanOutput.generatedAt,
    since,
    hasChanges: projects.length > 0,
    message:
      projects.length > 0
        ? `${projects.length} project(s) have meaningful AI-context changes.`
        : 'No meaningful AI-context changes were found.',
    projects,
  };
}

export function normalizeEvidence(item, fallbackText = null) {
  if (!item || typeof item !== 'object') {
    return [{ kind: 'derived-summary', text: fallbackText ?? null }];
  }
  if (typeof item.file === 'string' && item.file.trim()) {
    const evidence = {
      kind: 'source',
      file: item.file,
    };
    if (Number.isFinite(item.line)) evidence.line = item.line;
    const text = item.text ?? item.name ?? item.title ?? fallbackText;
    if (typeof text === 'string' && text.trim()) evidence.text = text;
    return [evidence];
  }
  return [{ kind: 'derived-summary', text: fallbackText ?? item.text ?? item.name ?? null }];
}

function assertScanOutput(scanOutput) {
  if (!scanOutput || !Array.isArray(scanOutput.projects) || typeof scanOutput.generatedAt !== 'string') {
    const err = new Error('Generated scan data is missing or invalid.');
    err.statusCode = 404;
    throw err;
  }
}

function findConfigProject(project, config) {
  return (config?.projects ?? []).find((entry) => samePath(entry.path, project.path)) ?? null;
}

function sameProject(project, findingProject) {
  return Boolean(findingProject) && samePath(project.path, findingProject.path);
}

function samePath(left, right) {
  return String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase();
}

function summaryItem(text, category) {
  if (!text) return null;
  return {
    category,
    text,
    evidence: [{ kind: 'derived-summary', text }],
  };
}

function firstEvidenceItem(text, candidates) {
  if (!text) return null;
  const candidate = (candidates ?? []).find((item) => item?.text === text || item?.name === text);
  return {
    text,
    evidence: normalizeEvidence(candidate, text),
  };
}

function normalizeItems(items, category, limit) {
  return (items ?? []).slice(0, limit).map((item) => ({
    category,
    kind: item.kind ?? null,
    text: item.text,
    confidence: item.confidence ?? null,
    evidence: normalizeEvidence(item, item.text),
  }));
}

function normalizeSpecs(items, limit) {
  return (items ?? []).slice(0, limit).map((item) => ({
    category: 'spec',
    kind: item.kind,
    name: item.name,
    status: item.status,
    openTasks: item.openTasks ?? null,
    completedTasks: item.completedTasks ?? null,
    evidence: normalizeEvidence(item, item.name),
  }));
}

function normalizeAudits(items, limit) {
  return (items ?? []).slice(0, limit).map((item) => ({
    category: 'audit',
    title: item.title,
    date: item.date,
    status: item.status,
    severeSignals: item.severeSignals,
    evidence: normalizeEvidence(item, item.title),
  }));
}

function phaseItems(project) {
  return (project.phases ?? []).map((phase) => ({
    text: `${phase.id} ${phase.name}`,
    file: phase.file,
    line: phase.line,
  }));
}

function noChanges(scanOutput, since) {
  return {
    kind: 'ai-context-changes',
    generatedAt: scanOutput.generatedAt,
    since,
    hasChanges: false,
    message: 'No meaningful AI-context changes were found.',
    projects: [],
  };
}

function changedCategoriesForProject(project, sinceMs, findings) {
  const projectModifiedMs = Date.parse(project.lastModified ?? '');
  const projectChanged = Number.isFinite(projectModifiedMs) && projectModifiedMs > sinceMs;
  const projectFindings = findings.filter((finding) => sameProject(project, finding.project));
  const findingChanged =
    (projectChanged && projectFindings.length > 0) ||
    projectFindings.some((finding) =>
      timestampAfter(finding.updatedAt ?? finding.createdAt ?? finding.reviewedAt ?? finding.staleAt, sinceMs),
    );
  if (!projectChanged && !findingChanged) return [];

  const categories = [];
  if (projectChanged) {
    if (project.status) categories.push('status');
    if (project.statusReason) categories.push('statusReason');
    if (project.summary?.currentPhase) categories.push('currentPhase');
    if (project.summary?.nextAction) categories.push('nextAction');
    if (project.summary?.mainBlocker) categories.push('blockerSummary');
    if (project.summary?.mainRisk) categories.push('riskSummary');
    if ((project.gaps ?? []).length > 0) categories.push('gaps');
  }
  if (findingChanged) categories.push('findings');
  return [...new Set(categories)];
}

function timestampAfter(value, sinceMs) {
  const timestamp = Date.parse(value ?? '');
  return Number.isFinite(timestamp) && timestamp > sinceMs;
}
