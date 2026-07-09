import type { DrawerItem, ProjectData } from '../types';
import { dayLabel, formatTime } from '../statusMeta';
import { docDrawer } from '../drawer';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function ActivityPanel({ project, onOpenDrawer }: Props) {
  const recent = [...project.docs]
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, 20);

  if (recent.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-mute">No documentation activity to show.</p>
      </div>
    );
  }

  let lastDay = '';
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-mono text-[11px] tracking-[0.18em] text-mute uppercase">
        Recent documentation changes
      </h3>
      <ol className="mt-4 ml-1 border-l border-line">
        {recent.map((d) => {
          const day = dayLabel(d.modified);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <li key={d.file} className="relative pb-1 pl-5 last:pb-0">
              <span
                className={`absolute top-2.5 -left-[3.5px] h-1.5 w-1.5 rounded-full ${
                  showDay
                    ? 'bg-accent'
                    : 'bg-dim'
                }`}
              />
              {showDay && (
                <p className="mt-2 mb-1 font-mono text-[10px] tracking-[0.16em] text-mute uppercase first:mt-0">
                  {day}
                </p>
              )}
              <button
                onClick={() => onOpenDrawer(docDrawer(d, project))}
                className="flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-void/40"
              >
                <span className="min-w-0 truncate font-mono text-xs text-mute">
                  {d.file}
                </span>
                <span className="ml-auto font-mono text-[10px] whitespace-nowrap text-faint">
                  {formatTime(d.modified)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
