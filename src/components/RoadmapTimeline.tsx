import { useState } from 'react';
import type { DrawerItem, PhaseItem, PhaseStep, ProjectData } from '../types';
import { CONFIDENCE_META, PHASE_META, STEP_META } from '../statusMeta';
import { auditDrawer, decisionDrawer, phaseDrawer, stepDrawer } from '../drawer';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

const DONE_STEP = new Set(['completed', 'completed_pending_approval']);

function phaseProgress(ph: PhaseItem): number | null {
  if (ph.steps.length > 0) {
    return Math.round(
      (ph.steps.filter((s) => DONE_STEP.has(s.status)).length / ph.steps.length) * 100,
    );
  }
  if (ph.status === 'completed') return 100;
  if (ph.status === 'completed_pending_approval') return 100;
  if (ph.status === 'planned') return 0;
  return null;
}

export default function RoadmapTimeline({ project, onOpenDrawer }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stepsShown, setStepsShown] = useState<Set<string>>(new Set());

  if (project.phases.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-mute">
          No roadmap phases detected. Phases are parsed from “## Phase N. Name” sections in
          roadmap and planning documents.
        </p>
      </div>
    );
  }

  const phases = project.phases;
  const groups = {
    completed: phases.filter((p) => p.status === 'completed').length,
    approval: phases.filter(
      (p) => p.status === 'completed_pending_approval' || p.status === 'pending_approval',
    ).length,
    inProgress: phases.filter(
      (p) => p.status === 'in_progress' || p.status === 'needs_review',
    ).length,
    halted: phases.filter((p) => p.status === 'blocked' || p.status === 'paused').length,
    planned: phases.filter((p) => p.status === 'planned' || p.status === 'unknown').length,
  };
  const summaryParts = [
    groups.completed > 0 && `${groups.completed} fully completed`,
    groups.approval > 0 && `${groups.approval} pending approval`,
    groups.inProgress > 0 && `${groups.inProgress} in progress`,
    groups.halted > 0 && `${groups.halted} blocked/paused`,
    groups.planned > 0 && `${groups.planned} planned`,
  ].filter(Boolean);

  function toggle(set: Set<string>, id: string, apply: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  }

  return (
    <div className="space-y-4">
      {/* Segmented progress: completed / pending approval / in progress / halted / planned */}
      <div className="glass rounded-xl p-5">
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-700/30">
          <Segment count={groups.completed} total={phases.length} className="bg-emerald-400" />
          <Segment count={groups.approval} total={phases.length} className="bg-violet-400" />
          <Segment count={groups.inProgress} total={phases.length} className="bg-sky-400" />
          <Segment count={groups.halted} total={phases.length} className="bg-amber-400" />
        </div>
        <p className="mt-3 text-sm text-slate-300">{summaryParts.join(' · ')}</p>
        <p className="mt-1 font-mono text-[10px] text-faint">
          “Pending approval” phases are finished work waiting on the human owner — they are
          deliberately not counted as fully completed.
        </p>
      </div>

      {/* Phase cards */}
      <ol className="space-y-2.5">
        {phases.map((ph) => {
          const meta = PHASE_META[ph.status];
          const conf = CONFIDENCE_META[ph.confidence];
          const isOpen = expanded.has(ph.id);
          const progress = phaseProgress(ph);
          return (
            <li key={ph.id} className="glass rounded-xl">
              {/* Collapsed row */}
              <button
                onClick={() => toggle(expanded, ph.id, setExpanded)}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left"
              >
                <span className={`h-2 w-2 flex-none rounded-full ${meta.dot}`} />
                <span className="font-display text-sm font-semibold text-ink">{ph.id}</span>
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-200">
                  {ph.name}
                </span>
                <span
                  className={`rounded border px-1.5 py-px font-mono text-[10px] whitespace-nowrap ${meta.chip}`}
                >
                  {meta.label}
                </span>
                {progress !== null && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-12 overflow-hidden rounded-full bg-slate-700/40">
                      <span
                        className={`block h-full rounded-full ${ph.status === 'completed' ? 'bg-emerald-400' : ph.status === 'completed_pending_approval' ? 'bg-violet-400' : 'bg-sky-400'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </span>
                    <span className="font-mono text-[10px] text-faint">{progress}%</span>
                  </span>
                )}
                <span
                  className={`h-1.5 w-1.5 flex-none rounded-full ${conf.dot}`}
                  title={`${conf.label}${ph.issueNote ? ` — ${ph.issueNote}` : ''}`}
                />
                <span className="hidden font-mono text-[10px] text-faint sm:inline">
                  {ph.file.split('/').pop()}
                </span>
                <span
                  className={`text-[10px] text-faint transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                >
                  ▶
                </span>
                {!isOpen && ph.statusText && (
                  <span className="w-full pl-5 line-clamp-1 text-[13px] text-mute">
                    {ph.statusText}
                  </span>
                )}
              </button>

              {/* Expanded view */}
              {isOpen && (
                <div className="border-t border-line px-4 pt-3 pb-4">
                  {/* Why? — source-of-truth transparency */}
                  <div className="rounded-lg border border-line bg-void/40 p-3.5">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
                      Why this status?
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
                      {ph.statusText || 'No Status: line was found under this phase heading.'}
                    </p>
                    <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-[12px] sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-faint">Normalized:</dt>
                        <dd className={PHASE_META[ph.status].chip.split(' ').pop()}>
                          {meta.label}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-faint">Confidence:</dt>
                        <dd className={conf.text}>{ph.confidence}</dd>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <dt className="flex-none text-faint">Rule:</dt>
                        <dd className="text-slate-300">{ph.rule}</dd>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <dt className="flex-none text-faint">Source:</dt>
                        <dd className="font-mono text-[11px] text-slate-300">
                          {ph.file}:{ph.line}
                        </dd>
                      </div>
                      {ph.issue !== 'none' && (
                        <div className="flex gap-2 sm:col-span-2">
                          <dt className="flex-none text-rose-300/80">
                            Suspected {ph.issue} issue:
                          </dt>
                          <dd className="text-rose-200/90">{ph.issueNote}</dd>
                        </div>
                      )}
                    </dl>
                    <button
                      onClick={() => onOpenDrawer(phaseDrawer(ph, project))}
                      className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-violet-300 transition-colors hover:bg-accent/20"
                    >
                      Open details →
                    </button>
                  </div>

                  {/* Steps */}
                  {ph.steps.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
                          Steps · {ph.steps.length}
                        </p>
                        <StepCounts steps={ph.steps} />
                        <button
                          onClick={() => toggle(stepsShown, ph.id, setStepsShown)}
                          className="ml-auto rounded-lg border border-line px-2.5 py-0.5 font-mono text-[10px] text-mute transition-colors hover:border-slate-500/40 hover:text-slate-300"
                        >
                          {stepsShown.has(ph.id) ? 'Hide steps' : 'Show steps'}
                        </button>
                      </div>
                      {stepsShown.has(ph.id) && (
                        <ul className="mt-2 space-y-1">
                          {ph.steps.map((s, i) => (
                            <li key={i}>
                              <button
                                onClick={() => onOpenDrawer(stepDrawer(s, project))}
                                title={s.evidence}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
                              >
                                <span
                                  className={`h-1.5 w-1.5 flex-none rounded-full ${STEP_META[s.status].dot}`}
                                />
                                {s.id && (
                                  <span className="font-mono text-[11px] text-faint">
                                    {s.id}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-300">
                                  {s.name}
                                </span>
                                <span
                                  className={`font-mono text-[10px] whitespace-nowrap ${STEP_META[s.status].text}`}
                                >
                                  {STEP_META[s.status].label}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Related decisions & audits */}
                  <RelatedItems phase={ph} project={project} onOpenDrawer={onOpenDrawer} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Segment({
  count,
  total,
  className,
}: {
  count: number;
  total: number;
  className: string;
}) {
  if (count === 0) return null;
  return (
    <span className={`h-full ${className}`} style={{ width: `${(count / total) * 100}%` }} />
  );
}

function StepCounts({ steps }: { steps: PhaseStep[] }) {
  const counts: Partial<Record<string, number>> = {};
  for (const s of steps) counts[s.status] = (counts[s.status] ?? 0) + 1;
  return (
    <span className="flex flex-wrap gap-x-2.5 gap-y-0.5">
      {(Object.keys(STEP_META) as (keyof typeof STEP_META)[]).map((status) =>
        counts[status] ? (
          <span
            key={status}
            className={`inline-flex items-center gap-1 font-mono text-[10px] ${STEP_META[status].text}`}
          >
            <span className={`h-1 w-1 rounded-full ${STEP_META[status].dot}`} />
            {counts[status]} {STEP_META[status].label}
          </span>
        ) : null,
      )}
    </span>
  );
}

function RelatedItems({
  phase,
  project,
  onOpenDrawer,
}: {
  phase: PhaseItem;
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}) {
  const marker = `phase ${phase.id}`;
  const decisions = project.decisions
    .filter((d) => d.text.toLowerCase().includes(marker))
    .slice(0, 3);
  const audits = project.audits
    .filter((a) => a.title.toLowerCase().includes(phase.id) || a.file === phase.file)
    .slice(0, 3);
  if (decisions.length === 0 && audits.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">Related</p>
      <ul className="mt-1.5 space-y-1">
        {decisions.map((d, i) => (
          <li key={`d${i}`}>
            <button
              onClick={() => onOpenDrawer(decisionDrawer(d, project))}
              className="flex w-full items-baseline gap-2.5 rounded-lg px-2.5 py-1 text-left transition-colors hover:bg-void/40"
            >
              <span className="flex-none font-mono text-[10px] text-violet-300/80">
                {d.date ?? 'decision'}
              </span>
              <span className="line-clamp-1 min-w-0 text-[13px] text-slate-300">{d.text}</span>
            </button>
          </li>
        ))}
        {audits.map((a, i) => (
          <li key={`a${i}`}>
            <button
              onClick={() => onOpenDrawer(auditDrawer(a, project))}
              className="flex w-full items-baseline gap-2.5 rounded-lg px-2.5 py-1 text-left transition-colors hover:bg-void/40"
            >
              <span className="flex-none font-mono text-[10px] text-sky-300/80">audit</span>
              <span className="line-clamp-1 min-w-0 text-[13px] text-slate-300">{a.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
