import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DrawerItem, ProjectConfig, ProjectData, ProjectStatus, ScanOutput, TabId } from './types';
import { formatDate } from './statusMeta';
import {
  blockedGatedCandidateDrawer,
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
import ManageProjects from './components/ManageProjects';

export default function App() {
  const [data, setData] = useState<ScanOutput | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  const loadLiveData = useCallback(async () => {
    const response = await fetch('/api/projects', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Live data unavailable: ${response.status}`);
    const nextData = (await response.json()) as ScanOutput;
    setData(nextData);
    return nextData;
  }, []);

  const loadScanStatus = useCallback(async () => {
    const response = await fetch('/api/scan-status', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Scan status unavailable: ${response.status}`);
    const nextStatus = (await response.json()) as ScanStatus;
    setScanStatus(nextStatus);
    if (nextStatus.lastScannedAt && nextStatus.lastScannedAt !== lastScannedRef.current) {
      lastScannedRef.current = nextStatus.lastScannedAt;
      if (nextStatus.status === 'success') {
        await loadLiveData();
      }
    }
    return nextStatus;
  }, [loadLiveData]);

  const loadConfig = useCallback(async () => {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Config unavailable: ${response.status}`);
    const nextConfig = (await response.json()) as ProjectConfig;
    setConfig(nextConfig);
    return nextConfig;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadInitialData() {
      try {
        const liveData = await loadLiveData();
        if (!mounted) return;
        setLiveMode(true);
        lastScannedRef.current = liveData.generatedAt;
        await Promise.all([loadScanStatus(), loadConfig()]);
      } catch {
        try {
          const m = await import('./data/projects.json');
          if (!mounted) return;
          setLiveMode(false);
          setStatusMessage('Static mode: start local server to enable live rescan');
          setData(m.default as unknown as ScanOutput);
        } catch {
          if (mounted) setLoadError(true);
        }
      }
    }
    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, [loadConfig, loadLiveData, loadScanStatus]);

  useEffect(() => {
    if (!liveMode) return;
    const id = window.setInterval(() => {
      void loadScanStatus().catch(() => {
        setLiveMode(false);
        setStatusMessage('Live server disconnected; showing last loaded data');
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, [liveMode, loadScanStatus]);

  const requestRescan = useCallback(async (trigger: 'manual' | 'interval' = 'manual') => {
    if (!liveMode) return;
    setStatusMessage(trigger === 'interval' ? 'Interval rescan requested' : 'Manual rescan requested');
    const response = await fetch('/api/rescan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger }),
    });
    const nextStatus = (await response.json()) as ScanStatus;
    setScanStatus(nextStatus);
    if (!response.ok || nextStatus.status === 'error') {
      setStatusMessage(nextStatus.error ?? 'Scan failed');
      return;
    }
    await loadLiveData();
    setStatusMessage(
      nextStatus.trigger === 'watcher'
        ? 'Docs changed · rescanned automatically'
        : 'Documentation rescan complete',
    );
  }, [liveMode, loadLiveData]);

  if (loadError) return <NoDataScreen />;
  if (!data) return <SkeletonShell />;
  return (
    <AppShell
      data={data}
      liveMode={liveMode}
      scanStatus={scanStatus}
      statusMessage={statusMessage}
      onRescan={requestRescan}
      config={config}
      onRefreshConfig={loadConfig}
      onRefreshData={loadLiveData}
    />
  );
}

interface ScanStatus {
  status: 'idle' | 'scanning' | 'success' | 'error';
  lastScannedAt: string | null;
  durationMs: number | null;
  scannedFilesCount: number;
  skippedFilesCount: number;
  error: string | null;
  trigger: 'manual' | 'watcher' | 'interval' | 'startup' | null;
  message?: string | null;
  queued?: boolean;
}

interface SearchHit {
  kind: string;
  label: string;
  sub: string;
  project: ProjectData;
  tab?: TabId;
  drawer?: DrawerItem;
}

function AppShell({
  data,
  liveMode,
  scanStatus,
  statusMessage,
  onRescan,
  config,
  onRefreshConfig,
  onRefreshData,
}: {
  data: ScanOutput;
  liveMode: boolean;
  scanStatus: ScanStatus | null;
  statusMessage: string | null;
  onRescan: (trigger?: 'manual' | 'interval') => Promise<void>;
  config: ProjectConfig | null;
  onRefreshConfig: () => Promise<ProjectConfig>;
  onRefreshData: () => Promise<ScanOutput>;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedPath, setSelectedPath] = useState<string | null>(
    data.projects[0]?.path ?? null,
  );
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [drawer, setDrawer] = useState<DrawerItem | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
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
      for (const b of [
        ...p.signalGroups.realBlockers,
        ...p.signalGroups.approvalGates,
        ...p.signalGroups.needsReview,
        ...p.signalGroups.pausedDeferred,
      ]) {
        if (b.text.toLowerCase().includes(q)) {
          push({
            kind: b.kind === 'blocked' || b.kind === 'rejection' ? 'Blocker' : 'Signal',
            label: b.text.slice(0, 90),
            sub: p.name,
            project: p,
            tab: 'tasks',
            drawer: blockerDrawer(b, p),
          });
        }
      }
      for (const candidate of [
        ...p.blockedGatedDiagnostics.filteredAgentRules,
        ...p.blockedGatedDiagnostics.filteredProcessPolicies,
        ...p.blockedGatedDiagnostics.filteredExamplesOrTemplates,
      ]) {
        if (candidate.text.toLowerCase().includes(q) || candidate.reason.toLowerCase().includes(q)) {
          push({
            kind: 'Diagnostic',
            label: candidate.text.slice(0, 90),
            sub: `${p.name} В· ${candidate.classification}`,
            project: p,
            tab: 'tasks',
            drawer: blockedGatedCandidateDrawer(candidate, p),
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
                    <span className="w-16 flex-none font-mono text-[10px] tracking-wider text-accent-ink/90 uppercase">
                      {hit.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{hit.label}</span>
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

          <LiveControls
            liveMode={liveMode}
            generatedAt={data.generatedAt}
            scanStatus={scanStatus}
            statusMessage={statusMessage}
            onRescan={onRescan}
          />
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            title={liveMode ? 'Manage tracked projects' : 'Start local server to manage projects'}
            className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-mute transition hover:text-ink"
          >
            Manage Projects
          </button>
          <ThemeToggle />
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
      {manageOpen && (
        <ManageProjects
          liveMode={liveMode}
          config={config}
          projects={data.projects}
          onClose={() => setManageOpen(false)}
          onConfigChanged={async () => {
            await onRefreshConfig();
            await onRefreshData();
          }}
          onRescan={() => onRescan('manual')}
        />
      )}
    </div>
  );
}

function ThemeToggle() {
  const [light, setLight] = useState(() =>
    document.documentElement.classList.contains('light'),
  );

  function toggle() {
    const next = !light;
    document.documentElement.classList.toggle('light', next);
    window.localStorage.setItem('projects-viewer:theme', next ? 'light' : 'dark');
    setLight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={light ? 'Switch to dark theme' : 'Switch to light theme'}
      aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
      className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-mute transition hover:text-ink"
    >
      {light ? '◑ Dark' : '◐ Light'}
    </button>
  );
}

const INTERVAL_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '30 min', value: 30 * 60 * 1000 },
];

function LiveControls({
  liveMode,
  generatedAt,
  scanStatus,
  statusMessage,
  onRescan,
}: {
  liveMode: boolean;
  generatedAt: string;
  scanStatus: ScanStatus | null;
  statusMessage: string | null;
  onRescan: (trigger?: 'manual' | 'interval') => Promise<void>;
}) {
  const [intervalMs, setIntervalMs] = useState(() => {
    const saved = Number(window.localStorage.getItem('projects-viewer:auto-rescan-ms') ?? 0);
    return INTERVAL_OPTIONS.some((option) => option.value === saved) ? saved : 0;
  });
  const [busy, setBusy] = useState(false);
  const isScanning = scanStatus?.status === 'scanning' || busy;
  const modeLabel = liveMode ? 'Live' : 'Static';
  const modeClass = liveMode ? 'border-ok/40 text-ok' : 'border-warn/40 text-warn';
  const message =
    scanStatus?.message ??
    scanStatus?.error ??
    statusMessage ??
    (liveMode ? 'Local server connected' : 'Start local server to enable live rescan');

  useEffect(() => {
    window.localStorage.setItem('projects-viewer:auto-rescan-ms', String(intervalMs));
  }, [intervalMs]);

  useEffect(() => {
    if (!liveMode || intervalMs < 5 * 60 * 1000) return;
    const id = window.setInterval(() => {
      if (scanStatus?.status === 'scanning') return;
      if (scanStatus?.trigger === 'watcher' && scanStatus.lastScannedAt) {
        const elapsed = Date.now() - Date.parse(scanStatus.lastScannedAt);
        if (elapsed < 60_000) return;
      }
      void onRescan('interval');
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, liveMode, onRescan, scanStatus?.lastScannedAt, scanStatus?.status, scanStatus?.trigger]);

  async function handleRescan() {
    if (!liveMode || isScanning) return;
    setBusy(true);
    try {
      await onRescan('manual');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass flex w-full flex-col gap-2 rounded-lg px-3 py-2 md:w-auto md:min-w-[360px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-1 font-mono text-[10px] uppercase ${modeClass}`}>
          {modeLabel}
        </span>
        <button
          type="button"
          onClick={handleRescan}
          disabled={!liveMode || isScanning}
          title={liveMode ? 'Rescan configured project docs' : 'Start local server to enable live rescan'}
          className="rounded-md border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:border-dim/20 disabled:bg-dim/10 disabled:text-faint"
        >
          {isScanning ? 'Scanning...' : 'Rescan docs'}
        </button>
        <label className="ml-auto flex items-center gap-2 font-mono text-[10px] text-faint">
          Auto
          <select
            value={intervalMs}
            onChange={(event) => setIntervalMs(Number(event.target.value))}
            disabled={!liveMode}
            className="rounded border border-line bg-void/80 px-2 py-1 text-[11px] text-mute disabled:opacity-50"
            title={liveMode ? 'Optional interval fallback' : 'Start local server to enable interval rescan'}
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-x-3 gap-y-1 font-mono text-[10px] text-faint sm:grid-cols-2">
        <span>last {formatDate(scanStatus?.lastScannedAt ?? generatedAt)}</span>
        <span>status {scanStatus?.status ?? (liveMode ? 'idle' : 'static')}</span>
        <span>files {scanStatus?.scannedFilesCount ?? '-'}</span>
        <span>skipped {scanStatus?.skippedFilesCount ?? '-'}</span>
        <span>duration {scanStatus?.durationMs != null ? `${scanStatus.durationMs}ms` : '-'}</span>
        <span>trigger {scanStatus?.trigger ?? '-'}</span>
      </div>
      <p className="truncate font-mono text-[10px] text-mute" title={message}>
        {message}
      </p>
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
          The data file <code className="text-mute">src/data/projects.json</code> is
          missing. Generate it, then reload this page:
        </p>
        <pre className="mt-4 rounded-lg border border-line bg-void/60 px-4 py-2.5 text-left font-mono text-xs text-ok">
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
          Use Manage Projects to add local project paths, then rescan docs or generate the data file:
        </p>
        <pre className="mt-4 rounded-lg border border-line bg-void/60 px-4 py-2.5 text-left font-mono text-xs text-ok">
          npm run scan
        </pre>
      </div>
    </div>
  );
}
