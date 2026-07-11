import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DrawerItem,
  ProjectConfig,
  ProjectData,
  ScanOutput,
} from './types';
import { formatDate, formatTime } from './statusMeta';
import type { SearchHit } from './search';
import {
  createDrawerDescriptor,
  pushHistoryUiState,
  readHistoryUiState,
  readInitialUiState,
  replaceHistoryUiState,
  resolveDrawerDescriptor,
  validateUiState,
  writeStoredUiState,
} from './uiState';
import type { DashboardUiState } from './uiState';
import AttentionBrief from './components/AttentionBrief';
import type { AttentionItem } from './components/AttentionBrief';
import ProjectSidebar from './components/ProjectSidebar';
import SelectedProjectHeader from './components/SelectedProjectHeader';
import ProjectTabs from './components/ProjectTabs';
import DetailDrawer from './components/DetailDrawer';
import SkeletonShell from './components/Skeleton';
import StatusOrb from './components/StatusOrb';
import ManageProjects from './components/ManageProjects';
import GlobalSearch from './components/GlobalSearch';
import ProjectTimeline from './timeline/ProjectTimeline';

const MANAGE_PROJECTS_TRIGGER_ID = 'manage-projects-trigger';

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

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeHistory(): History | null {
  try {
    return window.history;
  } catch {
    return null;
  }
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
  const [uiState, setUiState] = useState<DashboardUiState>(() =>
    readInitialUiState(safeHistory(), safeStorage(), data.projects),
  );
  const uiStateRef = useRef(uiState);
  const [transientDrawer, setTransientDrawer] = useState<DrawerItem | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const commitUiState = useCallback(
    (
      update: (current: DashboardUiState) => DashboardUiState,
      historyMode: 'push' | 'replace',
    ) => {
      const current = uiStateRef.current;
      const next = validateUiState(update(current), data.projects);
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      uiStateRef.current = next;
      setUiState(next);
      writeStoredUiState(safeStorage(), next);
      if (historyMode === 'push') pushHistoryUiState(safeHistory(), next);
      else replaceHistoryUiState(safeHistory(), next);
    },
    [data.projects],
  );

  useEffect(() => {
    writeStoredUiState(safeStorage(), uiStateRef.current);
    replaceHistoryUiState(safeHistory(), uiStateRef.current);
  }, []);

  useEffect(() => {
    const next = validateUiState(uiStateRef.current, data.projects);
    if (JSON.stringify(next) === JSON.stringify(uiStateRef.current)) return;
    uiStateRef.current = next;
    setUiState(next);
    setTransientDrawer(null);
    writeStoredUiState(safeStorage(), next);
    replaceHistoryUiState(safeHistory(), next);
  }, [data.projects]);

  useEffect(() => {
    function restoreFromHistory() {
      const restored = readHistoryUiState(safeHistory(), data.projects);
      uiStateRef.current = restored;
      setUiState(restored);
      setTransientDrawer(null);
      writeStoredUiState(safeStorage(), restored);
    }
    window.addEventListener('popstate', restoreFromHistory);
    return () => window.removeEventListener('popstate', restoreFromHistory);
  }, [data.projects]);

  const {
    query,
    includeDiagnostics,
    statusFilter,
    selectedPath,
    activeTab,
    knowledgeView,
  } = uiState;

  const visible = data.projects.filter(
    (p) => statusFilter === 'all' || p.status === statusFilter,
  );
  const selected: ProjectData | null =
    data.projects.find((p) => p.path === selectedPath) ?? data.projects[0] ?? null;
  const restoredDrawer = useMemo(
    () => (uiState.drawer ? resolveDrawerDescriptor(uiState.drawer, data.projects) : null),
    [data.projects, uiState.drawer],
  );
  const drawer = transientDrawer ?? restoredDrawer;
  const disconnectedWithRetainedData =
    !liveMode && statusMessage?.startsWith('Live server disconnected') === true;
  const timelineIsStale = scanStatus?.status === 'error' || disconnectedWithRetainedData;
  const timelineSourceMode = timelineIsStale ? 'stale' : liveMode ? 'live' : 'static';
  const timelineRefreshError =
    scanStatus?.status === 'error'
      ? (scanStatus.error ?? scanStatus.message ?? 'Documentation refresh failed')
      : disconnectedWithRetainedData
        ? statusMessage
        : null;
  const timelineError = timelineIsStale ? timelineRefreshError : selected?.error ?? null;

  function persistableDrawer(item: DrawerItem | undefined) {
    if (!item) return null;
    const descriptor = createDrawerDescriptor(item);
    return descriptor && resolveDrawerDescriptor(descriptor, data.projects)
      ? descriptor
      : null;
  }

  function openHit(hit: SearchHit) {
    const descriptor = persistableDrawer(hit.drawer);
    setTransientDrawer(hit.drawer && !descriptor ? hit.drawer : null);
    commitUiState(
      (current) => ({
        ...current,
        selectedPath: hit.project.path,
        activeTab: hit.tab ?? current.activeTab,
        knowledgeView: hit.knowledgeView ?? current.knowledgeView,
        timeline:
          hit.project.path === current.selectedPath ? current.timeline : null,
        drawer: descriptor,
      }),
      'push',
    );
  }

  function selectProject(path: string) {
    setTransientDrawer(null);
    commitUiState(
      (current) => ({
        ...current,
        selectedPath: path,
        activeTab: 'status',
        timeline: null,
        drawer: null,
      }),
      'push',
    );
  }

  function openDrawer(item: DrawerItem) {
    const descriptor = persistableDrawer(item);
    setTransientDrawer(descriptor ? null : item);
    commitUiState((current) => ({ ...current, drawer: descriptor }), 'push');
  }

  function closeDrawer() {
    setTransientDrawer(null);
    commitUiState((current) => ({ ...current, drawer: null }), 'push');
  }

  function openAttentionItem(item: AttentionItem) {
    const descriptor = persistableDrawer(item.drawer);
    setTransientDrawer(item.drawer && !descriptor ? item.drawer : null);
    commitUiState(
      (current) => ({
        ...current,
        selectedPath: item.project.path,
        statusFilter: 'all',
        activeTab: item.tab,
        timeline:
          item.project.path === current.selectedPath ? current.timeline : null,
        drawer: descriptor,
      }),
      'push',
    );
  }

  return (
    <div className="min-h-screen">
      {/* Compact system bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-void/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <StatusOrb
              status={
                data.projects.some((p) => p.status === 'needs-attention')
                  ? 'needs-attention'
                  : 'active'
              }
              size={10}
            />
            <h1 className="font-display text-[15px] leading-tight font-semibold tracking-tight text-ink">
              Projects Viewer
            </h1>
          </div>

          <GlobalSearch
            projects={data.projects}
            query={query}
            includeDiagnostics={includeDiagnostics}
            onQueryChange={(nextQuery) =>
              commitUiState((current) => ({ ...current, query: nextQuery }), 'replace')
            }
            onIncludeDiagnosticsChange={(include) =>
              commitUiState(
                (current) => ({ ...current, includeDiagnostics: include }),
                'replace',
              )
            }
            onOpenHit={openHit}
          />

          <FreshnessControl
            liveMode={liveMode}
            generatedAt={data.generatedAt}
            scanStatus={scanStatus}
            statusMessage={statusMessage}
            onRescan={onRescan}
          />
          <button
            id={MANAGE_PROJECTS_TRIGGER_ID}
            type="button"
            onClick={() => setManageOpen(true)}
            title={liveMode ? 'Manage tracked projects' : 'Start local server to manage projects'}
            className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-mute transition hover:text-ink"
          >
            Manage
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-5">
        <AttentionBrief projects={data.projects} onOpenItem={openAttentionItem} />

        {data.projects.length === 0 ? (
          <EmptyConfig />
        ) : (
          <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Project inventory: sidebar on desktop, compact switcher on mobile. */}
            <div className="hidden lg:block">
              <ProjectSidebar
                projects={data.projects}
                visible={visible}
                selectedPath={selected?.path ?? null}
                statusFilter={statusFilter}
                query=""
                onSelect={selectProject}
                onStatusFilter={(filter) =>
                  commitUiState(
                    (current) => ({ ...current, statusFilter: filter }),
                    'push',
                  )
                }
                onClear={() => {
                  commitUiState(
                    (current) => ({ ...current, statusFilter: 'all', query: '' }),
                    'push',
                  );
                }}
              />
            </div>

            <div className="min-w-0 space-y-4">
              <MobileProjectSwitcher
                projects={data.projects}
                selectedPath={selected?.path ?? null}
                onSelect={selectProject}
              />
              {selected ? (
                <>
                  <SelectedProjectHeader
                    key={`header:${selected.path}`}
                    project={selected}
                    generatedAt={data.generatedAt}
                    liveMode={liveMode}
                    onOpenTab={(tab) =>
                      commitUiState((current) => ({ ...current, activeTab: tab }), 'push')
                    }
                    onOpenDrawer={openDrawer}
                  />
                  <ProjectTimeline
                    key={`timeline:${selected.path}`}
                    project={selected}
                    generatedAt={data.generatedAt}
                    sourceMode={timelineSourceMode}
                    refreshing={liveMode && scanStatus?.status === 'scanning'}
                    error={timelineError}
                    onRetry={liveMode ? () => void onRescan('manual') : undefined}
                    restoredDescriptor={uiState.timeline}
                    onDescriptorChange={(timeline, historyMode = 'push') =>
                      commitUiState((current) => ({ ...current, timeline }), historyMode)
                    }
                    onOpenDrawer={openDrawer}
                    onOpenDocs={() =>
                      commitUiState(
                        (current) => ({
                          ...current,
                          activeTab: 'knowledge',
                          knowledgeView: 'docs',
                        }),
                        'push',
                      )
                    }
                  />
                  <ProjectTabs
                    project={selected}
                    activeTab={activeTab}
                    knowledgeView={knowledgeView}
                    onSelectTab={(tab) =>
                      commitUiState((current) => ({ ...current, activeTab: tab }), 'push')
                    }
                    onSelectKnowledgeView={(view) =>
                      commitUiState(
                        (current) => ({ ...current, knowledgeView: view }),
                        'push',
                      )
                    }
                    onOpenDrawer={openDrawer}
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
        <DetailDrawer item={drawer} onNavigate={openDrawer} onClose={closeDrawer} />
      )}
      {manageOpen && (
        <ManageProjects
          returnFocusId={MANAGE_PROJECTS_TRIGGER_ID}
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

/** Mobile-only compact project switcher shown before selected-project state. */
function MobileProjectSwitcher({
  projects,
  selectedPath,
  onSelect,
}: {
  projects: ProjectData[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  if (projects.length === 0) return null;
  return (
    <label className="glass flex items-center gap-2.5 rounded-xl px-3 py-2 lg:hidden">
      <span className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        Project
      </span>
      <select
        value={selectedPath ?? ''}
        onChange={(event) => onSelect(event.target.value)}
        aria-label="Switch selected project"
        className="min-w-0 flex-1 rounded border border-line bg-void/80 px-2 py-1.5 text-sm text-ink"
      >
        {projects.map((p) => (
          <option key={p.path} value={p.path}>
            {p.name} — {p.status}
          </option>
        ))}
      </select>
    </label>
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
      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-mute transition hover:text-ink"
    >
      {light ? '◑' : '◐'}
    </button>
  );
}

const INTERVAL_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '30 min', value: 30 * 60 * 1000 },
];

/**
 * Compact freshness pill with progressive disclosure: mode + last scan time
 * stay visible; rescan, interval, and scan telemetry live in the details
 * panel so operations do not dominate the first screen.
 */
function FreshnessControl({
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
  const [open, setOpen] = useState(false);
  const [intervalMs, setIntervalMs] = useState(() => {
    const saved = Number(window.localStorage.getItem('projects-viewer:auto-rescan-ms') ?? 0);
    return INTERVAL_OPTIONS.some((option) => option.value === saved) ? saved : 0;
  });
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScanning = scanStatus?.status === 'scanning' || busy;
  const lastScan = scanStatus?.lastScannedAt ?? generatedAt;
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

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        title={message}
        className={`glass flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition-colors hover:border-line-strong ${
          liveMode ? 'text-ok' : 'text-warn'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isScanning ? 'animate-pulse bg-info' : liveMode ? 'bg-ok' : 'bg-warn'
          }`}
        />
        {liveMode ? 'Live' : 'Static'}
        <span className="hidden text-faint sm:inline">{formatTime(lastScan)}</span>
        <span aria-hidden="true" className="text-faint">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="glass absolute top-full right-0 z-40 mt-2 w-80 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRescan}
              disabled={!liveMode || isScanning}
              title={liveMode ? 'Rescan configured project docs' : 'Start local server to enable live rescan'}
              className="rounded-md border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:border-accent-ink disabled:cursor-not-allowed disabled:border-dim/20 disabled:bg-dim/10 disabled:text-faint"
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
          <div className="mt-2.5 grid gap-x-3 gap-y-1 border-t border-line pt-2.5 font-mono text-[10px] text-faint sm:grid-cols-2">
            <span>last {formatDate(lastScan)}</span>
            <span>status {scanStatus?.status ?? (liveMode ? 'idle' : 'static')}</span>
            <span>files {scanStatus?.scannedFilesCount ?? '-'}</span>
            <span>skipped {scanStatus?.skippedFilesCount ?? '-'}</span>
            <span>duration {scanStatus?.durationMs != null ? `${scanStatus.durationMs}ms` : '-'}</span>
            <span>trigger {scanStatus?.trigger ?? '-'}</span>
          </div>
          <p className="mt-2 line-clamp-2 font-mono text-[10px] text-mute" title={message}>
            {message}
          </p>
        </div>
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
