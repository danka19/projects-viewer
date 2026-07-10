import type { TimelinePhaseModel } from './model';
import { CONFIDENCE_META, PHASE_META } from '../statusMeta';
import { LIFECYCLE_VISUALS, REMOVED_STATUSES, RESOLVED_STATUSES } from './statusVisuals';

interface Props {
  phase: TimelinePhaseModel;
  isCurrent: boolean;
  isExpanded: boolean;
  isFocused: boolean;
  compact: boolean;
  stepRegionId: string;
  buttonId: string;
  onActivate: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onFocus: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
}

/** One phase card + its axis node. Selection emphasis is orthogonal to lifecycle. */
export default function PhaseCard({
  phase,
  isCurrent,
  isExpanded,
  isFocused,
  compact,
  stepRegionId,
  buttonId,
  onActivate,
  onKeyDown,
  onFocus,
  registerRef,
}: Props) {
  const meta = PHASE_META[phase.status];
  const visual = LIFECYCLE_VISUALS[phase.status];
  const conf = CONFIDENCE_META[phase.confidence];
  const resolved = RESOLVED_STATUSES.has(phase.status);
  const removed = REMOVED_STATUSES.has(phase.status);
  const showProse = !compact || isCurrent || isExpanded;
  const statusChipClass = meta.chip.replace(/(text-(?:dim|info|ok))\/\d+/, '$1');
  const integrityDescriptionId = `${buttonId}-integrity`;
  const integrityDescription = `${conf.label}. ${
    phase.issue === 'none'
      ? 'No integrity issue reported.'
      : `${phase.issue} issue: ${phase.issueNote ?? `suspected ${phase.issue} issue`}`
  }`;

  const progressLabel =
    phase.progress.percent !== null
      ? `${phase.progress.percent}% implemented (${
          phase.progress.basis === 'derived-from-steps'
            ? 'derived from documented steps'
            : 'explicit lifecycle status'
        })`
      : 'implementation progress unknown';

  return (
    <button
      id={buttonId}
      ref={registerRef}
      type="button"
      onClick={onActivate}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      tabIndex={isFocused ? 0 : -1}
      aria-expanded={isExpanded}
      aria-controls={stepRegionId}
      aria-current={isCurrent ? 'step' : undefined}
      aria-describedby={integrityDescriptionId}
      aria-label={`Phase ${phase.id} ${phase.name}, ${meta.label}${
        phase.progress.percent !== null ? `, ${progressLabel}` : ''
      }${isCurrent ? ', current phase' : ''}`}
      data-phase-key={phase.key}
      data-current={isCurrent || undefined}
      data-expanded={isExpanded || undefined}
      data-history={resolved ? 'resolved' : removed ? 'removed' : undefined}
      className={`tl-phase-card glass relative flex w-full flex-col gap-1.5 rounded-xl p-3 text-left transition-colors ${
        isExpanded ? 'border-accent-ink' : 'hover:border-line-strong'
      } ${isCurrent ? 'tl-current shadow-[0_0_0_1px_var(--accent-ink)]' : ''}`}
    >
      <span id={integrityDescriptionId} className="sr-only">
        {integrityDescription}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-display text-[13px] font-semibold text-ink">{phase.id}</span>
        {isCurrent && (
          <span className="rounded border border-accent/50 bg-accent/15 px-1.5 py-px font-mono text-[9px] tracking-wider text-accent-ink uppercase">
            current
          </span>
        )}
        <span
          className={`ml-auto h-1.5 w-1.5 flex-none rounded-full ${conf.dot}`}
          title={`${conf.label}${phase.issueNote ? ` — ${phase.issueNote}` : ''}`}
        />
      </span>
      <span className="line-clamp-2 min-h-[2.2em] text-[13px] leading-snug font-medium text-ink">
        {phase.name}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-px font-mono text-[10px] whitespace-nowrap ${statusChipClass}`}
        >
          <span aria-hidden="true">{visual.icon}</span>
          {meta.label}
        </span>
        {phase.progress.percent !== null && (
          <span className="flex items-center gap-1.5" title={progressLabel}>
            <span className="h-1 w-10 overflow-hidden rounded-full bg-dim/25">
              <span
                className="block h-full rounded-full bg-current opacity-70"
                style={{ width: `${phase.progress.percent}%` }}
              />
            </span>
            <span className="font-mono text-[10px] text-faint">{phase.progress.percent}%</span>
          </span>
        )}
        {phase.issue !== 'none' && (
          <span
            className="font-mono text-[10px] text-danger"
            title={phase.issueNote ?? `suspected ${phase.issue} issue`}
          >
            ⚠ check
          </span>
        )}
      </span>
      {showProse && phase.statusText && (
        <span className="line-clamp-2 text-[11px] leading-snug text-mute">{phase.statusText}</span>
      )}
    </button>
  );
}
