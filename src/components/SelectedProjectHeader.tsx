import type { DrawerItem, ProjectData, TabId } from '../types';
import { daysAgo, healthColor, healthStroke } from '../statusMeta';
import { blockerDrawer, decisionDrawer, taskDrawer } from '../drawer';
import StatusBadge from './StatusBadge';
import StatusOrb from './StatusOrb';

interface Props {
  project: ProjectData;
  onOpenTab: (tab: TabId) => void;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function SelectedProjectHeader({ project, onOpenTab, onOpenDrawer }: Props) {
  const s = project.summary;
  const cov = s.docsCoverage;
  const covCount = Object.values(cov).filter(Boolean).length;

  const nextItem = project.nextTasks.find((t) => t.text === s.nextAction);
  const blockerItem = project.blockers.find((b) => b.text === s.mainBlocker);
  const decisionItem = project.decisions.find((d) => d.text === s.recentDecision);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusOrb status={project.status} size={13} />
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          {project.name}
        </h2>
        <StatusBadge status={project.status} />
        <span className="font-mono text-[11px] text-faint">
          updated {daysAgo(project.lastModified) || '—'}
        </span>
        <div className="ml-auto">
          <HealthRing score={s.healthScore} />
        </div>
      </div>
      <p className="mt-1.5 font-mono text-xs break-all text-faint">{project.path}</p>
      {project.error && <p className="mt-2 text-sm text-rose-400">{project.error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryTile
          label="Current phase"
          value={s.currentPhase ?? 'No active phase detected'}
          muted={!s.currentPhase}
          onClick={() => onOpenTab('roadmap')}
        />
        <SummaryTile
          label="Next action"
          value={s.nextAction ?? 'No next action detected'}
          muted={!s.nextAction}
          onClick={
            nextItem
              ? () => onOpenDrawer(taskDrawer(nextItem, project, 'Next action'))
              : () => onOpenTab('tasks')
          }
        />
        <SummaryTile
          label="Main real blocker"
          value={s.mainBlocker ?? 'No real blockers'}
          muted={!s.mainBlocker}
          tone={s.mainBlocker ? 'text-rose-200' : undefined}
          onClick={
            blockerItem
              ? () => onOpenDrawer(blockerDrawer(blockerItem, project))
              : () => onOpenTab('tasks')
          }
        />
        <SummaryTile
          label="Recent decision"
          value={s.recentDecision ?? 'No decisions recorded'}
          muted={!s.recentDecision}
          onClick={
            decisionItem
              ? () => onOpenDrawer(decisionDrawer(decisionItem, project))
              : () => onOpenTab('decisions')
          }
        />
        <SummaryTile
          label="Recent change"
          value={s.recentChange ?? '—'}
          muted={!s.recentChange}
          mono
          onClick={() => onOpenTab('activity')}
        />
        <button
          onClick={() => onOpenTab('docs')}
          className="rounded-lg border border-line bg-void/30 px-3.5 py-2.5 text-left transition-colors hover:border-slate-500/40"
        >
          <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
            Doc coverage · {covCount}/5
          </p>
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            <CovDot label="README" ok={cov.readme} />
            <CovDot label="CLAUDE" ok={cov.claude} />
            <CovDot label="ROADMAP" ok={cov.roadmap} />
            <CovDot label="SPECS" ok={cov.sddOrSpecs} />
            <CovDot label="AUDITS" ok={cov.audits} />
          </span>
        </button>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  muted = false,
  mono = false,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  muted?: boolean;
  mono?: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-line bg-void/30 px-3.5 py-2.5 text-left transition-colors hover:border-slate-500/40"
    >
      <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{label}</p>
      <p
        className={`mt-1 line-clamp-2 text-[13px] leading-snug ${
          muted ? 'text-faint' : (tone ?? 'text-slate-200')
        } ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </p>
    </button>
  );
}

function CovDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label} ${ok ? 'found' : 'missing'}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok
            ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]'
            : 'border border-rose-400/50'
        }`}
      />
      <span className={`font-mono text-[10px] ${ok ? 'text-slate-300' : 'text-rose-300/80'}`}>
        {label}
      </span>
    </span>
  );
}

function HealthRing({ score }: { score: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative h-14 w-14"
      role="img"
      aria-label={`Health score ${score} out of 100`}
      title="Health: doc coverage, blockers, staleness, next-action clarity"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgb(148 163 184 / 0.15)" strokeWidth="3.5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={healthStroke(score)}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          style={{ filter: `drop-shadow(0 0 4px ${healthStroke(score)}66)` }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-sm font-bold ${healthColor(score)}`}
      >
        {score}
      </span>
    </div>
  );
}
