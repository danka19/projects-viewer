import type { PhaseItem } from './types';

const RESOLVED_STEP = new Set([
  'pending_acceptance',
  'accepted',
  'closed',
]);

export function phaseProgress(ph: Pick<PhaseItem, 'status' | 'steps'>): number | null {
  if (ph.status === 'closed') return 100;
  if (ph.status === 'accepted') return 100;
  if (ph.status === 'pending_acceptance') return 100;
  if (ph.steps.length > 0) {
    return Math.round(
      (ph.steps.filter((s) => RESOLVED_STEP.has(s.status)).length / ph.steps.length) * 100,
    );
  }
  if (
    ph.status === 'draft' ||
    ph.status === 'planned' ||
    ph.status === 'ready' ||
    ph.status === 'deferred' ||
    ph.status === 'cancelled' ||
    ph.status === 'superseded'
  ) {
    return 0;
  }
  return null;
}
