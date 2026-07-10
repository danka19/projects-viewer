import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DrawerItem, ProjectData } from '../types';
import { phaseDrawer, stepDrawer } from '../drawer';
import { buildProjectTimelineModel } from './model';
import type { ProjectTimelineModel, TimelinePhaseModel, TimelineSourceMode } from './model';
import {
  betweenPhasesAnchor,
  focusItem,
  initTimelineViewState,
  reconcileTimelineViewState,
  togglePhase,
} from './state';
import type { TimelineViewState } from './state';
import { LIFECYCLE_VISUALS } from './statusVisuals';
import { PHASE_META, formatDate } from '../statusMeta';
import PhaseCard from './PhaseCard';
import StepCard from './StepCard';
import TimelineLegend from './TimelineLegend';
import {
  TimelineEmpty,
  TimelineError,
  TimelineNoSteps,
  TimelineSkeleton,
  TimelineWarnings,
} from './TimelineFallback';

interface Props {
  project: ProjectData;
  generatedAt: string;
  sourceMode: TimelineSourceMode;
  /** Background refresh while a model is already visible. */
  refreshing?: boolean;
  /** First load with no data yet. */
  initialLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenDrawer: (item: DrawerItem) => void;
  onOpenDocs?: () => void;
}

const COMPACT_THRESHOLD = 12;

function domId(prefix: string, key: string): string {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function ProjectTimeline({
  project,
  generatedAt,
  sourceMode,
  refreshing = false,
  initialLoading = false,
  error = null,
  onRetry,
  onOpenDrawer,
  onOpenDocs,
}: Props) {
  const model = useMemo(
    () => buildProjectTimelineModel(project, { generatedAt, sourceMode }),
    [project, generatedAt, sourceMode],
  );

  const [view, setView] = useState<TimelineViewState>(() => initTimelineViewState(model));
  useEffect(() => {
    setView((prev) => reconcileTimelineViewState(prev, model));
  }, [model]);

  const [announcement, setAnnouncement] = useState('');
  const [currentOffscreen, setCurrentOffscreen] = useState(false);

  const phaseViewportRef = useRef<HTMLDivElement>(null);
  const stepViewportRef = useRef<HTMLDivElement>(null);
  const phaseButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const stepButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastCenteredRef = useRef<string>('');

  const expandedPhase: TimelinePhaseModel | null =
    model.phases.find((ph) => ph.key === view.expandedPhaseKey) ?? null;
  const stepRegionId = expandedPhase ? domId('tl-steps', expandedPhase.key) : 'tl-steps-none';

  const centerElement = useCallback((container: HTMLElement | null, el: HTMLElement | null) => {
    if (!container || !el) return;
    const left = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2;
    container.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const centerCurrent = useCallback(() => {
    const container = phaseViewportRef.current;
    if (!container) return;
    if (model.currentPhaseId) {
      centerElement(container, phaseButtonRefs.current.get(model.currentPhaseId) ?? null);
      return;
    }
    const anchor = betweenPhasesAnchor(model);
    const left = anchor.lastResolvedKey
      ? phaseButtonRefs.current.get(anchor.lastResolvedKey)
      : null;
    const right = anchor.firstFutureKey
      ? phaseButtonRefs.current.get(anchor.firstFutureKey)
      : null;
    if (left && right) {
      const mid =
        (left.offsetLeft + left.offsetWidth / 2 + right.offsetLeft + right.offsetWidth / 2) / 2;
      container.scrollTo({
        left: mid - container.clientWidth / 2,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    } else if (left || right) {
      centerElement(container, left ?? right ?? null);
    }
  }, [centerElement, model]);

  // Center only on project change or current-phase change — never on
  // ordinary refresh, so manual scrolling is preserved.
  useEffect(() => {
    const trigger = `${model.projectId}|${model.currentPhaseId ?? 'none'}`;
    if (lastCenteredRef.current === trigger) return;
    lastCenteredRef.current = trigger;
    centerCurrent();
  }, [model.projectId, model.currentPhaseId, centerCurrent]);

  // Track whether the explicit current phase is outside the visible area.
  useEffect(() => {
    const container = phaseViewportRef.current;
    if (!container || !model.currentPhaseId) {
      setCurrentOffscreen(false);
      return;
    }
    function check() {
      const el = model.currentPhaseId
        ? phaseButtonRefs.current.get(model.currentPhaseId)
        : undefined;
      if (!el || !container) return;
      const start = container.scrollLeft;
      const end = start + container.clientWidth;
      setCurrentOffscreen(el.offsetLeft + el.offsetWidth < start + 24 || el.offsetLeft > end - 24);
    }
    check();
    container.addEventListener('scroll', check, { passive: true });
    return () => container.removeEventListener('scroll', check);
  }, [model.currentPhaseId, model.revision]);

  const activatePhase = useCallback(
    (phase: TimelinePhaseModel) => {
      setView((prev) => {
        const next = togglePhase(prev, phase.key);
        setAnnouncement(
          next.expandedPhaseKey === phase.key
            ? `Phase ${phase.id} ${phase.name} expanded: ${
                phase.steps.length > 0
                  ? `${phase.steps.length} step${phase.steps.length === 1 ? '' : 's'} shown`
                  : 'no steps documented'
              }`
            : `Phase ${phase.id} ${phase.name} collapsed`,
        );
        return next;
      });
    },
    [setView],
  );

  const focusPhaseByIndex = useCallback(
    (index: number) => {
      const phase = model.phases[Math.max(0, Math.min(model.phases.length - 1, index))];
      if (!phase) return;
      setView((prev) => focusItem(prev, 'phase', phase.key));
      const el = phaseButtonRefs.current.get(phase.key);
      el?.focus();
      centerElement(phaseViewportRef.current, el ?? null);
    },
    [model.phases, centerElement],
  );

  const focusStepByIndex = useCallback(
    (phase: TimelinePhaseModel, index: number) => {
      const step = phase.steps[Math.max(0, Math.min(phase.steps.length - 1, index))];
      if (!step) return;
      setView((prev) => focusItem(prev, 'step', step.key));
      const el = stepButtonRefs.current.get(step.key);
      el?.focus();
      centerElement(stepViewportRef.current, el ?? null);
    },
    [centerElement],
  );

  function onPhaseKeyDown(event: React.KeyboardEvent, phase: TimelinePhaseModel, index: number) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        focusPhaseByIndex(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusPhaseByIndex(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        focusPhaseByIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusPhaseByIndex(model.phases.length - 1);
        break;
      case 'Escape':
        if (view.expandedPhaseKey) {
          event.preventDefault();
          setView((prev) => ({ ...prev, expandedPhaseKey: null }));
          setAnnouncement(`Phase ${phase.id} ${phase.name} collapsed`);
        }
        break;
      case 'ArrowDown':
        if (view.expandedPhaseKey === phase.key && phase.steps.length > 0) {
          event.preventDefault();
          focusStepByIndex(phase, 0);
        }
        break;
      default:
        break;
    }
  }

  function onStepKeyDown(event: React.KeyboardEvent, phase: TimelinePhaseModel, index: number) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        focusStepByIndex(phase, index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusStepByIndex(phase, index + 1);
        break;
      case 'Home':
        event.preventDefault();
        focusStepByIndex(phase, 0);
        break;
      case 'End':
        event.preventDefault();
        focusStepByIndex(phase, phase.steps.length - 1);
        break;
      case 'ArrowUp': {
        event.preventDefault();
        const phaseIndex = model.phases.findIndex((ph) => ph.key === phase.key);
        focusPhaseByIndex(phaseIndex);
        break;
      }
      case 'Escape':
        event.preventDefault();
        setView((prev) => ({ ...prev, expandedPhaseKey: null }));
        setAnnouncement(`Phase ${phase.id} ${phase.name} collapsed`);
        focusPhaseByIndex(model.phases.findIndex((ph) => ph.key === phase.key));
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------ render paths

  if (initialLoading) {
    return (
      <section aria-label={`Project timeline for ${project.name}`} aria-busy="true" className="glass rounded-xl p-4">
        <p className="sr-only" role="status">
          Loading project timeline
        </p>
        <TimelineSkeleton />
      </section>
    );
  }

  if (error && model.phases.length === 0) {
    return (
      <section aria-label={`Project timeline for ${project.name}`} className="glass rounded-xl p-4">
        <TimelineError message={error} canRetry={sourceMode === 'live'} onRetry={onRetry} />
      </section>
    );
  }

  if (model.phases.length === 0) {
    return (
      <section aria-label={`Project timeline for ${project.name}`} className="glass rounded-xl p-4">
        <TimelineEmpty onOpenDocs={onOpenDocs} />
      </section>
    );
  }

  const compact = model.phases.length > COMPACT_THRESHOLD;
  const focusedPhaseKey =
    view.focused?.kind === 'phase' && model.phases.some((ph) => ph.key === view.focused?.key)
      ? view.focused.key
      : (model.currentPhaseId ?? model.phases[0].key);

  const summaryParts = lifecycleSummary(model);

  return (
    <section
      aria-label={`Project timeline for ${project.name}`}
      aria-busy={refreshing || undefined}
      className="glass rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <h3 className="font-display text-sm font-semibold tracking-tight text-ink">
          Project timeline
        </h3>
        <p className="min-w-0 flex-1 truncate text-[12px] text-mute" title={summaryParts.join(' · ')}>
          {summaryParts.join(' · ')}
        </p>
        <span className="font-mono text-[10px] text-faint" title="Implementation progress basis: mean of phases with known progress">
          {model.progress.percent !== null
            ? `${model.progress.percent}% implemented${
                model.progress.unknownPhases > 0
                  ? ` · ${model.progress.unknownPhases} without evidence`
                  : ''
              }`
            : 'progress evidence unavailable'}
        </span>
        <span className="font-mono text-[10px] text-faint">
          {sourceMode} · {formatDate(generatedAt)}
        </span>
        {refreshing && (
          <span className="font-mono text-[10px] text-info" role="status">
            refreshing…
          </span>
        )}
        {model.currentPhaseId && currentOffscreen && (
          <button
            type="button"
            onClick={centerCurrent}
            className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent-ink transition-colors hover:bg-accent/20"
          >
            Jump to current
          </button>
        )}
      </div>

      {!model.currentPhaseId && (
        <p className="mt-1.5 font-mono text-[11px] text-warn">
          {model.integrityIssues.some((i) => i.kind === 'multiple-current-phases')
            ? 'Current phase ambiguous — see integrity issues below'
            : 'No active phase — project is between phases'}
        </p>
      )}

      <div className="mt-3">
        <TimelineWarnings model={model} />
      </div>

      {/* Phase axis */}
      <div
        ref={phaseViewportRef}
        className="tl-viewport scroll-slim relative -mx-1 overflow-x-auto px-1 pb-1"
        aria-label="Phase timeline, scrolls horizontally"
        tabIndex={-1}
      >
        <ol className="tl-track flex items-stretch gap-0" aria-label={`${model.phases.length} phases`}>
          {model.phases.map((ph, index) => {
            const nextPh = model.phases[index + 1];
            const isCurrent = model.currentPhaseId === ph.key;
            const isExpanded = view.expandedPhaseKey === ph.key;
            return (
              <li key={ph.key} className="tl-item flex flex-none flex-col px-1.5">
                <PhaseCard
                  phase={ph}
                  isCurrent={isCurrent}
                  isExpanded={isExpanded}
                  isFocused={focusedPhaseKey === ph.key}
                  compact={compact}
                  stepRegionId={stepRegionId}
                  buttonId={domId('tl-phase', ph.key)}
                  onActivate={() => activatePhase(ph)}
                  onKeyDown={(event) => onPhaseKeyDown(event, ph, index)}
                  onFocus={() => setView((prev) => focusItem(prev, 'phase', ph.key))}
                  registerRef={(el) => {
                    if (el) phaseButtonRefs.current.set(ph.key, el);
                    else phaseButtonRefs.current.delete(ph.key);
                  }}
                />
                <div className="mt-2.5 flex h-4 items-center" aria-hidden="true">
                  <span
                    className={`tl-seg h-0 flex-1 border-t-2 ${
                      index === 0 ? 'border-transparent' : segClass(ph)
                    }`}
                  />
                  <span
                    className={`inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[9px] leading-none ${LIFECYCLE_VISUALS[ph.status].node} ${
                      isCurrent ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel)]' : ''
                    }`}
                  >
                    {LIFECYCLE_VISUALS[ph.status].icon}
                  </span>
                  <span
                    className={`tl-seg h-0 flex-1 border-t-2 ${
                      !nextPh ? 'border-transparent' : segClass(nextPh)
                    }`}
                  />
                </div>
                {/* Expansion bridge uses selection accent, not lifecycle color. */}
                <div
                  aria-hidden="true"
                  className={`mx-auto h-3 w-0 border-l-2 ${
                    isExpanded ? 'border-accent/70' : 'border-transparent'
                  }`}
                />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Nested step region */}
      {expandedPhase && (
        <div
          id={stepRegionId}
          role="region"
          aria-label={`Steps of phase ${expandedPhase.id} ${expandedPhase.name}`}
          className="mt-1 rounded-xl border border-accent/30 bg-void/20 p-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] tracking-[0.18em] text-accent-ink uppercase">
              Phase {expandedPhase.id} — {expandedPhase.name}
            </p>
            <span className="font-mono text-[10px] text-faint">
              {expandedPhase.steps.length > 0
                ? `${expandedPhase.steps.length} step${expandedPhase.steps.length === 1 ? '' : 's'}`
                : 'no steps'}
            </span>
            <button
              type="button"
              onClick={() => onOpenDrawer(phaseDrawer(expandedPhase.raw, project))}
              className="ml-auto rounded-lg border border-line px-2.5 py-0.5 font-mono text-[10px] text-mute transition-colors hover:border-line-strong hover:text-ink"
            >
              Phase details →
            </button>
          </div>
          {expandedPhase.steps.length === 0 ? (
            <div className="mt-2.5">
              <TimelineNoSteps
                phase={expandedPhase}
                onOpenDetails={() => onOpenDrawer(phaseDrawer(expandedPhase.raw, project))}
              />
            </div>
          ) : (
            <div
              ref={stepViewportRef}
              className="tl-viewport scroll-slim mt-2.5 overflow-x-auto pb-1"
              aria-label="Step timeline, scrolls horizontally"
              tabIndex={-1}
            >
              <ol className="flex items-stretch gap-2.5">
                {expandedPhase.steps.map((s, index) => (
                  <li key={s.key} className="flex-none">
                    <StepCard
                      step={s}
                      isCurrent={expandedPhase.currentStepId === s.key}
                      isFocused={
                        view.focused?.kind === 'step'
                          ? view.focused.key === s.key
                          : index === 0
                      }
                      onOpen={() => onOpenDrawer(stepDrawer(s.raw, project))}
                      onKeyDown={(event) => onStepKeyDown(event, expandedPhase, index)}
                      onFocus={() => setView((prev) => focusItem(prev, 'step', s.key))}
                      registerRef={(el) => {
                        if (el) stepButtonRefs.current.set(s.key, el);
                        else stepButtonRefs.current.delete(s.key);
                      }}
                    />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <TimelineLegend model={model} />

      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function segClass(ph: TimelinePhaseModel): string {
  const visual = LIFECYCLE_VISUALS[ph.status];
  const style =
    visual.connector === 'solid'
      ? 'border-solid'
      : visual.connector === 'dashed'
        ? 'border-dashed'
        : 'border-dotted';
  return `${style} ${visual.connectorClass}`;
}

function lifecycleSummary(model: ProjectTimelineModel): string[] {
  const counts = new Map<string, number>();
  for (const ph of model.phases) counts.set(ph.status, (counts.get(ph.status) ?? 0) + 1);
  const label = (status: string) => PHASE_META[status as keyof typeof PHASE_META].label;
  const order = [
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
  return order
    .filter((status) => (counts.get(status) ?? 0) > 0)
    .map((status) => `${counts.get(status)} ${label(status)}`);
}
