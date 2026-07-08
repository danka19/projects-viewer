import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_APP_DATA_DIR } from './project-config.mjs';

const CONTEXT_LIMITS = {
  constraints: 8,
  risks: 8,
  decisions: 8,
  specs: 8,
  audits: 8,
  gaps: 12,
};

const SNAPSHOT_FILE = 'ai.context.snapshot.json';

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

export function compareAiContextChanges(scanOutput, { since, findings = [], previousContext = null, config = null } = {}) {
  assertScanOutput(scanOutput);
  const sinceMs = Date.parse(since ?? '');
  if (!Number.isFinite(sinceMs)) {
    const err = new Error('A valid since timestamp is required.');
    err.statusCode = 400;
    throw err;
  }

  const currentContext = buildAllProjectsAiContext(scanOutput, { config, findings });
  if (previousContext) return compareContextSnapshots(currentContext, previousContext, since);

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

export function getAiContextSnapshotPath({ appDataDir = DEFAULT_APP_DATA_DIR } = {}) {
  return path.join(appDataDir, SNAPSHOT_FILE);
}

export async function readAiContextSnapshot(options = {}) {
  try {
    return JSON.parse(await fs.readFile(getAiContextSnapshotPath(options), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return null;
  }
}

export async function writeAiContextSnapshot(context, options = {}) {
  const snapshotPath = getAiContextSnapshotPath(options);
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  const payload = {
    savedAt: new Date().toISOString(),
    context,
  };
  const tmpPath = `${snapshotPath}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, snapshotPath);
  return payload;
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

function compareContextSnapshots(currentContext, previousContext, since) {
  const previousProjects = new Map(
    (previousContext.projects ?? []).map((project) => [String(project.identity?.path ?? '').toLowerCase(), project]),
  );
  const projects = [];
  for (const current of currentContext.projects) {
    const previous = previousProjects.get(String(current.identity.path).toLowerCase());
    const changedCategories = previous
      ? changedCategoriesForContextProject(current, previous)
      : ['status', 'statusReason', 'currentPhase', 'nextAction', 'blockerSummary', 'riskSummary', 'gaps', 'findings'];
    if (changedCategories.length > 0) {
      projects.push({
        project: { name: current.identity.name, path: current.identity.path },
        lastModified: current.lastModified ?? null,
        changedCategories,
      });
    }
  }
  return {
    kind: 'ai-context-changes',
    generatedAt: currentContext.generatedAt,
    since,
    hasChanges: projects.length > 0,
    message:
      projects.length > 0
        ? `${projects.length} project(s) have meaningful AI-context changes.`
        : 'No meaningful AI-context changes were found.',
    projects,
  };
}

function changedCategoriesForContextProject(current, previous) {
  const categories = [];
  if (current.status !== previous.status) categories.push('status');
  if (current.statusReason !== previous.statusReason) categories.push('statusReason');
  if (itemText(current.currentPhase) !== itemText(previous.currentPhase)) categories.push('currentPhase');
  if (itemText(current.nextAction) !== itemText(previous.nextAction)) categories.push('nextAction');
  if (itemText(current.mainBlocker) !== itemText(previous.mainBlocker)) categories.push('blockerSummary');
  if (itemText(current.mainRisk) !== itemText(previous.mainRisk)) categories.push('riskSummary');
  if (stableJson((current.gaps ?? []).map((gap) => gap.text)) !== stableJson((previous.gaps ?? []).map((gap) => gap.text))) {
    categories.push('gaps');
  }
  if (stableJson(current.findings ?? {}) !== stableJson(previous.findings ?? {})) categories.push('findings');
  return categories;
}

function itemText(item) {
  return item?.text ?? null;
}

function stableJson(value) {
  return JSON.stringify(value);
}

function changedCategoriesForProject(project, sinceMs, findings) {
  const projectModifiedMs = Date.parse(project.lastModified ?? '');
  const projectChanged = Number.isFinite(projectModifiedMs) && projectModifiedMs > sinceMs;
  const projectFindings = findings.filter((finding) => sameProject(project, finding.project));
  const findingChanged =
    (projectChanged && projectFindings.length > 0) ||
    projectFindings.some((finding) => timestampAfter(finding.reviewedAt ?? finding.staleAt, sinceMs));
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
