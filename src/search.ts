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
  score: number;
  project: ProjectData;
  tab?: TabId;
  knowledgeView?: KnowledgeViewId;
  drawer?: DrawerItem;
}

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

export function searchProjects(
  projects: ProjectData[],
  rawQuery: string,
  options: { includeDiagnostics?: boolean } = {},
): SearchResult {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return { hits: [], total: 0, truncated: false, diagnosticsAvailable: 0 };

  const byKey = new Map<string, SearchHit>();
  let diagnosticsAvailable = 0;

  const add = (hit: SearchHit) => {
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

  return {
    hits: all.slice(0, SEARCH_LIMIT),
    total: all.length,
    truncated: all.length > SEARCH_LIMIT,
    diagnosticsAvailable,
  };
}
