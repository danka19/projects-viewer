import type { PhaseItem } from './types';

/**
 * Implementation-progress semantics (dashboard-project-timeline spec):
 * - closed/accepted/pending_acceptance phases are 100% implemented;
 * - step-derived progress counts resolved eligible steps over all eligible
 *   steps, where cancelled/superseded steps leave numerator AND denominator;
 * - blocked/deferred steps stay in the denominator as incomplete;
 * - a phase whose lifecycle is not resolved and that has no eligible steps
 *   has UNKNOWN progress unless it is still unstarted (draft/planned/ready);
 * - progress never derives from dates, order, or file modification time.
 */

const RESOLVED_STEP = new Set(['pending_acceptance', 'accepted', 'closed']);
const EXCLUDED_STEP = new Set(['cancelled', 'superseded']);
const UNSTARTED_PHASE = new Set(['draft', 'planned', 'ready']);
const EXCLUDED_PHASE = new Set(['cancelled', 'superseded']);

export type ProgressBasis = 'explicit-lifecycle' | 'derived-from-steps';

export interface PhaseProgressInfo {
  percent: number | null;
  basis: ProgressBasis | null;
  eligibleSteps: number;
  resolvedSteps: number;
}

export function phaseProgressInfo(
  ph: Pick<PhaseItem, 'status' | 'steps'>,
): PhaseProgressInfo {
  const eligible = ph.steps.filter((s) => !EXCLUDED_STEP.has(s.status));
  const resolved = eligible.filter((s) => RESOLVED_STEP.has(s.status));

  if (ph.status === 'closed' || ph.status === 'accepted' || ph.status === 'pending_acceptance') {
    return {
      percent: 100,
      basis: 'explicit-lifecycle',
      eligibleSteps: eligible.length,
      resolvedSteps: resolved.length,
    };
  }
  if (eligible.length > 0) {
    return {
      percent: Math.round((resolved.length / eligible.length) * 100),
      basis: 'derived-from-steps',
      eligibleSteps: eligible.length,
      resolvedSteps: resolved.length,
    };
  }
  if (UNSTARTED_PHASE.has(ph.status)) {
    return { percent: 0, basis: 'explicit-lifecycle', eligibleSteps: 0, resolvedSteps: 0 };
  }
  // in_progress / blocked / deferred without eligible steps, or cancelled /
  // superseded phases: no evidence — unknown, never a fabricated number.
  return { percent: null, basis: null, eligibleSteps: 0, resolvedSteps: 0 };
}

export function phaseProgress(ph: Pick<PhaseItem, 'status' | 'steps'>): number | null {
  return phaseProgressInfo(ph).percent;
}

export interface RoadmapProgress {
  /** Mean of known eligible phase percentages, or null without evidence. */
  percent: number | null;
  knownPhases: number;
  unknownPhases: number;
  eligiblePhases: number;
}

export function projectRoadmapProgress(
  phases: Pick<PhaseItem, 'status' | 'steps'>[],
): RoadmapProgress {
  const eligible = phases.filter((ph) => !EXCLUDED_PHASE.has(ph.status));
  const known: number[] = [];
  let unknown = 0;
  for (const ph of eligible) {
    const percent = phaseProgressInfo(ph).percent;
    if (percent === null) unknown += 1;
    else known.push(percent);
  }
  return {
    percent:
      known.length > 0
        ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length)
        : null,
    knownPhases: known.length,
    unknownPhases: unknown,
    eligiblePhases: eligible.length,
  };
}
