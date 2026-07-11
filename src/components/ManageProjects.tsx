import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DiscoveredProjectCandidate,
  ProjectConfig,
  ProjectData,
  SkippedInternalFolder,
} from '../types';
import { formatDate } from '../statusMeta';

interface ManageProjectsProps {
  returnFocusId: string;
  liveMode: boolean;
  config: ProjectConfig | null;
  projects: ProjectData[];
  onClose: () => void;
  onConfigChanged: () => Promise<void>;
  onRescan: () => Promise<void>;
}

interface ApiError {
  error?: string;
  invalid?: { path: string; reason: string }[];
}

export default function ManageProjects({
  returnFocusId,
  liveMode,
  config,
  projects,
  onClose,
  onConfigChanged,
  onRescan,
}: ManageProjectsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [projectPath, setProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [discoveryDepth, setDiscoveryDepth] = useState<1 | 2 | 3>(1);
  const [allowNestedProjects, setAllowNestedProjects] = useState(false);
  const [candidates, setCandidates] = useState<DiscoveredProjectCandidate[]>([]);
  const [internalFolders, setInternalFolders] = useState<SkippedInternalFolder[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewDrafts, setViewDrafts] = useState<Record<string, { defaultView: '' | 'roadmap' | 'specs'; roadmapRoots: string; specsRoots: string }>>({});

  useEffect(() => {
    setViewDrafts(Object.fromEntries((config?.projects ?? []).map((project) => [project.id, {
      defaultView: project.defaultView ?? '',
      roadmapRoots: project.documentationViews?.roadmap?.roots.join('\n') ?? '',
      specsRoots: project.documentationViews?.specs?.roots.join('\n') ?? '',
    }])));
  }, [config]);

  useEffect(() => {
    const root = rootRef.current;
    const siblings = root?.parentElement
      ? Array.from(root.parentElement.children).filter((element) => element !== root)
      : [];
    const previous = siblings.map((element) => ({
      element,
      inert: element.getAttribute('inert'),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));

    for (const sibling of siblings) {
      sibling.setAttribute('inert', '');
      sibling.setAttribute('aria-hidden', 'true');
    }
    closeButtonRef.current?.focus();

    return () => {
      for (const state of previous) {
        if (state.inert === null) state.element.removeAttribute('inert');
        else state.element.setAttribute('inert', state.inert);
        if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
        else state.element.setAttribute('aria-hidden', state.ariaHidden);
      }
      document.getElementById(returnFocusId)?.focus();
    };
  }, [returnFocusId]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const root = rootRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

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
    if (!response.ok) {
      const invalid = body.invalid
        ?.map((entry) => `${entry.path}: ${entry.reason}`)
        .join('; ');
      throw new Error(
        invalid
          ? `${body.error ?? `Request failed: ${response.status}`} ${invalid}`
          : body.error ?? `Request failed: ${response.status}`,
      );
    }
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

  async function handleBrowsePath(target: 'project' | 'workspace') {
    await runAction(async () => {
      const response = await fetch('/api/browse-folder', { method: 'POST' });
      if (response.status === 204) {
        setMessage('Folder selection cancelled.');
        return;
      }
      const body = (await response.json().catch(() => ({}))) as ApiError & { path?: string };
      if (!response.ok) throw new Error(body.error ?? `Browse failed: ${response.status}`);
      if (!body.path) {
        setMessage('Folder selection cancelled.');
        return;
      }
      if (target === 'project') setProjectPath(body.path);
      else setWorkspacePath(body.path);
      setMessage('Folder selected.');
    });
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
          allowNestedProjects,
        }),
      });
      const result = await requestJson<{
        discoveredProjects?: DiscoveredProjectCandidate[];
        candidates?: DiscoveredProjectCandidate[];
        internalFolders?: SkippedInternalFolder[];
      }>(
        `/api/workspaces/${workspace.id}/discover`,
        { method: 'POST' },
      );
      const discoveredProjects = result.discoveredProjects ?? result.candidates ?? [];
      setCandidates(discoveredProjects);
      setInternalFolders(result.internalFolders ?? []);
      setSelectedPaths(new Set());
      setMessage(`${discoveredProjects.length} candidate project(s) found.`);
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
      setInternalFolders([]);
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

  async function handleSaveDocumentationViews(id: string) {
    const draft = viewDrafts[id];
    if (!draft) return;
    const roots = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    await runAction(async () => {
      await requestJson(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          defaultView: draft.defaultView || null,
          documentationViews: {
            roadmap: { roots: roots(draft.roadmapRoots) },
            specs: { roots: roots(draft.specsRoots) },
          },
        }),
      });
      setMessage('Documentation views saved.');
      await onConfigChanged();
      await onRescan();
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
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-projects-title"
      onKeyDown={handleDialogKeyDown}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-5xl rounded-xl border border-line bg-void p-5 shadow-2xl">
        <div className="flex flex-wrap items-start gap-3 border-b border-line pb-4">
          <div>
            <h2
              id="manage-projects-title"
              className="font-display text-lg font-semibold text-ink"
            >
              Manage Projects
            </h2>
            <p className="mt-1 text-xs text-mute">
              Tracked projects are saved in <code>app-data/projects.config.json</code> and will
              remain after restart.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-mute transition hover:text-ink"
          >
            Close
          </button>
        </div>

        {!liveMode && (
          <div className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            Static mode cannot write local config files. Start the local server to manage projects.
          </div>
        )}

        {(message || error) && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              error
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-ok/40 bg-ok/10 text-ok'
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Add Single Project</h3>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  value={projectPath}
                  onChange={(event) => setProjectPath(event.target.value)}
                  disabled={!liveMode || busy}
                  placeholder="Project path"
                  className="min-w-0 flex-1 rounded-md border border-line bg-void/80 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => handleBrowsePath('project')}
                  disabled={!liveMode || busy}
                  className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-mute transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Browse
                </button>
              </div>
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
                className="rounded-md border border-accent/40 bg-accent/15 px-3 py-2 text-xs font-semibold text-accent-ink transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add project
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Add Workspace Folder</h3>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  value={workspacePath}
                  onChange={(event) => setWorkspacePath(event.target.value)}
                  disabled={!liveMode || busy}
                  placeholder="Workspace folder path"
                  className="min-w-0 flex-1 rounded-md border border-line bg-void/80 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => handleBrowsePath('workspace')}
                  disabled={!liveMode || busy}
                  className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-mute transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Browse
                </button>
              </div>
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
                <label className="flex items-center gap-2 text-xs text-mute">
                  <input
                    type="checkbox"
                    checked={allowNestedProjects}
                    onChange={(event) => setAllowNestedProjects(event.target.checked)}
                    disabled={!liveMode || busy}
                  />
                  Allow nested projects
                </label>
                <button
                  type="button"
                  onClick={handleDiscoverWorkspace}
                  disabled={!liveMode || busy || !workspacePath.trim()}
                  className="rounded-md border border-accent/40 bg-accent/15 px-3 py-2 text-xs font-semibold text-accent-ink transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discover projects
                </button>
              </div>
            </div>
          </section>
        </div>

        {(candidates.length > 0 || internalFolders.length > 0) && (
          <section className="mt-5 rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-ink">Discovered Projects</h3>
              <button
                type="button"
                onClick={handleTrackSelected}
                disabled={!liveMode || busy || selectedPaths.size === 0}
                className="ml-auto rounded-md border border-ok/40 bg-ok/10 px-3 py-2 text-xs font-semibold text-ok transition hover:border-ok disabled:cursor-not-allowed disabled:opacity-50"
              >
                Track selected
              </button>
            </div>
            {candidates.length === 0 && (
              <p className="mt-3 text-sm text-mute">No project candidates found.</p>
            )}
            <div className="mt-3 divide-y divide-line">
              {candidates.map((candidate) => (
                <label key={candidate.path} className="grid gap-3 py-3 sm:grid-cols-[auto_1fr]">
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(candidate.path)}
                    onChange={() => toggleCandidate(candidate.path)}
                    disabled={!liveMode || busy}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">{candidate.name}</span>
                      <span className="rounded border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-faint">
                        {candidate.confidence}
                      </span>
                      {(candidate.badges ?? []).map((badge) => (
                        <span
                          key={badge}
                          className="rounded border border-ok/40 bg-ok/10 px-2 py-0.5 font-mono text-[10px] text-ok"
                        >
                          {badge}
                        </span>
                      ))}
                    </span>
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
            {internalFolders.length > 0 && (
              <details className="mt-4 rounded-lg border border-line/70 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-mute">
                  Skipped internal folders ({internalFolders.length})
                </summary>
                <div className="mt-2 divide-y divide-line/70">
                  {internalFolders.map((folder) => (
                    <div key={folder.path} className="py-2">
                      <p className="truncate font-mono text-[11px] text-faint">{folder.path}</p>
                      <p className="text-xs text-mute">{folder.reason}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
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
                          ? 'border-ok/40 text-ok'
                          : 'border-dim/40 text-faint'
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
                    className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
                <details className="lg:col-span-2 rounded-lg border border-line/70 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-mute">Documentation views</summary>
                  <p className="mt-2 text-xs text-faint">Empty roots use automatic mixed-repository classification. Paths are project-relative and validated before saving.</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="text-xs text-mute">Default view
                      <select value={viewDrafts[project.id]?.defaultView ?? ''} disabled={!liveMode || busy} onChange={(event) => setViewDrafts((current) => ({ ...current, [project.id]: { ...(current[project.id] ?? { roadmapRoots: '', specsRoots: '' }), defaultView: event.target.value as '' | 'roadmap' | 'specs' } }))} className="mt-1 block w-full rounded border border-line bg-void px-2 py-2 text-xs text-ink">
                        <option value="">Automatic</option><option value="roadmap">Roadmap</option><option value="specs">Specs</option>
                      </select>
                    </label>
                    <label className="text-xs text-mute">Roadmap roots
                      <textarea value={viewDrafts[project.id]?.roadmapRoots ?? ''} disabled={!liveMode || busy} onChange={(event) => setViewDrafts((current) => ({ ...current, [project.id]: { ...(current[project.id] ?? { defaultView: '', specsRoots: '' }), roadmapRoots: event.target.value } }))} placeholder="docs/roadmap&#10;docs/phases" rows={3} className="mt-1 block w-full rounded border border-line bg-void px-2 py-2 font-mono text-xs text-ink" />
                    </label>
                    <label className="text-xs text-mute">Specs roots
                      <textarea value={viewDrafts[project.id]?.specsRoots ?? ''} disabled={!liveMode || busy} onChange={(event) => setViewDrafts((current) => ({ ...current, [project.id]: { ...(current[project.id] ?? { defaultView: '', roadmapRoots: '' }), specsRoots: event.target.value } }))} placeholder="analytics&#10;openspec" rows={3} className="mt-1 block w-full rounded border border-line bg-void px-2 py-2 font-mono text-xs text-ink" />
                    </label>
                  </div>
                  <div className="mt-3 flex gap-2"><button type="button" disabled={!liveMode || busy} onClick={() => handleSaveDocumentationViews(project.id)} className="rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50">Save views</button><button type="button" disabled={busy} onClick={() => setViewDrafts((current) => ({ ...current, [project.id]: { defaultView: project.defaultView ?? '', roadmapRoots: project.documentationViews?.roadmap?.roots.join('\n') ?? '', specsRoots: project.documentationViews?.specs?.roots.join('\n') ?? '' } }))} className="rounded border border-line px-3 py-1.5 text-xs text-mute">Cancel</button></div>
                </details>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
