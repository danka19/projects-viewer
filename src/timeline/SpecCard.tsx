import type { RawSpecWorkItem } from '../types';

interface Props {
  spec: RawSpecWorkItem;
  onOpenDetails: () => void;
  onOpenSpecs?: () => void;
}

function progress(spec: RawSpecWorkItem): string {
  if (spec.tasks.length === 0) return 'Progress unknown · No tasks documented';
  const completed = spec.tasks.filter((task) => task.status === 'closed').length;
  return `${completed}/${spec.tasks.length} tasks`;
}

export default function SpecCard({ spec, onOpenDetails, onOpenSpecs }: Props) {
  const ownership = spec.roadmapStepId
    ? `Step ${spec.roadmapStepId}`
    : spec.roadmapPhaseId
      ? `Phase ${spec.roadmapPhaseId}`
      : 'Unassigned';
  return (
    <article
      aria-label={`Specification ${spec.name}`}
      className="tl-spec-card rounded-lg border border-line bg-void/30 p-2.5"
    >
      <button
        type="button"
        className="block w-full text-left"
        aria-label={`Open specification ${spec.name} details`}
        onClick={onOpenDetails}
      >
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] tracking-wider text-accent-ink uppercase">spec</span>
          <span className="truncate font-mono text-[9px] text-faint">{ownership}</span>
          <span className="ml-auto rounded border border-line px-1.5 py-px font-mono text-[9px] text-mute">
            {spec.lifecycleStatus}
          </span>
        </span>
        <span className="mt-1 block line-clamp-2 text-[12px] leading-snug text-ink">{spec.name}</span>
        <span className="mt-1 block font-mono text-[10px] text-mute">{progress(spec)}</span>
      </button>
      {onOpenSpecs && (
        <button
          type="button"
          className="mt-2 rounded border border-accent/40 px-2 py-1 font-mono text-[9px] text-accent-ink transition-colors hover:bg-accent/10"
          onClick={onOpenSpecs}
          aria-label={`Open ${spec.name} in Specs`}
        >
          Open in Specs →
        </button>
      )}
    </article>
  );
}
