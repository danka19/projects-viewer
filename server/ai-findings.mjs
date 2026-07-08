import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_APP_DATA_DIR } from './project-config.mjs';
import { normalizeEvidence } from './ai-context.mjs';

const FINDINGS_FILE = 'ai.findings.generated.json';
const VALID_REVIEW_STATES = new Set(['new', 'accepted', 'dismissed', 'stale']);

export function getFindingsPath({ appDataDir = DEFAULT_APP_DATA_DIR } = {}) {
  return path.join(appDataDir, FINDINGS_FILE);
}

export async function readFindingsStore(options = {}) {
  const findingsPath = getFindingsPath(options);
  try {
    return normalizeStore(JSON.parse(await fs.readFile(findingsPath, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return normalizeStore({});
  }
}

export async function generateFindings(scanOutput, options = {}) {
  const store = await readFindingsStore(options);
  const now = toIso(options.now?.() ?? new Date());
  const activeFindings = [];
  for (const project of scanOutput.projects ?? []) {
    activeFindings.push(...generateProjectFindings(project, now));
  }

  const activeIds = new Set(activeFindings.map((finding) => finding.id));
  const previousById = new Map((store.findings ?? []).map((finding) => [finding.id, finding]));
  const preserved = activeFindings.map((finding) =>
    applyStoredState(finding, previousById.get(finding.id), store.reviewStates),
  );
  const stale = (store.findings ?? [])
    .filter((finding) => !activeIds.has(finding.id) && finding.reviewState !== 'stale')
    .map((finding) => ({
      ...finding,
      reviewState: 'stale',
      staleAt: now,
      explanation: `${finding.explanation} Source evidence no longer supports this finding in the latest scan.`,
    }));

  const nextStore = normalizeStore({
    generatedAt: now,
    findings: [...preserved, ...stale],
    reviewStates: {
      ...store.reviewStates,
      ...Object.fromEntries(
        stale.map((finding) => [
          finding.id,
          { reviewState: 'stale', reviewedAt: now },
        ]),
      ),
    },
  });
  await writeFindingsStore(nextStore, options);
  return nextStore;
}

export async function updateFindingReviewState(id, reviewState, options = {}) {
  if (!VALID_REVIEW_STATES.has(reviewState) || reviewState === 'stale') {
    const err = new Error('reviewState must be "new", "accepted", or "dismissed".');
    err.statusCode = 400;
    throw err;
  }
  const store = await readFindingsStore(options);
  const finding = store.findings.find((entry) => entry.id === id);
  if (!finding) {
    const err = new Error('Finding not found.');
    err.statusCode = 404;
    throw err;
  }
  const reviewedAt = toIso(options.now?.() ?? new Date());
  const nextFinding = { ...finding, reviewState, reviewedAt, updatedAt: reviewedAt };
  const nextStore = normalizeStore({
    ...store,
    findings: store.findings.map((entry) => (entry.id === id ? nextFinding : entry)),
    reviewStates: {
      ...store.reviewStates,
      [id]: { reviewState, reviewedAt },
    },
  });
  await writeFindingsStore(nextStore, options);
  return nextFinding;
}

export function filterFindings(findings, state = 'unresolved') {
  if (!state || state === 'all') return findings;
  if (state === 'unresolved') return findings.filter((finding) => finding.reviewState === 'new');
  if (VALID_REVIEW_STATES.has(state)) return findings.filter((finding) => finding.reviewState === state);
  const err = new Error('state must be unresolved, all, new, accepted, dismissed, or stale.');
  err.statusCode = 400;
  throw err;
}

function generateProjectFindings(project, now) {
  const findings = [];
  for (const phase of project.phases ?? []) {
    if (phase.issue !== 'none') {
      findings.push(
        makeFinding(project, {
          type: 'status-contradiction',
          title: `Review suspected roadmap status contradiction in phase ${phase.id}`,
          explanation: phase.issueNote ?? 'The scanner found contradictory roadmap status signals.',
          confidence: phase.confidence ?? 'medium',
          evidenceItems: [phase],
          now,
        }),
      );
    }
  }

  for (const gate of project.signalGroups?.approvalGates ?? []) {
    findings.push(
      makeFinding(project, {
        type: 'unresolved-human-gate',
        title: 'Review unresolved human approval gate',
        explanation: gate.text,
        confidence: 'high',
        evidenceItems: [gate],
        now,
      }),
    );
  }

  for (const review of project.signalGroups?.needsReview ?? []) {
    findings.push(
      makeFinding(project, {
        type: 'missing-verification-evidence',
        title: 'Review missing verification evidence',
        explanation: review.text,
        confidence: 'high',
        evidenceItems: [review],
        now,
      }),
    );
  }

  if (!project.summary?.nextAction && (project.openTasks?.length ?? 0) > 0) {
    findings.push(
      makeFinding(project, {
        type: 'unclear-next-action',
        title: 'Clarify the next action',
        explanation: 'Open work exists, but no compact next-action summary was derived.',
        confidence: 'medium',
        evidenceItems: project.openTasks.slice(0, 2),
        now,
      }),
    );
  }

  const gaps = project.gaps ?? [];
  if (project.specFileCount === 0 || gaps.some((gap) => /No specs|No specs, SDD, or design/i.test(gap))) {
    findings.push(
      makeFinding(project, {
        type: 'missing-specs',
        title: 'Review missing specs or design documents',
        explanation: 'The scan did not find specs, SDD, or design documents for this project.',
        confidence: 'medium',
        evidenceItems: [{ text: 'No specs, SDD, or design documents found' }],
        now,
      }),
    );
  }

  if (gaps.some((gap) => /No audit|verification/i.test(gap))) {
    findings.push(
      makeFinding(project, {
        type: 'missing-verification-evidence',
        title: 'Review missing audit or verification documents',
        explanation: 'The scan did not find audit, review, or verification documents for this project.',
        confidence: 'medium',
        evidenceItems: [{ text: 'No audit, review, or verification documents found' }],
        now,
      }),
    );
  }

  const handoffGap = gaps.find((gap) => /Active Handoff/i.test(gap));
  if (handoffGap) {
    findings.push(
      makeFinding(project, {
        type: 'stale-handoff-pointer',
        title: 'Review stale active handoff pointer',
        explanation: handoffGap,
        confidence: 'high',
        evidenceItems: [{ text: handoffGap }],
        now,
      }),
    );
  }

  for (const audit of project.audits ?? []) {
    if (audit.status === 'attention') {
      findings.push(
        makeFinding(project, {
          type: 'stale-audit',
          title: `Review audit requiring attention: ${audit.title}`,
          explanation: 'An audit document is marked as needing attention.',
          confidence: 'medium',
          evidenceItems: [audit],
          now,
        }),
      );
    }
  }

  return dedupeFindings(findings);
}

function makeFinding(project, { type, title, explanation, confidence, evidenceItems, now }) {
  const evidence = evidenceItems.flatMap((item) => normalizeEvidence(item, item.text ?? title));
  const identityBasis = [
    project.name,
    project.path,
    type,
    title,
    evidence.map((item) => `${item.file ?? 'derived'}:${item.line ?? ''}:${item.text ?? ''}`).join('|'),
  ].join('|');
  return {
    id: crypto.createHash('sha256').update(identityBasis).digest('hex').slice(0, 16),
    type,
    title,
    explanation,
    confidence,
    reviewState: 'new',
    reviewRequired: true,
    project: {
      name: project.name,
      path: project.path,
    },
    evidence,
    createdAt: now,
    updatedAt: now,
  };
}

function applyStoredState(finding, previousFinding, reviewStates) {
  const review = reviewStates[finding.id];
  const base = previousFinding
    ? {
        ...finding,
        createdAt: previousFinding.createdAt ?? finding.createdAt,
        updatedAt: previousFinding.updatedAt ?? finding.updatedAt,
      }
    : finding;
  if (!review) return base;
  return {
    ...base,
    reviewState: review.reviewState,
    reviewedAt: review.reviewedAt,
  };
}

function dedupeFindings(findings) {
  return [...new Map(findings.map((finding) => [finding.id, finding])).values()];
}

function normalizeStore(input) {
  const findings = Array.isArray(input.findings) ? input.findings : [];
  const reviewStates =
    input.reviewStates && typeof input.reviewStates === 'object' && !Array.isArray(input.reviewStates)
      ? input.reviewStates
      : {};
  return {
    generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : null,
    findings,
    reviewStates,
  };
}

async function writeFindingsStore(store, options = {}) {
  const findingsPath = getFindingsPath(options);
  await fs.mkdir(path.dirname(findingsPath), { recursive: true });
  const tmpPath = `${findingsPath}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, findingsPath);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
