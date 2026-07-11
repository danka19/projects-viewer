import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { DrawerItem, ProjectData, RawSpecTask } from '../types';
import type { PrimaryViewDescriptor } from '../uiState';
import { buildSpecCanvasModel, previewSpecTasks } from './model';
import type { PrimaryWorkView, SpecWorkItemModel } from './model';
import { layoutSpecCards } from './layout';
import { routeDependencies } from './routing';

export function PrimaryViewSelector({
  value,
  roadmapCount,
  specsCount,
  onChange,
}: {
  value: PrimaryWorkView;
  roadmapCount: number;
  specsCount: number;
  onChange: (view: PrimaryWorkView) => void;
}) {
  return (
    <div role="tablist" aria-label="View" className="inline-flex rounded-lg border border-line bg-void/45 p-1">
      {([
        ['roadmap', 'Roadmap', roadmapCount, 'No roadmap detected'],
        ['specs', 'Specs', specsCount, 'No specifications detected'],
      ] as const).map(([view, label, count, reason]) => (
        <button
          key={view}
          type="button"
          role="tab"
          aria-selected={value === view}
          disabled={count === 0}
          title={count === 0 ? reason : undefined}
          onClick={() => onChange(view)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${value === view ? 'bg-accent/20 text-accent-ink' : 'text-mute hover:text-ink'} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {label} <span className="font-mono">{count}</span>
        </button>
      ))}
    </div>
  );
}

function defaultState(model: ReturnType<typeof buildSpecCanvasModel>): PrimaryViewDescriptor {
  return {
    view: 'specs',
    selectedSpecKey: model.explicitCurrentSpecKey,
    expandedSpecKey: null,
    zoom: 100,
    panX: 0,
    panY: 0,
  };
}

function safeId(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function taskDrawer(task: RawSpecTask, spec: SpecWorkItemModel, project: ProjectData): DrawerItem {
  return {
    type: 'Specification task',
    title: task.name,
    text: `${spec.name} · ${task.status.replaceAll('_', ' ')}`,
    file: task.source.file,
    line: task.source.line,
    projectPath: project.path,
    status: task.status.replaceAll('_', ' '),
  };
}

function specDrawer(spec: SpecWorkItemModel, project: ProjectData): DrawerItem {
  return {
    type: 'Specification',
    title: spec.name,
    text: [
      `${spec.kind.replaceAll('-', ' ')} · ${spec.lifecycleStatus.replaceAll('_', ' ')}`,
      ...spec.dependencyText,
      `${spec.tasks.length} documented task${spec.tasks.length === 1 ? '' : 's'}`,
    ].join('\n'),
    file: spec.source.file,
    line: spec.source.line,
    projectPath: project.path,
    status: spec.lifecycleStatus.replaceAll('_', ' '),
  };
}

export default function SpecsCanvas({
  project,
  generatedAt,
  sourceMode,
  state,
  onStateChange,
  onOpenDrawer,
  refreshing = false,
}: {
  project: ProjectData;
  generatedAt: string;
  sourceMode: 'live' | 'static' | 'stale';
  state: PrimaryViewDescriptor | null;
  onStateChange: (state: PrimaryViewDescriptor, historyMode?: 'push' | 'replace') => void;
  onOpenDrawer: (item: DrawerItem) => void;
  refreshing?: boolean;
}) {
  const model = useMemo(() => buildSpecCanvasModel(project, { generatedAt, sourceMode }), [project, generatedAt, sourceMode]);
  const [viewState, setViewState] = useState<PrimaryViewDescriptor>(() => state ?? defaultState(model));
  const [announcement, setAnnouncement] = useState('');
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const validKeys = new Set(model.specifications.map((item) => item.key));
    const next = state ?? viewState;
    setViewState({
      ...next,
      view: 'specs',
      selectedSpecKey: next.selectedSpecKey && validKeys.has(next.selectedSpecKey) ? next.selectedSpecKey : model.explicitCurrentSpecKey,
      expandedSpecKey: next.expandedSpecKey && validKeys.has(next.expandedSpecKey) ? next.expandedSpecKey : null,
    });
  }, [model.revision, state]);

  const layout = useMemo(() => layoutSpecCards(
    model.specifications.map((item) => ({ key: item.key, width: 280, height: viewState.expandedSpecKey === item.key ? 880 : 220 })),
    model.dependencies.filter((edge) => edge.state !== 'invalid').map((edge) => ({ prerequisiteKey: edge.prerequisiteKey, dependentKey: edge.dependentKey })),
    { focusKey: viewState.selectedSpecKey },
  ), [model, viewState.expandedSpecKey, viewState.selectedSpecKey]);
  const routes = useMemo(() => routeDependencies(
    model.dependencies.filter((edge) => edge.state !== 'invalid').map((edge) => ({ key: edge.key, prerequisiteKey: edge.prerequisiteKey, dependentKey: edge.dependentKey, label: edge.label })),
    layout,
  ), [model.dependencies, layout]);
  const width = Math.max(760, ...[...layout.values()].map((rect) => rect.x + rect.width + 48));
  const height = Math.max(420, ...[...layout.values()].map((rect) => rect.y + rect.height + 48));

  function commit(next: PrimaryViewDescriptor, mode: 'push' | 'replace' = 'push') {
    setViewState(next);
    onStateChange(next, mode);
  }

  function toggle(item: SpecWorkItemModel) {
    const expanded = viewState.expandedSpecKey === item.key ? null : item.key;
    commit({ ...viewState, selectedSpecKey: item.key, expandedSpecKey: expanded });
    setAnnouncement(`${item.name} ${expanded ? 'expanded' : 'collapsed'}`);
  }

  function fitAll() {
    const viewport = viewportRef.current;
    const availableWidth = viewport?.clientWidth ?? 0;
    const availableHeight = viewport?.clientHeight ?? 0;
    const scale = availableWidth > 0 && availableHeight > 0
      ? Math.min(1, availableWidth / width, availableHeight / height)
      : 0.5;
    const zoom = Math.max(50, Math.min(100, Math.floor((scale * 100) / 10) * 10));
    commit({ ...viewState, zoom, panX: 0, panY: 0 }, 'replace');
  }

  function centerActive() {
    if (!model.explicitCurrentSpecKey) return;
    const rect = layout.get(model.explicitCurrentSpecKey);
    const viewport = viewportRef.current;
    if (!rect || !viewport) return;
    const scale = viewState.zoom / 100;
    commit({
      ...viewState,
      selectedSpecKey: model.explicitCurrentSpecKey,
      panX: viewport.clientWidth / 2 - (rect.x + rect.width / 2) * scale,
      panY: viewport.clientHeight / 2 - (rect.y + rect.height / 2) * scale,
    }, 'replace');
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, item: SpecWorkItemModel) {
    const order = model.specifications.map((candidate) => candidate.key);
    let target: string | undefined;
    if (event.key === 'Home') target = order[0];
    if (event.key === 'End') target = order.at(-1);
    if (event.key.startsWith('Arrow')) {
      const origin = layout.get(item.key);
      if (origin) {
        const candidates = [...layout.values()].filter((rect) => rect.key !== item.key).filter((rect) =>
          event.key === 'ArrowRight' ? rect.x > origin.x : event.key === 'ArrowLeft' ? rect.x < origin.x : event.key === 'ArrowDown' ? rect.y > origin.y : rect.y < origin.y,
        );
        candidates.sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y) || a.key.localeCompare(b.key));
        target = candidates[0]?.key;
      }
    }
    if (target) {
      event.preventDefault();
      cardRefs.current.get(target)?.focus();
      commit({ ...viewState, selectedSpecKey: target }, 'replace');
    }
  }

  if (model.specifications.length === 0 && model.unassignedTasks.length === 0) {
    return <section className="glass rounded-xl p-8 text-center" aria-label="Specifications canvas"><h2 className="text-base font-semibold text-ink">No specifications detected</h2><p className="mt-2 text-sm text-mute">Configure a Specs root or add supported OpenSpec/specification documents.</p></section>;
  }

  const connected = new Set(model.dependencies.flatMap((edge) => [edge.prerequisiteKey, edge.dependentKey]));
  return (
    <section
      className="glass overflow-hidden rounded-xl"
      role="region"
      aria-label={`Specifications canvas: ${model.specifications.length} specifications, ${model.dependencies.length} ${model.dependencies.length === 1 ? 'dependency' : 'dependencies'}`}
      aria-busy={refreshing}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div><h2 className="font-display text-sm font-semibold text-ink">Specs Canvas</h2><p className="mt-0.5 text-xs text-mute">Explicit dependencies only · read-only</p></div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => commit({ ...viewState, zoom: Math.max(50, viewState.zoom - 10) }, 'replace')} className="spec-control">−</button>
          <output className="min-w-12 text-center font-mono text-[11px] text-mute">{viewState.zoom}%</output>
          <button type="button" aria-label="Zoom in" onClick={() => commit({ ...viewState, zoom: Math.min(150, viewState.zoom + 10) }, 'replace')} className="spec-control">+</button>
          <button type="button" aria-label="Fit all" onClick={fitAll} className="spec-control px-2">Fit all</button>
          {model.explicitCurrentSpecKey && <button type="button" aria-label="Center active specification" onClick={centerActive} className="spec-control px-2">Center active</button>}
        </div>
      </header>
      {(model.isPartial || model.integrityIssues.length > 0 || sourceMode === 'stale') && (
        <div className="border-b border-warn/30 bg-warn/10 px-4 py-2 text-xs text-warn" role="status">
          {sourceMode === 'stale' ? 'Showing stale specification data. ' : ''}{model.isPartial ? 'Partial scan: counts and graph may be incomplete. ' : ''}{model.integrityIssues.map((issue) => issue.message).join(' · ')}
        </div>
      )}
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div ref={viewportRef} className="spec-canvas-viewport scroll-slim overflow-auto" data-compact={model.specifications.length > 24 || undefined}>
        <div className="spec-canvas-stage relative" style={{ width, height, transform: `translate(${viewState.panX}px, ${viewState.panY}px) scale(${viewState.zoom / 100})`, transformOrigin: '0 0' }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <defs><marker id="spec-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
            {routes.map((route) => {
              const selected = viewState.selectedSpecKey && (route.prerequisiteKey === viewState.selectedSpecKey || route.dependentKey === viewState.selectedSpecKey);
              return <g key={route.key} className={selected ? 'text-accent-ink' : 'text-faint'}><polyline points={route.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="var(--panel)" strokeWidth="7" /><polyline points={route.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={selected ? 2.5 : 1.5} markerEnd="url(#spec-arrow)" />{route.labelRect && <text x={route.labelRect.x + route.labelRect.width / 2} y={route.labelRect.y + 13} textAnchor="middle" className="fill-current text-[10px]">{route.label}</text>}</g>;
            })}
          </svg>
          {model.specifications.map((item) => {
            const rect = layout.get(item.key)!;
            const selected = viewState.selectedSpecKey === item.key;
            const expanded = viewState.expandedSpecKey === item.key;
            const preview = previewSpecTasks(item.tasks);
            const isIndependent = !connected.has(item.key);
            const accessible = `${item.name}, ${item.lifecycleStatus.replaceAll('_', ' ')}, ${item.progress ? `${item.progress.percent} percent` : 'progress unknown'}, ${item.tasks.length} task${item.tasks.length === 1 ? '' : 's'}, ${item.dependencyState} dependencies, ${expanded ? 'expanded' : 'collapsed'}`;
            return (
              <article key={item.key} data-testid={`spec-card-${item.key}`} className={`spec-card absolute rounded-xl border bg-panel p-4 shadow-lg ${selected ? 'border-accent-ink ring-1 ring-accent/30' : 'border-line'} ${isIndependent ? 'spec-independent' : ''}`} style={{ left: rect.x, top: rect.y, width: rect.width, minHeight: rect.height }}>
                {isIndependent && <p className="mb-2 font-mono text-[10px] tracking-wider text-faint uppercase">Independent work</p>}
                <button ref={(node) => { if (node) cardRefs.current.set(item.key, node); else cardRefs.current.delete(item.key); }} id={`spec-card-control-${safeId(item.key)}`} type="button" aria-label={accessible} aria-expanded={expanded} tabIndex={selected || (!viewState.selectedSpecKey && model.specifications[0]?.key === item.key) ? 0 : -1} onClick={() => toggle(item)} onKeyDown={(event) => navigate(event, item)} className="w-full text-left">
                  <span className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] tracking-wider text-accent-ink uppercase">{item.lifecycleStatus.replaceAll('_', ' ')}</span><span aria-hidden="true">{item.dependencyState === 'blocked' ? '⛔' : item.dependencyState === 'invalid' ? '⚠' : item.lifecycleStatus === 'closed' ? '✓' : '●'}</span></span>
                  <strong className="mt-2 block font-display text-sm text-ink">{item.name}</strong>
                  <span className="mt-1 block font-mono text-[10px] text-faint">{item.sourceScopeId}</span>
                  {item.progress ? <span className="mt-3 block"><span className="flex justify-between text-[11px] text-mute"><span>{item.progress.completed}/{item.progress.total} tasks</span><span>{item.progress.percent}%</span></span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-void"><span className="block h-full bg-accent" style={{ width: `${item.progress.percent}%` }} /></span></span> : <span className="mt-3 block text-xs text-faint">Progress unknown</span>}
                  {item.dependencyText.map((text) => <span key={text} className="mt-1 block text-xs text-mute">{text}</span>)}
                </button>
                {expanded && <div className="mt-3 border-t border-line pt-3"><ul className="space-y-1.5">{preview.tasks.map((task) => <li key={task.key}><button id={`spec-task-${safeId(task.key)}`} type="button" onClick={() => onOpenDrawer(taskDrawer(task, item, project))} className="w-full rounded-md border border-line/70 px-2 py-1.5 text-left text-xs text-mute hover:text-ink"><span aria-hidden="true">{task.status === 'closed' ? '✓' : task.status === 'blocked' ? '⛔' : '○'}</span> {task.name}</button></li>)}</ul>{preview.hiddenCount > 0 && <p className="mt-2 text-xs text-faint">{preview.hiddenCount} more tasks</p>}<button type="button" onClick={() => onOpenDrawer(specDrawer(item, project))} className="mt-3 text-xs font-semibold text-accent-ink">Details</button></div>}
              </article>
            );
          })}
        </div>
      </div>
      {model.unassignedTasks.length > 0 && <aside className="border-t border-line px-4 py-3"><h3 className="text-xs font-semibold text-ink">Unassigned work · {model.unassignedTasks.length}</h3></aside>}
    </section>
  );
}
