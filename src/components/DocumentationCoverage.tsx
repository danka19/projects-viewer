import { useState } from 'react';
import type { DocCategory, DrawerItem, ProjectData } from '../types';
import { DOC_CATEGORY_META, formatSize } from '../statusMeta';
import { docDrawer } from '../drawer';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

const CATEGORY_ORDER: DocCategory[] = [
  'core',
  'roadmap',
  'spec',
  'audit',
  'decision',
  'handoff',
  'other',
];

export default function DocumentationCoverage({ project, onOpenDrawer }: Props) {
  const [query, setQuery] = useState('');
  const [openCats, setOpenCats] = useState<Set<DocCategory>>(new Set());

  const q = query.trim().toLowerCase();
  const filtered = q
    ? project.docs.filter(
        (d) => d.file.toLowerCase().includes(q) || d.category.includes(q),
      )
    : project.docs;

  if (project.docs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-mute">No documentation files found in this project.</p>
      </div>
    );
  }

  function toggle(cat: DocCategory) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-mono text-[11px] tracking-[0.18em] text-mute uppercase">
          Coverage map
        </h3>
        <p className="font-mono text-[11px] text-faint">
          {project.docs.length} files · {formatSize(project.stats.totalSizeBytes)}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by filename or type"
          aria-label="Filter documentation files"
          className="ml-auto w-full max-w-60 rounded-lg border border-line bg-void/40 px-3 py-1.5 font-mono text-xs text-ink placeholder:text-faint focus:border-accent/50"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {CATEGORY_ORDER.map((cat) => {
          const files = filtered.filter((d) => d.category === cat);
          const total = project.docs.filter((d) => d.category === cat).length;
          const meta = DOC_CATEGORY_META[cat];
          const open = openCats.has(cat) || q.length > 0;
          if (q && files.length === 0) return null;
          return (
            <div key={cat} className="rounded-lg border border-line bg-void/30">
              <button
                onClick={() => toggle(cat)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs ${
                    total > 0
                      ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                      : 'border-slate-600/40 bg-slate-600/5 text-slate-600'
                  }`}
                  aria-hidden="true"
                >
                  {meta.icon}
                </span>
                <span className="text-sm font-medium text-slate-200">{meta.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                    total > 0 ? 'bg-slate-500/15 text-slate-300' : 'bg-slate-600/10 text-slate-600'
                  }`}
                >
                  {q ? `${files.length}/${total}` : total}
                </span>
                {total === 0 && (
                  <span className="font-mono text-[10px] text-rose-300/70">missing</span>
                )}
                <span
                  className={`ml-auto text-[10px] text-faint transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                >
                  ▶
                </span>
              </button>
              {open && files.length > 0 && (
                <ul className="scroll-slim max-h-56 space-y-0.5 overflow-y-auto border-t border-line px-3.5 py-2">
                  {files.map((d) => (
                    <li key={d.file}>
                      <button
                        onClick={() => onOpenDrawer(docDrawer(d, project))}
                        className="flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-void/50"
                      >
                        <span className="min-w-0 truncate font-mono text-xs text-slate-300">
                          {d.file}
                        </span>
                        <span className="ml-auto font-mono text-[10px] whitespace-nowrap text-faint">
                          {formatSize(d.sizeBytes)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {project.gaps.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5">
          <p className="font-mono text-[10px] tracking-[0.18em] text-amber-300/80 uppercase">
            Documentation gaps
          </p>
          <ul className="mt-1.5 space-y-1">
            {project.gaps.map((g, i) => (
              <li key={i} className="text-sm text-slate-300">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
