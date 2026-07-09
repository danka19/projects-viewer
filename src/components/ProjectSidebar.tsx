import type { ProjectData, ProjectStatus } from '../types';
import { STATUS_META, STATUS_ORDER, daysAgo, healthColor } from '../statusMeta';
import StatusOrb from './StatusOrb';

interface Props {
  projects: ProjectData[];
  visible: ProjectData[];
  selectedPath: string | null;
  statusFilter: ProjectStatus | 'all';
  query: string;
  onSelect: (path: string) => void;
  onStatusFilter: (s: ProjectStatus | 'all') => void;
  onClear: () => void;
}

export default function ProjectSidebar({
  projects,
  visible,
  selectedPath,
  statusFilter,
  query,
  onSelect,
  onStatusFilter,
  onClear,
}: Props) {
  const counts: Partial<Record<ProjectStatus, number>> = {};
  for (const p of projects) counts[p.status] = (counts[p.status] ?? 0) + 1;

  return (
    <aside className="lg:sticky lg:top-[70px]">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <FilterChip
          label={`All ${projects.length}`}
          active={statusFilter === 'all'}
          onClick={() => onStatusFilter('all')}
        />
        {STATUS_ORDER.map((status) =>
          counts[status] ? (
            <FilterChip
              key={status}
              status={status}
              label={`${STATUS_META[status].label} ${counts[status]}`}
              active={statusFilter === status}
              onClick={() => onStatusFilter(statusFilter === status ? 'all' : status)}
            />
          ) : null,
        )}
      </div>

      <div className="scroll-slim space-y-2.5 lg:max-h-[calc(100vh-190px)] lg:overflow-y-auto lg:pr-1 lg:pb-2">
        {visible.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-sm text-mute">
              No projects match{query ? ` “${query}”` : ' this filter'}.
            </p>
            <button
              onClick={onClear}
              className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[11px] text-accent-ink transition-colors hover:bg-accent/20"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          visible.map((p, i) => (
            <div key={p.path} className="rise" style={{ animationDelay: `${i * 40}ms` }}>
              <SidebarCard
                project={p}
                selected={selectedPath === p.path}
                onSelect={() => onSelect(p.path)}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function SidebarCard({
  project,
  selected,
  onSelect,
}: {
  project: ProjectData;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = STATUS_META[project.status];
  const health = project.summary.healthScore;
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`glass w-full rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-px ${
        selected
          ? 'border-accent/60'
          : 'hover:border-line-strong'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <StatusOrb status={project.status} />
        <h2 className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold text-ink">
          {project.name}
        </h2>
        <span
          className={`font-display text-sm font-semibold ${healthColor(health)}`}
          title={`Health score ${health}/100`}
        >
          {health}
        </span>
      </div>
      <p className="mt-2 line-clamp-1 text-[13px] text-mute">{project.statusReason}</p>
      {project.error && <p className="mt-1 text-xs text-danger">{project.error}</p>}
      <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] text-faint">
        <span className={meta.text}>{meta.label}</span>
        <span className="ml-auto">{daysAgo(project.lastModified) || '—'}</span>
      </div>
    </button>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  status,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  status?: ProjectStatus;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-all duration-150 ${
        active
          ? 'border-accent/50 bg-accent/15 text-accent-ink'
          : 'border-line bg-dim/5 text-mute hover:border-line-strong hover:text-ink'
      }`}
    >
      {status && <StatusOrb status={status} size={6} />}
      {label}
    </button>
  );
}
