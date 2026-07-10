import { useMemo } from 'react';
import type { DrawerItem, ProjectData, TabId } from '../types';
import { daysAgo } from '../statusMeta';
import { blockerDrawer, taskDrawer } from '../drawer';
import { buildProjectTimelineModel } from '../timeline/model';
import StatusBadge from './StatusBadge';
import StatusOrb from './StatusOrb';

interface Props {
  project: ProjectData;
  generatedAt: string;
  liveMode: boolean;
  onOpenTab: (tab: TabId) => void;
  onOpenDrawer: (item: DrawerItem) => void;
}

/**
 * Compact trusted state header: one lifecycle sentence, one next action, one
 * blocker/gate, freshness, and integrity disclosure. No repeated tile prose
 * and no unexplained health score.
 */
export default function SelectedProjectHeader({
  project,
  generatedAt,
  liveMode,
  onOpenTab,
  onOpenDrawer,
}: Props) {
  const model = useMemo(
    () =>
      buildProjectTimelineModel(project, {
        generatedAt,
        sourceMode: liveMode ? 'live' : 'static',
      }),
    [project, generatedAt, liveMode],
  );

  const lifecycle = lifecycleSentence(project, model.currentPhaseId !== null);
  const nextItem =
    project.nextTasks.find((t) => t.text === project.summary.nextAction) ??
    project.nextTasks[0] ??
    null;
  const blockerItem = project.signalGroups.realBlockers[0] ?? null;
  const gateItem = blockerItem ? null : (project.signalGroups.approvalGates[0] ?? null);
  const issueCount = model.integrityIssues.length;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusOrb status={project.status} size={12} />
        <h2 className="font-display text-lg leading-tight font-semibold tracking-tight text-ink">
          {project.name}
        </h2>
        <StatusBadge status={project.status} />
        <span className="font-mono text-[11px] text-faint">
          updated {daysAgo(project.lastModified) || '—'}
        </span>
        {issueCount > 0 && (
          <button
            type="button"
            onClick={() => onOpenTab('status')}
            title="Timeline data integrity issues — details in Status"
            className="rounded border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[10px] text-warn transition-colors hover:border-warn"
          >
            ⚠ {issueCount} data {issueCount === 1 ? 'issue' : 'issues'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenTab('knowledge')}
          title={project.path}
          className="ml-auto max-w-[40%] truncate rounded border border-line px-2 py-0.5 font-mono text-[10px] text-faint transition-colors hover:text-ink"
        >
          {project.path}
        </button>
      </div>

      <p className="mt-2 text-[13px] leading-snug text-mute">{lifecycle}</p>
      {project.error && <p className="mt-1.5 text-sm text-danger">{project.error}</p>}

      {(nextItem || blockerItem || gateItem) && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-2">
          {nextItem && (
            <button
              type="button"
              onClick={() =>
                onOpenDrawer(taskDrawer(nextItem, project, 'Next action', 'next-action'))
              }
              className="rounded-lg border border-line bg-void/30 px-3 py-2 text-left transition-colors hover:border-line-strong"
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-accent-ink uppercase">
                Next action
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink">
                {nextItem.text}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-faint">
                {nextItem.file}:{nextItem.line}
              </p>
            </button>
          )}
          {(blockerItem ?? gateItem) && (
            <button
              type="button"
              onClick={() => onOpenDrawer(blockerDrawer((blockerItem ?? gateItem)!, project))}
              className="rounded-lg border border-line bg-void/30 px-3 py-2 text-left transition-colors hover:border-line-strong"
            >
              <p
                className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                  blockerItem ? 'text-danger' : 'text-gate'
                }`}
              >
                {blockerItem ? 'Real blocker' : 'Approval gate'}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink">
                {(blockerItem ?? gateItem)!.text}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-faint">
                {(blockerItem ?? gateItem)!.file}:{(blockerItem ?? gateItem)!.line}
              </p>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function lifecycleSentence(project: ProjectData, hasCurrent: boolean): string {
  const phases = project.phases;
  if (phases.length === 0) {
    return 'No roadmap phases documented — lifecycle position unknown.';
  }
  const parts: string[] = [];
  const resolved = phases.filter((ph) => ph.status === 'closed' || ph.status === 'accepted');
  const lastResolved = resolved.at(-1);
  if (lastResolved) parts.push(`Phase ${lastResolved.id} ${lastResolved.status}`);

  if (hasCurrent && project.summary.currentPhase) {
    parts.push(`phase ${project.summary.currentPhase} is in progress`);
  } else {
    const pending = phases.filter((ph) => ph.status === 'pending_acceptance');
    if (pending.length > 0) {
      parts.push(
        `${pending.length} phase${pending.length === 1 ? '' : 's'} awaiting owner acceptance`,
      );
    } else {
      parts.push('no active phase');
    }
  }

  const nextPlanned = phases.find(
    (ph) => ph.status === 'planned' || ph.status === 'ready' || ph.status === 'draft',
  );
  if (nextPlanned) parts.push(`next planned: Phase ${nextPlanned.id} ${nextPlanned.name}`);

  const sentence = parts.join(' · ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}
