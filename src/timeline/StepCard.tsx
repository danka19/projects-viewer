import type { TimelineStepModel } from './model';
import { STEP_META } from '../statusMeta';
import { LIFECYCLE_VISUALS } from './statusVisuals';

interface Props {
  step: TimelineStepModel;
  isCurrent: boolean;
  isFocused: boolean;
  onOpen: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onFocus: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
}

/** One nested step card: smaller hierarchy, same lifecycle vocabulary. */
export default function StepCard({
  step,
  isCurrent,
  isFocused,
  onOpen,
  onKeyDown,
  onFocus,
  registerRef,
}: Props) {
  const meta = STEP_META[step.status];
  const visual = LIFECYCLE_VISUALS[step.status];
  const statusTextClass = meta.text.replace(/\/\d+$/, '');

  return (
    <button
      ref={registerRef}
      type="button"
      onClick={onOpen}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      tabIndex={isFocused ? 0 : -1}
      aria-current={isCurrent ? 'step' : undefined}
      aria-label={`Step ${step.id ? `${step.id} ` : ''}${step.name}, ${meta.label}${
        isCurrent ? ', current step' : ''
      }. Evidence: ${step.evidence}. Opens read-only details.`}
      data-step-key={step.key}
      className={`tl-step-card glass flex w-full flex-1 flex-col gap-1 rounded-lg p-2.5 text-left transition-colors hover:border-line-strong ${
        isCurrent ? 'tl-current shadow-[0_0_0_1px_var(--accent-ink)]' : ''
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`inline-flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border text-[8px] leading-none ${visual.node}`}
        >
          {visual.icon}
        </span>
        {step.id && <span className="font-mono text-[10px] text-faint">{step.id}</span>}
        {isCurrent && (
          <span className="ml-auto rounded border border-accent/50 bg-accent/15 px-1 py-px font-mono text-[8px] tracking-wider text-accent-ink uppercase">
            current
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-[12px] leading-snug text-ink">{step.name}</span>
      <span className={`font-mono text-[10px] ${statusTextClass}`}>{meta.label}</span>
      {step.evidence && (
        <span className="line-clamp-1 text-[10px] leading-snug text-mute">
          {step.evidence}
        </span>
      )}
    </button>
  );
}
