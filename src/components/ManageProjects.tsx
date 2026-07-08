import { useMemo, useState } from 'react';
import type {
  DiscoveredProjectCandidate,
  ProjectConfig,
  ProjectData,
} from '../types';
import { formatDate } from '../statusMeta';

interface ManageProjectsProps {
  liveMode: boolean;
  config: ProjectConfig | null;
  projects: ProjectData[];
  onClose: () => void;
  onConfigChanged: () => Promise<void>;
  onRescan: () => Promise<void>;
}

interface ApiError {
  error?: string;
}

export default function ManageProjects({
  liveMode,
  config,
  projects,
  onClose,
  onConfigChanged,
  onRescan,
}: ManageProjectsProps) {
  const [projectPath, setProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [discoveryDepth, setDiscoveryDepth] = useState<1 | 2 | 3>(2);
  const [candidates, setCandidates] = useState<DiscoveredProjectCandidate[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lastScannedByPath = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const project of projects) map.set(project.path, project.lastModified);
    return map;
  }, [projects]);

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as ApiError;
    if (!response.ok) throw new Error(body.error ?? `Request failed: ${response.status}`);
    return body as T;
  }

  async function runAction(action: () => Promise<void>) {
    if (!liveMode || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddProject() {
    await runAction(async () => {
      await requestJson('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ path: projectPath, name: projectName || undefined }),
      });
      setProjectPath('');
      setProjectName('');
      setMessage('Project tracked.');
      await onConfigChanged();
    });
  }

  async function handleDiscoverWorkspace() {
    await runAction(async () => {
      const { workspace } = await requestJson<{ workspace: { id: string } }>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          path: workspacePath,
          name: workspaceName || undefined,
          discoveryDepth,
        }),
      });
      const result = await requestJson<{ candidates: DiscoveredProjectCandidate[] }>(
        `/api/workspaces/${workspace.id}/discover`,
        { method: 'POST' },
      );
      setCandidates(result.candidates);
      setSelectedPaths(new Set());
      setMessage(`${result.candidates.length} candidate project(s) found.`);
      await onConfigChanged();
    });
  }

  async function handleTrackSelected() {
    await runAction(async () => {
      await requestJson('/api/projects/track-discovered', {
        method: 'POST',
        body: JSON.stringify({ paths: [...selectedPaths] }),
      });
      setCandidates([]);
      setSelectedPaths(new Set());
      setMessage('Selected projects tracked.');
      await onConfigChanged();
      await onRescan();
    });
  }

  async function handleToggleProject(id: string, enabled: boolean) {
    await runAction(async () => {
      await requestJson(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      setMessage(enabled ? 'Project enabled.' : 'Project disabled.');
      await onConfigChanged();
    });
  }

  async function handleRemoveProject(id: string) {
    await runAction(async () => {
      await requestJson(`/api/projects/${id}`, { method: 'DELETE' });
      setMessage('Project removed from tracking.');
      await onConfigChanged();
    });
  }

  function toggleCandidate(path: string) {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl rounded-xl border border-line bg-void p-5 shadow-2xl">
        <div className="flex flex-wrap items-start gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Manage Projects</h2>
            <p className="mt-1 text-xs text-mute">
              Tracked projects are saved in <code>app-data/projects.config.json</code> and will
              remain after restart.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-mute transition hover:text-ink"
          >
            Close
          </button>
        </div>

        {!liveMode && (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Static mode cannot write local config files. Start the local server to manage projects.
          </div>
        )}

        {(message || error) && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              error
                ? 'border-rose-300/30 bg-rose-300/10 text-rose-100'
                : 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Add Single Project</h3>
            <div className="mt-3 space-y-3">
              <input
                value={projectPath}
                onChange={(event) => setProjectPath(event.target.value)}
                disabled={!liveMode || busy}
                placeholder="Project path"
                className="w-full rounded-md border border-line bg-void/80 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint disabled:opacity-50"
              />
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                disabled={!liveMode || busy}
                placeholder="Display name"
                className="w-full rounded-md border border-line bg-void/80 px-3 py-2 text-sm text-ink placeholder:text-faint disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleAddProject}
                disabled={!liveMode || busy || !projectPath.trim()}
                className="rounded-md border border-violet-300/25 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add project
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Add Workspace Folder</h3>
            <div className="mt-3 space-y-3">
              <input
                value={workspacePath}
                onChange={(event) => setWorkspacePath(event.target.value)}
                disabled={!liveMode || busy}
                placeholder="Workspace folder path"
                className="w-full rounded-md border border-line bg-void/80 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint disabled:opacity-50"
              />
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                disabled={!liveMode || busy}
                placeholder="Display name"
                className="w-full rounded-md border border-line bg-void/80 px-3 py-2 text-sm text-ink placeholder:text-faint disabled:opacity-50"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 font-mono text-[10px] text-faint">
                  Depth
                  <select
                    value={discoveryDepth}
                    onChange={(event) => setDiscoveryDepth(Number(event.target.value) as 1 | 2 | 3)}
                    disabled={!liveMode || busy}
                    className="rounded border border-line bg-void/80 px-2 py-1 text-xs text-mute disabled:opacity-50"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleDiscoverWorkspace}
                  disabled={!liveMode || busy || !workspacePath.trim()}
                  className="rounded-md border border-violet-300/25 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discover projects
                </button>
              </div>
            </div>
          </section>
        </div>

        {candidates.length > 0 && (
          <section className="mt-5 rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-ink">Discovered Projects</h3>
              <button
                type="button"
                onClick={handleTrackSelected}
                disabled={!liveMode || busy || selectedPaths.size === 0}
                className="ml-auto rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Track selected
              </button>
            </div>
            <div className="mt-3 divide-y divide-line">
              {candidates.map((candidate) => (
                <label key={candidate.path} className="flex gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(candidate.path)}
                    onChange={() => toggleCandidate(candidate.path)}
                    disabled={!liveMode || busy}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{candidate.name}</span>
                    <span className="block truncate font-mono text-[11px] text-faint">
                      {candidate.path}
                    </span>
                    <span className="mt-1 block text-xs text-mute">
                      {candidate.reasons.join(', ')}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-lg border border-line p-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-ink">Tracked Projects</h3>
            <button
              type="button"
              onClick={onRescan}
              disabled={!liveMode || busy}
              className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-mute transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rescan enabled
            </button>
          </div>

          <div className="mt-3 divide-y divide-line">
            {(config?.projects ?? []).length === 0 && (
              <p className="py-4 text-sm text-mute">No tracked projects yet.</p>
            )}
            {(config?.projects ?? []).map((project) => (
              <div key={project.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{project.name}</span>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${
                        project.enabled
                          ? 'border-emerald-300/30 text-emerald-200'
                          : 'border-slate-400/30 text-faint'
                      }`}
                    >
                      {project.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-faint">{project.path}</p>
                  <p className="mt-1 text-xs text-mute">
                    Tags: {project.tags.length > 0 ? project.tags.join(', ') : 'none'} · Last scanned:{' '}
                    {formatDate(lastScannedByPath.get(project.path) ?? null)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <label className="flex items-center gap-2 text-xs text-mute">
                    <input
                      type="checkbox"
                      checked={project.enabled}
                      disabled={!liveMode || busy}
                      onChange={(event) => handleToggleProject(project.id, event.target.checked)}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={onRescan}
                    disabled={!liveMode || busy || !project.enabled}
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-mute transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(project.id)}
                    disabled={!liveMode || busy}
                    className="rounded-md border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
