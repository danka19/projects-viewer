import type { ProjectTimelineModel, TimelinePhaseModel } from './model';

/** Loading skeleton: preserves timeline height without fake statuses. */
export function TimelineSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="shimmer h-4 w-52 rounded" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-24 w-52 flex-none rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-1 w-full rounded" />
    </div>
  );
}

/** Successful load with zero phases: explain sources, never fake an axis. */
export function TimelineEmpty({ onOpenDocs }: { onOpenDocs?: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-void/30 p-8 text-center">
      <p className="text-sm font-medium text-ink">No roadmap phases detected</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-mute">
        Phases are read from “## Phase N. Name” headings with Status: lines in roadmap and
        planning documents. This project has none yet.
      </p>
      {onOpenDocs && (
        <button
          type="button"
          onClick={onOpenDocs}
          className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[11px] text-accent-ink transition-colors hover:bg-accent/20"
        >
          Open documentation
        </button>
      )}
    </div>
  );
}

export function TimelineError({
  message,
  canRetry,
  onRetry,
}: {
  message: string;
  canRetry: boolean;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-6 text-center">
      <p className="text-sm font-medium text-danger">Timeline data failed to load</p>
      <p className="mt-1.5 text-[13px] text-mute">{message}</p>
      {canRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[11px] text-accent-ink transition-colors hover:bg-accent/20"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Integrity / partial / stale disclosure rendered before the axis. */
export function TimelineWarnings({ model }: { model: ProjectTimelineModel }) {
  if (model.integrityIssues.length === 0 && model.sourceMode !== 'stale') return null;
  const shown = model.integrityIssues.slice(0, 3);
  return (
    <div role="status" className="mb-3 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2">
      <p className="font-mono text-[10px] tracking-[0.18em] text-warn uppercase">
        {model.sourceMode === 'stale' ? 'Stale data · ' : ''}
        {model.isPartial ? 'Partial timeline · ' : ''}
        {model.integrityIssues.length > 0 &&
          `${model.integrityIssues.length} data integrity ${
            model.integrityIssues.length === 1 ? 'issue' : 'issues'
          }`}
      </p>
      <ul className="mt-1 space-y-0.5">
        {shown.map((issue, i) => (
          <li key={i} className="text-[12px] leading-snug text-mute">
            {issue.message}
          </li>
        ))}
        {model.integrityIssues.length > shown.length && (
          <li className="font-mono text-[11px] text-faint">
            +{model.integrityIssues.length - shown.length} more in phase details
          </li>
        )}
      </ul>
    </div>
  );
}

/** Expanded phase without documented steps. */
export function TimelineNoSteps({
  phase,
  onOpenDetails,
}: {
  phase: TimelinePhaseModel;
  onOpenDetails: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-void/30 p-4 text-center">
      <p className="text-[13px] text-mute">No steps documented for this phase.</p>
      <p className="mt-1 font-mono text-[11px] text-faint">
        Lifecycle: {phase.status.replace('_', ' ')}
        {phase.progress.percent !== null
          ? ` · ${phase.progress.percent}% via ${
              phase.progress.basis === 'derived-from-steps' ? 'steps' : 'lifecycle status'
            }`
          : ' · progress unknown'}
      </p>
      <button
        type="button"
        onClick={onOpenDetails}
        className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[11px] text-accent-ink transition-colors hover:bg-accent/20"
      >
        Open phase details →
      </button>
    </div>
  );
}
