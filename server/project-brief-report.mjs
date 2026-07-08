import { normalizeEvidence } from './ai-context.mjs';

const GENERATED_FROM = {
  projectConfig: 'app-data/projects.config.json',
  scanData: 'app-data/projects.generated.json',
  aiFindings: 'app-data/ai.findings.generated.json',
  remoteServicesUsed: false,
};

const WORK_BOUNDARIES = {
  localOnly: true,
  derivedFromGeneratedScan: true,
  scannedProjectsReadOnly: true,
  noModelProviderRequired: true,
  reviewRequiredFindingsOnly: true,
  noAutomaticAction: true,
};

const REASON_META = {
  blocker: { label: 'Blocker', severity: 'high', source: 'ai-context', order: 0 },
  'approval-gate': { label: 'Approval gate', severity: 'high', source: 'ai-context', order: 1 },
  'unresolved-finding': { label: 'Unresolved finding', severity: 'high', source: 'ai-finding', order: 2 },
  'needs-review': { label: 'Needs review', severity: 'medium', source: 'ai-context', order: 3 },
  'changed-next-action': { label: 'Changed next action', severity: 'medium', source: 'ai-context', order: 4 },
  'changed-status': { label: 'Changed status', severity: 'medium', source: 'ai-context', order: 5 },
  'changed-risk': { label: 'Changed risk', severity: 'medium', source: 'ai-context', order: 6 },
  'first-run-current-signal': { label: 'Current signal with unavailable baseline', severity: 'medium', source: 'baseline', order: 7 },
  'documentation-gap': { label: 'Documentation gap', severity: 'low', source: 'scan-summary', order: 8 },
};

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };
const SEVERITY_WEIGHT = { high: 0, medium: 1, low: 2 };

export function buildProjectBriefReport({
  scanOutput,
  config = null,
  findings = [],
  changes = null,
  previousSnapshotAvailable = false,
  mode = 'daily',
  since = null,
  now = () => new Date(),
} = {}) {
  assertScanOutput(scanOutput);

  const reportFindings = Array.isArray(findings) ? findings : [];
  const findingsAvailable = Array.isArray(findings);
  const changedByPath = changesByProjectPath(changes);
  const items = scanOutput.projects
    .map((project) =>
      buildItem(project, {
        configProject: findConfigProject(project, config),
        findings: reportFindings.filter((finding) => samePath(finding.project?.path, project.path)),
        changedCategories: changedByPath.get(pathKey(project.path)) ?? [],
        since,
        previousSnapshotAvailable,
      }),
    )
    .filter(Boolean)
    .sort(compareItems)
    .map((item, index) => publicItem(item, index + 1));

  const safeStates = buildSafeStates({
    hasScan: true,
    projectCount: scanOutput.projects.length,
    itemCount: items.length,
    findingsAvailable,
    unresolvedFindingCount: reportFindings.filter((finding) => finding.reviewState === 'new').length,
    previousSnapshotAvailable,
    since,
  });

  return {
    kind: 'project-brief-report',
    schemaVersion: 1,
    generatedAt: toIso(now()),
    mode,
    since,
    generatedFrom: {
      ...GENERATED_FROM,
      aiContextChanges: changes?.projects ? 'derived' : 'unavailable',
    },
    inputState: {
      generatedScanAvailable: true,
      trackedProjectCount: Array.isArray(config?.projects) ? config.projects.length : scanOutput.projects.length,
      previousBaselineAvailable: Boolean(previousSnapshotAvailable),
      findingsAvailable,
      changesAvailable: Boolean(changes?.projects),
    },
    baseline: {
      kind: 'ai-context-snapshot',
      requestedSince: since,
      previousSnapshotAvailable: Boolean(previousSnapshotAvailable),
      comparisonAvailable: Boolean(since && previousSnapshotAvailable && changes?.projects),
      message: baselineMessage({ since, previousSnapshotAvailable, changes }),
    },
    safeStates,
    summary: buildSummary(scanOutput.projects.length, items, safeStates),
    items,
    noAttentionMessage: items.length === 0 ? noAttentionMessage(scanOutput.projects.length) : null,
    workBoundaries: WORK_BOUNDARIES,
  };
}

function buildItem(project, { configProject, findings, changedCategories, since, previousSnapshotAvailable }) {
  const attentionReasons = [];
  const blockers = [];
  const evidence = [];

  addSignals(attentionReasons, blockers, evidence, 'blocker', project.signalGroups?.realBlockers);
  addSignals(attentionReasons, blockers, evidence, 'approval-gate', project.signalGroups?.approvalGates);
  addSignals(attentionReasons, blockers, evidence, 'needs-review', project.signalGroups?.needsReview);

  const findingSummary = summarizeFindings(findings);
  if (findingSummary.unresolvedCount > 0) {
    addReason(attentionReasons, 'unresolved-finding');
    for (const finding of findingSummary.unresolved) evidence.push(...finding.evidence);
  }

  for (const reasonKind of changeReasonKinds(changedCategories)) addReason(attentionReasons, reasonKind);

  const relevantGaps = relevantDocumentationGaps(project.gaps);
  for (const gap of relevantGaps) {
    addReason(attentionReasons, 'documentation-gap');
    evidence.push({ kind: 'derived-summary', text: gap });
  }

  if (since && !previousSnapshotAvailable && attentionReasons.length > 0) {
    addReason(attentionReasons, 'first-run-current-signal');
    evidence.push({ kind: 'derived-summary', text: 'Comparison baseline is unavailable; this item reflects current signals only.' });
  }

  if (attentionReasons.length === 0) return null;

  const priority = itemPriority(attentionReasons);
  const dedupedReasons = dedupeReasons(attentionReasons);
  const dedupedEvidence = dedupeEvidence(evidence);

  return {
    project: {
      id: configProject?.id ?? null,
      name: project.name,
      path: project.path,
    },
    priority,
    rank: 0,
    attentionReasons: dedupedReasons,
    changedCategories,
    findingsSummary: findingSummary,
    blockers,
    currentState: {
      status: project.status,
      healthScore: project.summary?.healthScore ?? null,
      currentPhase: project.summary?.currentPhase ?? null,
      nextAction: project.summary?.nextAction ?? null,
      mainBlocker: project.summary?.mainBlocker ?? null,
      mainRisk: project.summary?.mainRisk ?? null,
    },
    evidence: dedupedEvidence.length > 0 ? dedupedEvidence : [{ kind: 'derived-summary', text: project.statusReason ?? project.name }],
    derivedLabels: derivedLabels(project),
    recommendedHumanDecision: recommendedDecision(dedupedReasons),
    _sort: {
      reasonOrder: Math.min(...dedupedReasons.map((reason) => REASON_META[reason.kind].order)),
      highestSeverity: Math.min(...dedupedReasons.map((reason) => SEVERITY_WEIGHT[reason.severity])),
      unresolvedCount: findingSummary.unresolvedCount,
      sourceSignalCount:
        (project.signalGroups?.realBlockers?.length ?? 0) +
        (project.signalGroups?.approvalGates?.length ?? 0) +
        (project.signalGroups?.needsReview?.length ?? 0),
      name: String(project.name ?? '').toLowerCase(),
      path: String(project.path ?? '').toLowerCase(),
    },
  };
}

function addSignals(reasons, blockers, evidence, reasonKind, signals = []) {
  for (const signal of signals ?? []) {
    addReason(reasons, reasonKind);
    const normalizedEvidence = normalizeEvidence(signal, signal.text);
    blockers.push({ text: signal.text, evidence: normalizedEvidence });
    evidence.push(...normalizedEvidence);
  }
}

function addReason(reasons, kind) {
  const meta = REASON_META[kind];
  reasons.push({
    kind,
    label: meta.label,
    severity: meta.severity,
    source: meta.source,
  });
}

function summarizeFindings(findings) {
  const unresolved = findings.filter((finding) => finding.reviewState === 'new');
  return {
    unresolvedCount: unresolved.length,
    acceptedCount: findings.filter((finding) => finding.reviewState === 'accepted').length,
    dismissedCount: findings.filter((finding) => finding.reviewState === 'dismissed').length,
    staleCount: findings.filter((finding) => finding.reviewState === 'stale').length,
    unresolvedIds: unresolved.map((finding) => finding.id),
    unresolved: unresolved.map((finding) => ({
      id: finding.id,
      type: finding.type,
      title: finding.title,
      confidence: finding.confidence,
      evidence: finding.evidence ?? [{ kind: 'derived-summary', text: finding.title }],
    })),
  };
}

function changesByProjectPath(changes) {
  const byPath = new Map();
  for (const change of changes?.projects ?? []) {
    byPath.set(pathKey(change.project?.path), change.changedCategories ?? []);
  }
  return byPath;
}

function changeReasonKinds(changedCategories) {
  const kinds = [];
  if (changedCategories.includes('nextAction')) kinds.push('changed-next-action');
  if (changedCategories.includes('status') || changedCategories.includes('statusReason')) kinds.push('changed-status');
  if (changedCategories.includes('riskSummary')) kinds.push('changed-risk');
  return kinds;
}

function relevantDocumentationGaps(gaps = []) {
  return gaps.filter((gap) => /No specs|No audit|verification|Active Handoff|handoff|review/i.test(gap));
}

function itemPriority(reasons) {
  if (reasons.some((reason) => reason.severity === 'high')) return 'high';
  if (reasons.some((reason) => reason.severity === 'medium')) return 'medium';
  return 'low';
}

function derivedLabels(project) {
  const labels = [
    { field: 'currentState.status', reason: 'derived-status', evidenceKind: 'derived-summary' },
    { field: 'currentState.healthScore', reason: 'derived-health-score', evidenceKind: 'derived-summary' },
    { field: 'recommendedHumanDecision', reason: 'derived-recommendation', evidenceKind: 'derived-summary' },
  ];
  if (project.summary?.nextAction) {
    labels.push({ field: 'currentState.nextAction', reason: 'derived-summary', evidenceKind: 'derived-summary' });
  }
  return labels;
}

function recommendedDecision(reasons) {
  const kinds = new Set(reasons.map((reason) => reason.kind));
  if (kinds.has('blocker')) {
    return decision('resolve-blocker', 'Review the blocker and decide what must change before work continues.', 'A current blocker is present in the generated scan data.');
  }
  if (kinds.has('approval-gate')) {
    return decision('approve-or-reject-gate', 'Decide whether to approve, reject, or keep the gate waiting.', 'A current approval gate is present in the generated scan data.');
  }
  if (kinds.has('unresolved-finding')) {
    return decision('review-findings', 'Review unresolved findings before choosing next work.', 'At least one review-required finding is still new.');
  }
  if ([...kinds].some((kind) => kind.startsWith('changed-'))) {
    return decision('inspect-changes', 'Inspect the changed project signals and confirm whether they matter.', 'The requested comparison reported changed categories.');
  }
  return decision('choose-next-action', 'Choose whether this project needs a follow-up review.', 'The report found review-relevant current signals.');
}

function decision(kind, prompt, rationale) {
  return {
    kind,
    prompt,
    rationale,
    actionTaken: false,
    acceptedDecision: false,
  };
}

function buildSafeStates({
  projectCount,
  itemCount,
  findingsAvailable,
  unresolvedFindingCount,
  previousSnapshotAvailable,
  since,
}) {
  const states = [];
  if (since && !previousSnapshotAvailable) {
    states.push({
      code: 'missing-previous-baseline',
      severity: 'warning',
      message: 'Previous AI context baseline is unavailable; current signals are not labeled as changed since baseline.',
      blocksReport: false,
    });
  }
  if (!findingsAvailable) {
    states.push({
      code: 'missing-findings-store',
      severity: 'warning',
      message: 'AI findings store is missing or unreadable; report uses other current signals only.',
      blocksReport: false,
    });
  } else if (unresolvedFindingCount === 0) {
    states.push({
      code: 'empty-findings',
      severity: 'info',
      message: 'No unresolved review-required findings are available for this report.',
      blocksReport: false,
    });
  }
  if (itemCount === 0) {
    states.push({
      code: 'no-attention-items',
      severity: 'info',
      message:
        projectCount === 0
          ? 'No tracked generated projects were available for attention ranking.'
          : 'No changed projects, unresolved findings, blockers, approval gates, review signals, or relevant gaps were found.',
      blocksReport: false,
    });
  }
  return states;
}

function buildSummary(projectCount, items, safeStates) {
  return {
    projectCount,
    itemCount: items.length,
    highPriorityCount: items.filter((item) => item.priority === 'high').length,
    unresolvedFindingCount: items.reduce((count, item) => count + item.findingsSummary.unresolvedCount, 0),
    blockerCount: items.reduce((count, item) => count + item.attentionReasons.filter((reason) => reason.kind === 'blocker').length, 0),
    approvalGateCount: items.reduce(
      (count, item) => count + item.attentionReasons.filter((reason) => reason.kind === 'approval-gate').length,
      0,
    ),
    changedProjectCount: items.filter((item) => item.changedCategories.length > 0).length,
    safeStateCount: safeStates.length,
  };
}

function noAttentionMessage(projectCount) {
  return projectCount === 0
    ? 'No tracked generated projects were available for attention ranking.'
    : 'No changed projects, unresolved findings, blockers, approval gates, review signals, or relevant gaps were found.';
}

function baselineMessage({ since, previousSnapshotAvailable, changes }) {
  if (!since) return 'Current signals only; no comparison anchor was requested.';
  if (!previousSnapshotAvailable) return 'Previous AI context baseline is unavailable; report uses current signals only.';
  if (changes?.projects) return 'Previous AI context baseline was available for comparison.';
  return 'Comparison was requested but no change data was provided.';
}

function compareItems(left, right) {
  return (
    PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority] ||
    left._sort.highestSeverity - right._sort.highestSeverity ||
    left._sort.reasonOrder - right._sort.reasonOrder ||
    right._sort.unresolvedCount - left._sort.unresolvedCount ||
    right._sort.sourceSignalCount - left._sort.sourceSignalCount ||
    left._sort.name.localeCompare(right._sort.name) ||
    left._sort.path.localeCompare(right._sort.path)
  );
}

function publicItem(item, rank) {
  const { _sort, ...publicFields } = item;
  void _sort;
  return { ...publicFields, rank };
}

function dedupeReasons(reasons) {
  return [...new Map(reasons.map((reason) => [reason.kind, reason])).values()];
}

function dedupeEvidence(evidence) {
  return [...new Map(evidence.map((item) => [JSON.stringify(item), item])).values()];
}

function findConfigProject(project, config) {
  return (config?.projects ?? []).find((entry) => samePath(entry.path, project.path)) ?? null;
}

function samePath(left, right) {
  return pathKey(left) === pathKey(right);
}

function pathKey(value) {
  return String(value ?? '').toLowerCase();
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function assertScanOutput(scanOutput) {
  if (!scanOutput || !Array.isArray(scanOutput.projects) || typeof scanOutput.generatedAt !== 'string') {
    const err = new Error('Generated scan data is missing or invalid.');
    err.code = 'missing-generated-scan-data';
    err.statusCode = 404;
    throw err;
  }
}
