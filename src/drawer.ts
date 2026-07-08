import type {
  AuditDoc,
  BlockerItem,
  DecisionItem,
  DocFile,
  DrawerItem,
  Marker,
  PhaseItem,
  PhaseStep,
  ProjectData,
  RiskItem,
  SpecItem,
  TaskItem,
} from './types';
import {
  AUDIT_STATUS_CHIP,
  BLOCKER_META,
  PHASE_META,
  SPEC_STATUS_CHIP,
  STEP_META,
} from './statusMeta';

export function phaseDrawer(ph: PhaseItem, p: ProjectData, withRelated = true): DrawerItem {
  const related = withRelated
    ? p.phases
        .filter((x) => x.id !== ph.id && x.id.startsWith(ph.id.split('.')[0]))
        .slice(0, 5)
        .map((x) => ({ label: `Phase ${x.id} — ${x.name}`, item: phaseDrawer(x, p, false) }))
    : [];
  const why =
    `Raw status: ${ph.statusText || '(no Status: line found)'}` +
    `\n\nParser rule: ${ph.rule}\nConfidence: ${ph.confidence}` +
    (ph.issue !== 'none' ? `\nSuspected ${ph.issue} issue: ${ph.issueNote ?? ''}` : '');
  return {
    type: 'Roadmap phase',
    title: `Phase ${ph.id} — ${ph.name}`,
    status: PHASE_META[ph.status].label,
    statusChip: PHASE_META[ph.status].chip,
    text: why,
    file: ph.file,
    line: ph.line,
    projectPath: p.path,
    related,
  };
}

export function stepDrawer(step: PhaseStep, p: ProjectData): DrawerItem {
  return {
    type: `Phase ${step.phaseId} step`,
    title: `${step.id ? step.id + ' ' : ''}${step.name}`,
    status: STEP_META[step.status].label,
    statusChip: `border-line bg-void/40 ${STEP_META[step.status].text}`,
    text:
      `${step.evidence || '(no evidence line captured)'}` +
      `\n\nParser rule: ${step.rule}`,
    file: step.file,
    line: step.line,
    projectPath: p.path,
  };
}

export function taskDrawer(t: TaskItem, p: ProjectData, kind = 'Task'): DrawerItem {
  return {
    type: kind,
    title: t.text.length > 80 ? t.text.slice(0, 80) + '…' : t.text,
    text: t.text + (t.section ? `\n\nSection: ${t.section}` : ''),
    file: t.file,
    line: t.line,
    projectPath: p.path,
  };
}

export function decisionDrawer(d: DecisionItem, p: ProjectData): DrawerItem {
  return {
    type: 'Decision',
    title: d.date ? `Decision · ${d.date}` : 'Decision',
    text: d.text,
    file: d.file,
    line: d.line,
    projectPath: p.path,
  };
}

export function blockerDrawer(b: BlockerItem, p: ProjectData): DrawerItem {
  return {
    type: 'Blocked / gated work',
    title: b.text.length > 80 ? b.text.slice(0, 80) + '…' : b.text,
    status: BLOCKER_META[b.kind]?.label ?? b.kind,
    statusChip: BLOCKER_META[b.kind]?.chip,
    text: b.text,
    file: b.file,
    line: b.line,
    projectPath: p.path,
  };
}

export function riskDrawer(r: RiskItem, p: ProjectData): DrawerItem {
  return {
    type: r.kind === 'open-question' ? 'Open question' : 'Risk',
    title: r.text.length > 80 ? r.text.slice(0, 80) + '…' : r.text,
    text: r.text,
    file: r.file,
    line: r.line,
    projectPath: p.path,
  };
}

export function markerDrawer(m: Marker, p: ProjectData): DrawerItem {
  return {
    type: `${m.type} marker`,
    title: m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text,
    text: m.text,
    file: m.file,
    line: m.line,
    projectPath: p.path,
  };
}

export function specDrawer(sp: SpecItem, p: ProjectData): DrawerItem {
  const parts: string[] = [];
  if (sp.artifacts?.length) parts.push(`Artifacts: ${sp.artifacts.join(', ')}`);
  if (typeof sp.openTasks === 'number' && (sp.openTasks || sp.completedTasks)) {
    parts.push(`Tasks: ${sp.completedTasks}/${(sp.openTasks ?? 0) + (sp.completedTasks ?? 0)} done`);
  }
  return {
    type: sp.kind === 'handoff' ? 'Handoff' : 'OpenSpec change',
    title: sp.name,
    status: sp.status,
    statusChip: SPEC_STATUS_CHIP[sp.status] ?? SPEC_STATUS_CHIP.unknown,
    text: parts.join('\n') || undefined,
    file: sp.file,
    projectPath: p.path,
  };
}

export function auditDrawer(a: AuditDoc, p: ProjectData): DrawerItem {
  const related = p.blockers
    .filter((b) => b.file === a.file)
    .slice(0, 6)
    .map((b) => ({
      label: b.text.slice(0, 70) + (b.text.length > 70 ? '…' : ''),
      item: blockerDrawer(b, p),
    }));
  return {
    type: 'Audit / verification doc',
    title: a.title,
    status: a.status,
    statusChip: AUDIT_STATUS_CHIP[a.status],
    text: `Dated ${a.date}. ${a.severeSignals} severe signal${a.severeSignals === 1 ? '' : 's'} extracted from this document.`,
    file: a.file,
    projectPath: p.path,
    related,
  };
}

export function docDrawer(doc: DocFile, p: ProjectData): DrawerItem {
  const related = p.headings
    .filter((h) => h.file === doc.file)
    .slice(0, 10)
    .map((h) => ({
      label: h.text,
      item: {
        type: 'Heading',
        title: h.text,
        file: h.file,
        line: h.line,
        projectPath: p.path,
      } as DrawerItem,
    }));
  const tasks = (doc.openTaskCount ?? 0) + (doc.completedTaskCount ?? 0);
  return {
    type: 'Documentation file',
    title: doc.file.split('/').pop() ?? doc.file,
    status: doc.category,
    text:
      `${(doc.sizeBytes / 1024).toFixed(1)} KB · modified ${doc.modified.slice(0, 10)}` +
      (tasks > 0 ? ` · ${doc.completedTaskCount}/${tasks} tasks done` : ''),
    file: doc.file,
    projectPath: p.path,
    related,
  };
}
