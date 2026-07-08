import { useEffect, useMemo, useRef, useState } from 'react';
import type { DrawerItem, ProjectData, ProjectStatus, ScanOutput, TabId } from './types';
import { formatDate } from './statusMeta';
import {
  blockerDrawer,
  decisionDrawer,
  docDrawer,
  phaseDrawer,
  specDrawer,
  taskDrawer,
} from './drawer';
import OverviewStats from './components/OverviewStats';
import ProjectSidebar from './components/ProjectSidebar';
import SelectedProjectHeader from './components/SelectedProjectHeader';
import ProjectTabs from './components/ProjectTabs';
import DetailDrawer from './components/DetailDrawer';
import SkeletonShell from './components/Skeleton';
import StatusOrb from './components/StatusOrb';

export default function App() {
  const [data, setData] = useState<ScanOutput | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    import('./data/projects.json')
      .then((m) => {
        if (mounted) setData(m.default as unknown as ScanOutput);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loadError) return <NoDataScreen />;
  if (!data) return <SkeletonShell />;
  return <AppShell data={data} />;
}

interface SearchHit {
  kind: string;
  label: string;
  sub: string;
  project: ProjectData;
  tab?: TabId;
  drawer?: DrawerItem;
}

function AppShell({ data }: { data: ScanOutput }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedPath, setSelectedPath] = useState<string | null>(
    data.projects[0]?.path ?? null,
  );
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [drawer, setDrawer] = useState<DrawerItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search, Escape clears it (drawer handles its own Escape).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = query.trim().toLowerCase();

  const visible = data.projects.filter(
    (p) => statusFilter === 'all' || p.status === statusFilter,
  );
  const selected: ProjectData | null =
    visible.find((p) => p.path === selectedPath) ?? visible[0] ?? null;

  // Global search across projects, phases, tasks, decisions, specs, and docs.
  const hits = useMemo<SearchHit[]>(() => {
    if (q.length < 2) return [];
    const out: SearchHit[] = [];
    const push = (hit: SearchHit) => {
      if (out.length < 40) out.push(hit);
    };
    for (const p of data.projects) {
      if (p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)) {
        push({ kind: 'Project', label: p.name, sub: p.path, project: p });
      }
      for (const ph of p.phases) {
        if (`phase ${ph.id} ${ph.name}`.toLowerCase().includes(q)) {
          push({
            kind: 'Roadmap',
            label: `Phase ${ph.id} — ${ph.name}`,
            sub: p.name,
            project: p,
            tab: 'roadmap',
            drawer: phaseDrawer(ph, p),
          });
        }
      }
      for (const t of [...p.nextTasks, ...p.openTasks].slice(0, 400)) {
        if (t.text.toLowerCase().includes(q)) {
          push({
            kind: 'Task',
            label: t.text.slice(0, 90),
            sub: p.name,
            project: p,
            tab: 'tasks',
            drawer: taskDrawer(t, p),
          });
        }
      }
      for (const b of p.blockers) {
        if (b.text.toLowerCase().includes(q)) {
          push({
            kind: 'Blocked',
            label: b.text.slice(0, 90),
            sub: p.name,
            project: p,
            tab: 'tasks',
            drawer: blockerDrawer(b, p),
          });
        }
      }
      for (const d of p.decisions) {
        if (d.text.toLowerCase().includes(q)) {
          push({
            kind: 'Decision',
            label: d.text.slice(0, 90),
            sub: `${p.name}${d.date ? ` · ${d.date}` : ''}`,
            project: p,
            tab: 'decisions',
            drawer: decisionDrawer(d, p),
          });
        }
      }
      for (const sp of p.specs) {
        if (sp.name.toLowerCase().includes(q)) {
          push({
            kind: 'Spec',
            label: sp.name,
            sub: `${p.name} · ${sp.status}`,
            project: p,
            tab: 'specs',
            drawer: specDrawer(sp, p),
          });
        }
      }
      for (const doc of p.docs) {
        if (doc.file.toLowerCase().includes(q)) {
          push({
            kind: 'Doc',
            label: doc.file,
            sub: p.name,
            project: p,
            tab: 'docs',
            drawer: docDrawer(doc, p),
          });
        }
      }
    }
    return out;
  }, [q, data]);

  function openHit(hit: SearchHit) {
    setSelectedPath(hit.project.path);
    setStatusFilter('all');
    if (hit.tab) setActiveTab(hit.tab);
    if (hit.drawer) setDrawer(hit.drawer);
    setQuery('');
  }

  function selectProject(path: string) {
    setSelectedPath(path);
    setActiveTab('overview');
    setDrawer(null);
  }

  return (
    <div className="min-h-screen">
      {/* Command bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-void/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <div className="flex items-center gap-3">
            <StatusOrb
              status={
                data.projects.some((p) => p.status === 'needs-attention')
                  ? 'needs-attention'
                  : 'active'
              }
              size={11}
            />
            <div>
              <h1 className="font-display text-[15px] leading-tight font-semibold tracking-tight text-ink">
                Projects Viewer
              </h1>
              <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
                local observability
              </p>
            </div>
          </div>

          <div className="relative ml-auto w-full max-w-sm min-w-48 flex-1 sm:w-auto">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, tasks, decisions, docs"
              aria-label="Search projects, tasks, roadmap items, decisions, specs, and docs"
              className="glass w-full rounded-lg py-2 pr-9 pl-3 font-mono text-xs text-ink placeholder:text-faint focus:border-accent/50"
            />
            <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2">/</kbd>

            {hits.length > 0 && (
              <div className="glass scroll-slim absolute top-full right-0 left-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-xl p-2">
                {hits.map((hit, i) => (
                  <button
                    key={i}
                    onClick={() => openHit(hit)}
                    className="flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-void/50"
                  >
                    <span className="w-16 flex-none font-mono text-[10px] tracking-wider text-violet-300/80 uppercase">
                      {hit.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-200">{hit.label}</span>
                      <span className="block truncate font-mono text-[10px] text-faint">
                        {hit.sub}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {q.length >= 2 && hits.length === 0 && (
              <div className="glass absolute top-full right-0 left-0 z-40 mt-2 rounded-xl p-4">
                <p className="text-sm text-mute">Nothing matches “{query.trim()}”.</p>
              </div>
            )}
          </div>

          <p className="hidden font-mono text-[11px] text-faint md:block">
            scanned {formatDate(data.generatedAt)} ·{' '}
            <code className="text-mute">npm run scan</code> to refresh
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <OverviewStats
          projects={data.projects}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          onOpenTab={setActiveTab}
        />

        {data.projects.length === 0 ? (
          <EmptyConfig />
        ) : (
          <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <ProjectSidebar
              projects={data.projects}
              visible={visible}
              selectedPath={selected?.path ?? null}
              statusFilter={statusFilter}
              query=""
              onSelect={selectProject}
              onStatusFilter={setStatusFilter}
              onClear={() => {
                setStatusFilter('all');
                setQuery('');
              }}
            />

            <div className="min-w-0 space-y-4">
              {selected ? (
                <>
                  <SelectedProjectHeader
                    key={selected.path}
                    project={selected}
                    onOpenTab={setActiveTab}
                    onOpenDrawer={setDrawer}
                  />
                  <ProjectTabs
                    project={selected}
                    activeTab={activeTab}
                    onSelectTab={setActiveTab}
                    onOpenDrawer={setDrawer}
                  />
                </>
              ) : (
                <div className="glass rounded-xl p-10 text-center text-sm text-mute">
                  Select a project to inspect its documentation.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1440px] px-5 pb-6">
        <p className="border-t border-line pt-3 font-mono text-[10px] tracking-wide text-faint">
          READ-ONLY · scans documentation files only · click any item for details
        </p>
      </footer>

      {drawer && (
        <DetailDrawer item={drawer} onNavigate={setDrawer} onClose={() => setDrawer(null)} />
      )}
    </div>
  );
}

function NoDataScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <StatusOrb status="unknown" size={14} className="mx-auto" />
        <h2 className="mt-4 font-display text-lg font-semibold text-ink">No scan data yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          The data file <code className="text-slate-300">src/data/projects.json</code> is
          missing. Generate it, then reload this page:
        </p>
        <pre className="mt-4 rounded-lg border border-line bg-void/60 px-4 py-2.5 text-left font-mono text-xs text-emerald-300">
          npm run scan
        </pre>
      </div>
    </div>
  );
}

function EmptyConfig() {
  return (
    <div className="mt-10 flex justify-center">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <StatusOrb status="unknown" size={14} className="mx-auto" />
        <h2 className="mt-4 font-display text-lg font-semibold text-ink">
          No projects scanned yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Add project paths to <code className="text-slate-300">projects.config.json</code>,
          then generate the data file:
        </p>
        <pre className="mt-4 rounded-lg border border-line bg-void/60 px-4 py-2.5 text-left font-mono text-xs text-emerald-300">
          npm run scan
        </pre>
      </div>
    </div>
  );
}
