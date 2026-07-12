import type { DrawerItem, KnowledgeViewId, ProjectData, TabId } from './types';
import {
  blockedGatedCandidateDrawer,
  blockerDrawer,
  decisionDrawer,
  docDrawer,
  phaseDrawer,
  specDrawer,
  taskDrawer,
} from './drawer';

/**
 * Global search with deterministic ranking: current and accepted sources
 * (projects, live roadmap state, work signals) outrank historical documents,
 * and parser diagnostics are excluded unless explicitly requested. Results
 * disclose the true total and truncation instead of silently capping.
 */

export interface SearchHit {
  key: string;
  kind: string;
  label: string;
  sub: string;
  matchFragment: string;
  matchFragmentLeadingOmitted: boolean;
  matchFragmentTrailingOmitted: boolean;
  score: number;
  project: ProjectData;
  tab?: TabId;
  knowledgeView?: KnowledgeViewId;
  drawer?: DrawerItem;
  primaryView?: 'roadmap' | 'specs';
  specKey?: string;
  taskKey?: string;
}

type RankedSearchHit = Omit<
  SearchHit,
  'matchFragment' | 'matchFragmentLeadingOmitted' | 'matchFragmentTrailingOmitted'
>;

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  truncated: boolean;
  diagnosticsAvailable: number;
}

export const SEARCH_LIMIT = 40;

const PHASE_SCORE: Record<string, number> = {
  in_progress: 92,
  pending_acceptance: 88,
  blocked: 86,
  ready: 74,
  planned: 72,
  draft: 70,
  accepted: 68,
  closed: 66,
  deferred: 64,
  cancelled: 40,
  superseded: 40,
};

function stableKey(
  project: ProjectData,
  kind: string,
  file = '',
  line: number | undefined = undefined,
  identity = '',
): string {
  return JSON.stringify([project.path, kind, file, line ?? null, identity]);
}

function evidenceKey(
  project: ProjectData,
  evidence: { file: string; line: number; text: string },
): string {
  return JSON.stringify([project.path, evidence.file, evidence.line, evidence.text]);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function matchSource(hit: RankedSearchHit, query: string): string {
  const specification = hit.specKey
    ? hit.project.specWork?.specifications.find((item) => item.key === hit.specKey)
    : undefined;
  const candidates = [
    hit.label,
    hit.sub,
    hit.drawer?.title,
    hit.drawer?.text,
    hit.drawer?.file,
    hit.specKey,
    hit.taskKey,
    specification?.id,
    specification?.groupId,
  ];
  return candidates.find((candidate) => candidate?.toLowerCase().includes(query)) ?? hit.label;
}

function matchPresentation(
  source: string,
  query: string,
): Pick<
  SearchHit,
  'matchFragment' | 'matchFragmentLeadingOmitted' | 'matchFragmentTrailingOmitted'
> {
  const matchStart = source.toLowerCase().indexOf(query);
  if (matchStart < 0) {
    return {
      matchFragment: source,
      matchFragmentLeadingOmitted: false,
      matchFragmentTrailingOmitted: false,
    };
  }

  const contextLength = 48;
  const matchEnd = matchStart + query.length;
  let start = Math.max(0, matchStart - contextLength);
  let end = Math.min(source.length, matchEnd + contextLength);

  if (start > 0) {
    const nextBoundary = source.slice(start, matchStart).search(/\s/);
    if (nextBoundary >= 0) start += nextBoundary + 1;
  }
  if (end < source.length) {
    const previousBoundary = source.slice(matchEnd, end).search(/\s\S*$/);
    if (previousBoundary >= 0) end = matchEnd + previousBoundary;
  }

  const leadingOmitted = start > 0;
  const trailingOmitted = end < source.length;
  const fragment = source.slice(start, end).trim();
  return {
    matchFragment: `${leadingOmitted ? '…' : ''}${fragment}${trailingOmitted ? '…' : ''}`,
    matchFragmentLeadingOmitted: leadingOmitted,
    matchFragmentTrailingOmitted: trailingOmitted,
  };
}

export function searchProjects(
  projects: ProjectData[],
  rawQuery: string,
  options: { includeDiagnostics?: boolean } = {},
): SearchResult {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return { hits: [], total: 0, truncated: false, diagnosticsAvailable: 0 };

  const byKey = new Map<string, RankedSearchHit>();
  let diagnosticsAvailable = 0;

  const add = (hit: RankedSearchHit) => {
    const existing = byKey.get(hit.key);
    if (!existing || hit.score > existing.score) byKey.set(hit.key, hit);
  };

  for (const p of projects) {
    const diagnostics = [
      ...p.blockedGatedDiagnostics.filteredAgentRules,
      ...p.blockedGatedDiagnostics.filteredProcessPolicies,
      ...p.blockedGatedDiagnostics.filteredExamplesOrTemplates,
    ];
    const diagnosticEvidenceKeys = new Set(diagnostics.map((item) => evidenceKey(p, item)));
    const nextTaskEvidenceKeys = new Set(p.nextTasks.map((item) => evidenceKey(p, item)));

    if (p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)) {
      add({
        key: stableKey(p, 'project', '', undefined, p.path),
        kind: 'Project',
        label: p.name,
        sub: p.path,
        score: 100,
        project: p,
      });
    }
    for (const ph of p.phases) {
      if (`phase ${ph.id} ${ph.name}`.toLowerCase().includes(q)) {
        add({
          key: stableKey(p, 'phase', ph.file, ph.line, ph.id),
          kind: 'Roadmap',
          label: `Phase ${ph.id} — ${ph.name}`,
          sub: `${p.name} · ${ph.status.replace('_', ' ')}`,
          score: PHASE_SCORE[ph.status] ?? 60,
          project: p,
          tab: 'status',
          drawer: phaseDrawer(ph, p),
          primaryView: 'roadmap',
        });
      }
    }
    for (const t of p.nextTasks) {
      if (t.text.toLowerCase().includes(q)) {
        add({
          key: stableKey(p, 'next-action', t.file, t.line, t.text),
          kind: 'Next action',
          label: t.text.slice(0, 90),
          sub: p.name,
          score: 84,
          project: p,
          tab: 'work',
          drawer: taskDrawer(t, p, 'Next action', 'next-action'),
        });
      }
    }
    for (const b of [
      ...p.signalGroups.realBlockers,
      ...p.signalGroups.approvalGates,
      ...p.signalGroups.needsReview,
      ...p.signalGroups.pausedDeferred,
    ]) {
      if (b.text.toLowerCase().includes(q)) {
        const kind = b.kind === 'blocked' || b.kind === 'rejection' ? 'Blocker' : 'Signal';
        add({
          key: stableKey(p, kind === 'Blocker' ? 'blocker' : 'signal', b.file, b.line, b.text),
          kind,
          label: b.text.slice(0, 90),
          sub: p.name,
          score: b.group === 'realBlockers' ? 82 : 78,
          project: p,
          tab: 'work',
          drawer: blockerDrawer(b, p),
        });
      }
    }
    for (const t of p.openTasks) {
      const key = evidenceKey(p, t);
      if (diagnosticEvidenceKeys.has(key) || nextTaskEvidenceKeys.has(key)) continue;
      if (t.text.toLowerCase().includes(q)) {
        add({
          key: stableKey(p, 'task', t.file, t.line, t.text),
          kind: 'Task',
          label: t.text.slice(0, 90),
          sub: p.name,
          score: 58,
          project: p,
          tab: 'work',
          drawer: taskDrawer(t, p),
        });
      }
    }
    for (const d of p.decisions) {
      if (d.text.toLowerCase().includes(q)) {
        add({
          key: stableKey(p, 'decision', d.file, d.line, d.text),
          kind: 'Decision',
          label: d.text.slice(0, 90),
          sub: `${p.name}${d.date ? ` · ${d.date}` : ''}`,
          score: d.date ? 62 : 56,
          project: p,
          tab: 'decisions',
          drawer: decisionDrawer(d, p),
        });
      }
    }
    for (const sp of p.specs) {
      if (sp.name.toLowerCase().includes(q)) {
        add({
          key: stableKey(p, 'spec', sp.file, undefined, sp.name),
          kind: 'Spec',
          label: sp.name,
          sub: `${p.name} · ${sp.status}`,
          score: sp.status === 'active' ? 76 : sp.status === 'archived' ? 44 : 54,
          project: p,
          tab: 'knowledge',
          knowledgeView: 'specs',
          drawer: specDrawer(sp, p),
        });
      }
    }
    for (const spec of p.specWork?.specifications ?? []) {
      const haystack = [spec.name, spec.id, spec.groupId, spec.lifecycleStatus, spec.source.file].filter(Boolean).join(' ').toLowerCase();
      if (haystack.includes(q)) {
        add({
          key: stableKey(p, 'spec-work', spec.source.file, spec.source.line, spec.key),
          kind: 'Specification',
          label: spec.name,
          sub: `${p.name} · ${spec.lifecycleStatus.replaceAll('_', ' ')}`,
          score: spec.lifecycleStatus === 'in_progress' ? 90 : spec.lifecycleStatus === 'archived' ? 46 : 70,
          project: p,
          primaryView: 'specs',
          specKey: spec.key,
          drawer: {
            type: 'Specification', title: spec.name, text: `${spec.kind.replaceAll('-', ' ')} · ${spec.lifecycleStatus.replaceAll('_', ' ')}`,
            file: spec.source.file, line: spec.source.line, projectPath: p.path, status: spec.lifecycleStatus.replaceAll('_', ' '),
          },
        });
      }
      for (const task of spec.tasks) {
        if (!task.name.toLowerCase().includes(q)) continue;
        add({
          key: stableKey(p, 'spec-task', task.source.file, task.source.line, task.key),
          kind: 'Spec task', label: task.name, sub: `${p.name} · ${spec.name}`, score: task.status === 'in_progress' ? 88 : 68,
          project: p, primaryView: 'specs', specKey: spec.key, taskKey: task.key,
          drawer: {
            type: 'Specification task', title: task.name, text: `${spec.name} · ${task.status.replaceAll('_', ' ')}`,
            file: task.source.file, line: task.source.line, projectPath: p.path, status: task.status.replaceAll('_', ' '),
          },
        });
      }
    }
    for (const doc of p.docs) {
      if (doc.file.toLowerCase().includes(q)) {
        add({
          key: stableKey(p, 'doc', doc.file, undefined, doc.file),
          kind: 'Doc',
          label: doc.file,
          sub: p.name,
          score: 42,
          project: p,
          tab: 'knowledge',
          knowledgeView: 'docs',
          drawer: docDrawer(doc, p),
        });
      }
    }
    const matchingDiagnosticEvidence = new Set<string>();
    for (const candidate of diagnostics) {
      if (
        candidate.text.toLowerCase().includes(q) ||
        candidate.reason.toLowerCase().includes(q)
      ) {
        const candidateEvidenceKey = evidenceKey(p, candidate);
        if (matchingDiagnosticEvidence.has(candidateEvidenceKey)) continue;
        matchingDiagnosticEvidence.add(candidateEvidenceKey);
        diagnosticsAvailable += 1;
        if (options.includeDiagnostics) {
          add({
            key: stableKey(p, 'diagnostic', candidate.file, candidate.line, candidate.text),
            kind: 'Diagnostic',
            label: candidate.text.slice(0, 90),
            sub: `${p.name} · ${candidate.classification}`,
            score: 10,
            project: p,
            tab: 'work',
            drawer: blockedGatedCandidateDrawer(candidate, p),
          });
        }
      }
    }
  }

  const all = [...byKey.values()];
  // Stable ranking: score, project identity, label, and source identity.
  all.sort(
    (a, b) =>
      b.score - a.score ||
      compareText(a.project.path, b.project.path) ||
      compareText(a.label, b.label) ||
      compareText(a.key, b.key),
  );

  // Match fragments are presentation-only metadata. Compute them only after
  // evidence identity, deduplication, scoring, and stable ordering are final.
  const presented = all.map((hit): SearchHit => ({
    ...hit,
    ...matchPresentation(matchSource(hit, q), q),
  }));

  return {
    hits: presented.slice(0, SEARCH_LIMIT),
    total: all.length,
    truncated: all.length > SEARCH_LIMIT,
    diagnosticsAvailable,
  };
}
