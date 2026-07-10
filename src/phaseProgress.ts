import type { PhaseItem } from './types';

const DONE_STEP = new Set(['completed', 'completed_pending_approval']);

export function phaseProgress(ph: Pick<PhaseItem, 'status' | 'steps'>): number | null {
  if (ph.status === 'completed') return 100;
  if (ph.status === 'completed_pending_approval') return 100;
  if (ph.steps.length > 0) {
    return Math.round(
      (ph.steps.filter((s) => DONE_STEP.has(s.status)).length / ph.steps.length) * 100,
    );
  }
  if (ph.status === 'planned') return 0;
  return null;
}
