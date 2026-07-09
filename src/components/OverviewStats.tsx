import type { ProjectData, ProjectStatus, TabId } from '../types';
import { STATUS_META, healthColor } from '../statusMeta';
import StatusOrb from './StatusOrb';

interface Props {
  projects: ProjectData[];
  statusFilter: ProjectStatus | 'all';
  onStatusFilter: (s: ProjectStatus | 'all') => void;
  onOpenTab: (tab: TabId) => void;
}

export default function OverviewStats({
  projects,
  statusFilter,
  onStatusFilter,
  onOpenTab,
}: Props) {
  const count = (s: ProjectStatus) => projects.filter((p) => p.status === s).length;
  const nextActions = projects.reduce((n, p) => n + p.nextTasks.length, 0);
  const coverage =
    projects.length > 0
      ? Math.round(
          (projects.reduce(
            (n, p) => n + Object.values(p.summary.docsCoverage).filter(Boolean).length,
            0,
          ) /
            (projects.length * 5)) *
            100,
        )
      : 0;

  const statusCard = (status: ProjectStatus, delay: number) => (
    <MetricCard
      key={status}
      label={STATUS_META[status].label}
      value={String(count(status))}
      orb={status}
      active={statusFilter === status}
      dim={count(status) === 0}
      onClick={() => onStatusFilter(statusFilter === status ? 'all' : status)}
      delay={delay}
    />
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      <MetricCard
        label="Projects"
        value={String(projects.length)}
        active={statusFilter === 'all'}
        onClick={() => onStatusFilter('all')}
        delay={0}
      />
      {statusCard('active', 1)}
      {statusCard('needs-attention', 2)}
      {statusCard('stalled', 3)}
      {statusCard('done', 4)}
      <MetricCard
        label="Next actions"
        value={String(nextActions)}
        onClick={() => onOpenTab('tasks')}
        delay={5}
      />
      <MetricCard
        label="Docs coverage"
        value={`${coverage}%`}
        tone={healthColor(coverage)}
        onClick={() => onOpenTab('docs')}
        delay={6}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  orb,
  tone = 'text-ink',
  active = false,
  dim = false,
  onClick,
  delay = 0,
}: {
  label: string;
  value: string;
  orb?: ProjectStatus;
  tone?: string;
  active?: boolean;
  dim?: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`glass rise rounded-xl px-4 py-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-line-strong ${
        active ? 'border-accent/60' : ''
      } ${dim ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${delay * 40}ms` }}
    >
      <div className="flex items-center gap-2">
        {orb && <StatusOrb status={orb} size={7} />}
        <p className="truncate font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
          {label}
        </p>
      </div>
      <p className={`mt-1 font-display text-[22px] leading-none font-semibold ${tone}`}>
        {value}
      </p>
    </button>
  );
}
