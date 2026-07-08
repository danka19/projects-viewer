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
    badge:
      'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.14)]',
    text: 'text-emerald-300',
    bar: 'bg-emerald-400',
  },
  stalled: {
    label: 'Stalled',
    badge:
      'border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.12)]',
    text: 'text-amber-300',
    bar: 'bg-amber-400',
  },
  done: {
    label: 'Done',
    badge:
      'border-sky-400/30 bg-sky-400/10 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.14)]',
    text: 'text-sky-300',
    bar: 'bg-sky-400',
  },
  'needs-attention': {
    label: 'Needs attention',
    badge:
      'border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_16px_rgba(251,113,133,0.16)]',
    text: 'text-rose-300',
    bar: 'bg-rose-400',
  },
  unknown: {
    label: 'Unknown',
    badge: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
    text: 'text-slate-400',
    bar: 'bg-slate-500',
  },
};

export const PHASE_META: Record<
  PhaseStatus,
  { label: string; chip: string; dot: string }
> = {
  completed: {
    label: 'completed',
    chip: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]',
  },
  completed_pending_approval: {
    label: 'completed · approval pending',
    chip: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
    dot: 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.55)]',
  },
  pending_approval: {
    label: 'pending approval',
    chip: 'border-violet-400/30 bg-violet-400/5 text-violet-300/90',
    dot: 'border border-violet-400 bg-transparent',
  },
  in_progress: {
    label: 'in progress',
    chip: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    dot: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
  },
  needs_review: {
    label: 'needs review',
    chip: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
    dot: 'bg-orange-400',
  },
  paused: {
    label: 'paused',
    chip: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  blocked: {
    label: 'blocked',
    chip: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    dot: 'bg-rose-400',
  },
  planned: {
    label: 'planned',
    chip: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
    dot: 'border border-slate-500 bg-transparent',
  },
  unknown: {
    label: 'unknown',
    chip: 'border-slate-600/40 bg-slate-600/10 text-slate-500',
    dot: 'border border-slate-600 bg-transparent',
  },
};

export const STEP_META: Record<StepStatus, { label: string; dot: string; text: string }> = {
  completed: { label: 'completed', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  completed_pending_approval: {
    label: 'completed · approval pending',
    dot: 'bg-violet-400',
    text: 'text-violet-300',
  },
  in_progress: { label: 'in progress', dot: 'bg-sky-400', text: 'text-sky-300' },
  pending: { label: 'pending', dot: 'bg-slate-500', text: 'text-slate-400' },
  blocked: { label: 'blocked', dot: 'bg-rose-400', text: 'text-rose-300' },
  paused: { label: 'paused', dot: 'bg-amber-400', text: 'text-amber-300' },
  needs_review: { label: 'needs review', dot: 'bg-orange-400', text: 'text-orange-300' },
  unknown: { label: 'unknown', dot: 'border border-slate-600 bg-transparent', text: 'text-slate-500' },
};

export const CONFIDENCE_META: Record<
  Confidence,
  { label: string; dot: string; text: string }
> = {
  high: { label: 'high confidence', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  medium: { label: 'medium confidence', dot: 'bg-amber-400', text: 'text-amber-300' },
  low: { label: 'low confidence', dot: 'bg-rose-400', text: 'text-rose-300' },
};

export const BLOCKER_META: Record<string, { label: string; chip: string }> = {
  rejection: {
    label: 'rejection',
    chip: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  },
  blocked: {
    label: 'blocked',
    chip: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
  'human-gate': {
    label: 'human gate',
    chip: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  },
};

export const SPEC_STATUS_CHIP: Record<string, string> = {
  active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  done: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  archived: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  unknown: 'border-slate-600/40 bg-slate-600/10 text-slate-500',
};

export const AUDIT_STATUS_CHIP: Record<string, string> = {
  attention: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  recorded: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  archived: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
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
  if (score >= 75) return 'text-emerald-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-rose-300';
}

export function healthStroke(score: number): string {
  if (score >= 75) return '#34d399';
  if (score >= 50) return '#fbbf24';
  return '#fb7185';
}

export const STATUS_ORDER: ProjectStatus[] = [
  'needs-attention',
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
