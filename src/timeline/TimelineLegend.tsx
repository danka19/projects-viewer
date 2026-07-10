import { useState } from 'react';
import type { PhaseStatus } from '../types';
import type { ProjectTimelineModel } from './model';
import { PHASE_META } from '../statusMeta';
import { LIFECYCLE_VISUALS } from './statusVisuals';

const LEGEND_ORDER: PhaseStatus[] = [
  'closed',
  'accepted',
  'in_progress',
  'pending_acceptance',
  'blocked',
  'ready',
  'planned',
  'draft',
  'deferred',
  'cancelled',
  'superseded',
];

/**
 * Legend for only the lifecycle groups present in the model. Every symbol is
 * accompanied by a text label and count; on narrow viewports it collapses
 * into a disclosure but stays keyboard/AT reachable.
 */
export default function TimelineLegend({ model }: { model: ProjectTimelineModel }) {
  const [open, setOpen] = useState(false);
  const counts = new Map<PhaseStatus, number>();
  for (const ph of model.phases) counts.set(ph.status, (counts.get(ph.status) ?? 0) + 1);
  const present = LEGEND_ORDER.filter((status) => (counts.get(status) ?? 0) > 0);
  if (present.length === 0) return null;

  const items = present.map((status) => (
    <span key={status} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-mute">
      <span
        aria-hidden="true"
        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] leading-none ${LIFECYCLE_VISUALS[status].node}`}
      >
        {LIFECYCLE_VISUALS[status].icon}
      </span>
      {counts.get(status)} {PHASE_META[status].label}
    </span>
  ));

  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase transition-colors hover:text-ink sm:hidden"
      >
        Legend {open ? '▴' : '▾'}
      </button>
      <div className={`flex-wrap items-center gap-x-4 gap-y-1.5 ${open ? 'mt-2 flex' : 'hidden'} sm:flex`}>
        {items}
      </div>
    </div>
  );
}
