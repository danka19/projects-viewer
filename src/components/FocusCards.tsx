import type { DrawerItem, ProjectData, TabId } from '../types';
import { blockerDrawer, decisionDrawer, markerDrawer, taskDrawer } from '../drawer';

interface Props {
  project: ProjectData;
  onOpenTab: (tab: TabId) => void;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function FocusCards({ project, onOpenTab, onOpenDrawer }: Props) {
  const next = project.nextTasks.slice(0, 3);
  const groups = project.signalGroups;
  const realBlockers = groups.realBlockers.slice(0, 3);
  const approvalGates = groups.approvalGates.slice(0, 3);
  const needsReview = groups.needsReview.slice(0, 3);
  const pausedDeferred = groups.pausedDeferred.slice(0, 3);
  const attention = project.markers
    .filter((m) => ['TODO', 'FIXME', 'BUG'].includes(m.type))
    .slice(0, 3);
  const decisions = project.decisions.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <FocusCard
        title="Next up"
        accent="text-violet-300"
        total={project.nextTasks.length}
        empty="No next actions detected."
        items={next.map((t) => ({
          text: t.text,
          onClick: () => onOpenDrawer(taskDrawer(t, project, 'Next action')),
        }))}
        onViewAll={() => onOpenTab('tasks')}
      />
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-[11px] font-medium tracking-[0.18em] text-mute uppercase">
            Work constraints
          </h3>
          <span className="font-mono text-[10px] text-faint">
            filtered {project.blockedGatedDiagnostics.summary.filteredOutCount} rule/template candidates
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FocusCard
            title="Real blockers"
            tooltip="Actual inability to continue: blocked, failing, missing required data, unavailable dependency, or an acceptance gap that prevents completion."
            accent={realBlockers.length > 0 ? 'text-rose-300' : 'text-mute'}
            total={groups.realBlockers.length}
            empty="No real blockers detected."
            items={realBlockers.map((b) => ({
              text: b.text,
              onClick: () => onOpenDrawer(blockerDrawer(b, project)),
            }))}
            onViewAll={() => onOpenTab('tasks')}
          />
          <FocusCard
            title="Approval gates"
            tooltip="Normal owner/SDD approval gates: pending approval, merge approval, or completed work waiting for approval."
            accent={approvalGates.length > 0 ? 'text-violet-300' : 'text-mute'}
            total={groups.approvalGates.length}
            empty="No approval gates detected."
            items={approvalGates.map((b) => ({
              text: b.text,
              onClick: () => onOpenDrawer(blockerDrawer(b, project)),
            }))}
            onViewAll={() => onOpenTab('tasks')}
          />
          <FocusCard
            title="Needs review"
            tooltip="Review or validation work: needs review, pending review, needs verification, requires validation, or final review."
            accent={needsReview.length > 0 ? 'text-orange-300' : 'text-mute'}
            total={groups.needsReview.length}
            empty="No review items detected."
            items={needsReview.map((b) => ({
              text: b.text,
              onClick: () => onOpenDrawer(blockerDrawer(b, project)),
            }))}
            onViewAll={() => onOpenTab('tasks')}
          />
          <FocusCard
            title="Paused / deferred"
            tooltip="Work intentionally paused, on hold, deferred, planned later, or marked resume later."
            accent={pausedDeferred.length > 0 ? 'text-slate-300' : 'text-mute'}
            total={groups.pausedDeferred.length}
            empty="No paused or deferred items detected."
            items={pausedDeferred.map((b) => ({
              text: b.text,
              onClick: () => onOpenDrawer(blockerDrawer(b, project)),
            }))}
            onViewAll={() => onOpenTab('tasks')}
          />
        </div>
      </div>
      <FocusCard
        title="Needs attention"
        accent={attention.length > 0 ? 'text-amber-300' : 'text-mute'}
        total={
          (project.stats.markerCounts.TODO ?? 0) +
          (project.stats.markerCounts.FIXME ?? 0) +
          (project.stats.markerCounts.BUG ?? 0)
        }
        empty="No TODO / FIXME / BUG markers."
        items={attention.map((m) => ({
          text: `${m.type}: ${m.text}`,
          onClick: () => onOpenDrawer(markerDrawer(m, project)),
        }))}
        onViewAll={() => onOpenTab('tasks')}
      />
      <FocusCard
        title="Recent decisions"
        accent="text-sky-300"
        total={project.decisions.length}
        empty="No decisions recorded."
        items={decisions.map((d) => ({
          text: d.date ? `${d.date} — ${d.text}` : d.text,
          onClick: () => onOpenDrawer(decisionDrawer(d, project)),
        }))}
        onViewAll={() => onOpenTab('decisions')}
      />
    </div>
  );
}

function FocusCard({
  title,
  tooltip,
  accent,
  total,
  empty,
  items,
  onViewAll,
}: {
  title: string;
  tooltip?: string;
  accent: string;
  total: number;
  empty: string;
  items: { text: string; onClick: () => void }[];
  onViewAll: () => void;
}) {
  return (
    <section className="glass rounded-xl p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3
          className="font-mono text-[11px] font-medium tracking-[0.18em] text-mute uppercase"
          title={tooltip}
        >
          {title}{' '}
          <span className={`ml-1 font-display text-sm tracking-normal ${accent}`}>{total}</span>
        </h3>
        {total > 0 && (
          <button
            onClick={onViewAll}
            className="rounded-lg border border-line px-2.5 py-1 font-mono text-[10px] text-mute transition-colors hover:border-accent/40 hover:text-violet-300"
          >
            View all →
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <div className="mt-3 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
          <p className="text-sm text-faint">{empty}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i}>
              <button
                onClick={it.onClick}
                className="w-full rounded-lg border border-line bg-void/30 px-3 py-2 text-left text-sm leading-snug text-slate-300 transition-colors hover:border-slate-500/40 hover:text-ink"
              >
                <span className="line-clamp-2">{it.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
