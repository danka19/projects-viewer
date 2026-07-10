import type { Confidence, PhaseStatus, ProjectStatus, StepStatus } from './types';

export const STATUS_META: Record<
  ProjectStatus,
  {
    label: string;
    /** Glowing pill badge */
    badge: string;
    /** Plain colored text */
    text: string;
    /** Meter / bar fill */
    bar: string;
  }
> = {
  active: {
    label: 'Active',
    badge: 'border-ok/40 bg-ok/10 text-ok',
    text: 'text-ok',
    bar: 'bg-ok',
  },
  stalled: {
    label: 'Stalled',
    badge: 'border-warn/40 bg-warn/10 text-warn',
    text: 'text-warn',
    bar: 'bg-warn',
  },
  done: {
    label: 'Done',
    badge: 'border-info/40 bg-info/10 text-info',
    text: 'text-info',
    bar: 'bg-info',
  },
  'pending-approval': {
    label: 'Pending approval',
    badge: 'border-gate/40 bg-gate/10 text-gate',
    text: 'text-gate',
    bar: 'bg-gate',
  },
  'needs-review': {
    label: 'Needs review',
    badge: 'border-review/40 bg-review/10 text-review',
    text: 'text-review',
    bar: 'bg-review',
  },
  paused: {
    label: 'Paused',
    badge: 'border-warn/40 bg-warn/10 text-warn',
    text: 'text-warn',
    bar: 'bg-warn',
  },
  'needs-attention': {
    label: 'Needs attention',
    badge: 'border-danger/40 bg-danger/10 text-danger',
    text: 'text-danger',
    bar: 'bg-danger',
  },
  unknown: {
    label: 'Unknown',
    badge: 'border-dim/40 bg-dim/10 text-dim',
    text: 'text-dim',
    bar: 'bg-dim',
  },
};

export const PHASE_META: Record<
  PhaseStatus,
  { label: string; chip: string; dot: string }
> = {
  draft: {
    label: 'draft',
    chip: 'border-dim/40 bg-dim/10 text-dim/80',
    dot: 'border border-dim bg-transparent',
  },
  planned: {
    label: 'planned',
    chip: 'border-dim/40 bg-dim/10 text-dim',
    dot: 'border border-dim bg-transparent',
  },
  ready: {
    label: 'ready',
    chip: 'border-info/40 bg-info/5 text-info/90',
    dot: 'border border-info bg-transparent',
  },
  in_progress: {
    label: 'in progress',
    chip: 'border-info/40 bg-info/10 text-info',
    dot: 'bg-info',
  },
  blocked: {
    label: 'blocked',
    chip: 'border-danger/40 bg-danger/10 text-danger',
    dot: 'bg-danger',
  },
  pending_acceptance: {
    label: 'pending acceptance',
    chip: 'border-gate/40 bg-gate/10 text-gate',
    dot: 'bg-gate',
  },
  accepted: {
    label: 'accepted',
    chip: 'border-ok/40 bg-ok/5 text-ok/90',
    dot: 'border border-ok bg-transparent',
  },
  closed: {
    label: 'closed',
    chip: 'border-ok/40 bg-ok/10 text-ok',
    dot: 'bg-ok',
  },
  deferred: {
    label: 'deferred',
    chip: 'border-warn/40 bg-warn/10 text-warn',
    dot: 'bg-warn',
  },
  cancelled: {
    label: 'cancelled',
    chip: 'border-dim/40 bg-dim/10 text-dim',
    dot: 'border border-dim bg-transparent',
  },
  superseded: {
    label: 'superseded',
    chip: 'border-dim/40 bg-dim/10 text-dim',
    dot: 'border border-dim bg-transparent',
  },
};

export const STEP_META: Record<StepStatus, { label: string; dot: string; text: string }> = {
  draft: { label: 'draft', dot: 'border border-dim bg-transparent', text: 'text-dim/80' },
  planned: { label: 'planned', dot: 'bg-dim', text: 'text-dim' },
  ready: { label: 'ready', dot: 'border border-info bg-transparent', text: 'text-info' },
  in_progress: { label: 'in progress', dot: 'bg-info', text: 'text-info' },
  blocked: { label: 'blocked', dot: 'bg-danger', text: 'text-danger' },
  pending_acceptance: { label: 'pending acceptance', dot: 'bg-gate', text: 'text-gate' },
  accepted: { label: 'accepted', dot: 'border border-ok bg-transparent', text: 'text-ok' },
  closed: { label: 'closed', dot: 'bg-ok', text: 'text-ok' },
  deferred: { label: 'deferred', dot: 'bg-warn', text: 'text-warn' },
  cancelled: { label: 'cancelled', dot: 'border border-dim bg-transparent', text: 'text-dim' },
  superseded: { label: 'superseded', dot: 'border border-dim bg-transparent', text: 'text-dim' },
};

export const CONFIDENCE_META: Record<
  Confidence,
  { label: string; dot: string; text: string }
> = {
  high: { label: 'high confidence', dot: 'bg-ok', text: 'text-ok' },
  medium: { label: 'medium confidence', dot: 'bg-warn', text: 'text-warn' },
  low: { label: 'low confidence', dot: 'bg-danger', text: 'text-danger' },
};

export const BLOCKER_META: Record<string, { label: string; chip: string }> = {
  rejection: {
    label: 'rejection',
    chip: 'border-danger/40 bg-danger/10 text-danger',
  },
  blocked: {
    label: 'real blocker',
    chip: 'border-warn/40 bg-warn/10 text-warn',
  },
  'approval-gate': {
    label: 'approval gate',
    chip: 'border-gate/40 bg-gate/10 text-gate',
  },
  'needs-review': {
    label: 'needs review',
    chip: 'border-review/40 bg-review/10 text-review',
  },
  'paused-deferred': {
    label: 'paused/deferred',
    chip: 'border-dim/40 bg-dim/10 text-dim',
  },
};

export const SPEC_STATUS_CHIP: Record<string, string> = {
  active: 'border-ok/40 bg-ok/10 text-ok',
  done: 'border-info/40 bg-info/10 text-info',
  archived: 'border-dim/40 bg-dim/10 text-dim',
  unknown: 'border-dim/40 bg-dim/10 text-dim/80',
};

export const AUDIT_STATUS_CHIP: Record<string, string> = {
  attention: 'border-danger/40 bg-danger/10 text-danger',
  recorded: 'border-info/40 bg-info/10 text-info',
  archived: 'border-dim/40 bg-dim/10 text-dim',
};

export const DOC_CATEGORY_META: Record<string, { label: string; icon: string }> = {
  core: { label: 'Core docs', icon: '◆' },
  roadmap: { label: 'Roadmap / Planning', icon: '◈' },
  spec: { label: 'SDD / Specs', icon: '▤' },
  audit: { label: 'Audits / QA', icon: '☑' },
  decision: { label: 'Decisions', icon: '⚖' },
  handoff: { label: 'Handoffs', icon: '⇄' },
  other: { label: 'Other docs', icon: '·' },
};

export function healthColor(score: number): string {
  if (score >= 75) return 'text-ok';
  if (score >= 50) return 'text-warn';
  return 'text-danger';
}

export function healthStroke(score: number): string {
  if (score >= 75) return 'var(--ok)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

export const STATUS_ORDER: ProjectStatus[] = [
  'needs-attention',
  'needs-review',
  'pending-approval',
  'paused',
  'active',
  'stalled',
  'done',
  'unknown',
];

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysAgo(iso: string | null): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function dayLabel(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
