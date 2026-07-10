import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { DrawerItem, KnowledgeViewId, ProjectData, TabId } from '../types';
import SpecsPanel from './SpecsPanel';
import TasksPanel from './TasksPanel';
import DecisionsPanel from './DecisionsPanel';
import AuditsPanel from './AuditsPanel';
import DocumentationCoverage from './DocumentationCoverage';
import ActivityPanel from './ActivityPanel';
import { blockerDrawer, taskDrawer } from '../drawer';

interface Props {
  project: ProjectData;
  activeTab: TabId;
  knowledgeView: KnowledgeViewId;
  onSelectTab: (tab: TabId) => void;
  onSelectKnowledgeView: (view: KnowledgeViewId) => void;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function ProjectTabs({
  project,
  activeTab,
  knowledgeView,
  onSelectTab,
  onSelectKnowledgeView,
  onOpenDrawer,
}: Props) {
  const tabRefs = useRef(new Map<TabId, HTMLButtonElement>());
  const knowledgeTabRefs = useRef(new Map<KnowledgeViewId, HTMLButtonElement>());
  const workCount =
    project.nextTasks.length +
    project.signalGroups.realBlockers.length +
    project.signalGroups.approvalGates.length +
    project.signalGroups.needsReview.length;
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'status', label: 'Status', count: project.phases.length },
    { id: 'work', label: 'Work', count: workCount },
    { id: 'decisions', label: 'Decisions', count: project.decisions.length },
    {
      id: 'knowledge',
      label: 'Knowledge',
      count: project.docs.length,
    },
  ];

  const knowledgeViews: { id: KnowledgeViewId; label: string; count?: number }[] = [
    {
      id: 'specs',
      label: 'SDD / Specs',
      count: project.specs.length + project.docs.filter((d) => d.category === 'spec').length,
    },
    { id: 'audits', label: 'Audits', count: project.audits.length },
    { id: 'docs', label: 'Documentation', count: project.docs.length },
    { id: 'activity', label: 'Activity' },
  ];

  function moveProjectTab(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    onSelectTab(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  function moveKnowledgeTab(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % knowledgeViews.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + knowledgeViews.length) % knowledgeViews.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = knowledgeViews.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = knowledgeViews[nextIndex];
    onSelectKnowledgeView(next.id);
    knowledgeTabRefs.current.get(next.id)?.focus();
  }

  const activePanelId = `project-panel-${activeTab}`;
  const activeTabId = `project-tab-${activeTab}`;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Project detail surfaces"
        aria-orientation="horizontal"
        className="scroll-slim flex gap-1 overflow-x-auto border-b border-line pb-px"
      >
        {tabs.map((t, index) => (
          <button
            key={t.id}
            id={`project-tab-${t.id}`}
            ref={(element) => {
              if (element) tabRefs.current.set(t.id, element);
              else tabRefs.current.delete(t.id);
            }}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls={`project-panel-${t.id}`}
            tabIndex={activeTab === t.id ? 0 : -1}
            onClick={() => onSelectTab(t.id)}
            onKeyDown={(event) => moveProjectTab(event, index)}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'border-accent font-medium text-ink'
                : 'border-transparent text-mute hover:bg-void/40 hover:text-ink'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-px font-mono text-[10px] ${
                  activeTab === t.id ? 'bg-accent/15 text-accent-ink' : 'bg-dim/15 text-faint'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        id={activePanelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
        className="mt-4"
      >
        {activeTab === 'status' && (
          <div>
            <StatusEvidence project={project} onSelectTab={onSelectTab} onOpenDrawer={onOpenDrawer} />
          </div>
        )}
        {activeTab === 'work' && <TasksPanel project={project} onOpenDrawer={onOpenDrawer} />}
        {activeTab === 'decisions' && (
          <DecisionsPanel project={project} onOpenDrawer={onOpenDrawer} />
        )}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="tablist"
              aria-label="Knowledge views"
              aria-orientation="horizontal"
            >
              {knowledgeViews.map((view, index) => (
                <button
                  key={view.id}
                  id={`knowledge-tab-${view.id}`}
                  ref={(element) => {
                    if (element) knowledgeTabRefs.current.set(view.id, element);
                    else knowledgeTabRefs.current.delete(view.id);
                  }}
                  type="button"
                  role="tab"
                  aria-selected={knowledgeView === view.id}
                  aria-controls={`knowledge-panel-${view.id}`}
                  tabIndex={knowledgeView === view.id ? 0 : -1}
                  onClick={() => onSelectKnowledgeView(view.id)}
                  onKeyDown={(event) => moveKnowledgeTab(event, index)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                    knowledgeView === view.id
                      ? 'border-accent/50 bg-accent/15 text-accent-ink'
                      : 'border-line bg-dim/5 text-mute hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {view.label}
                  {typeof view.count === 'number' && view.count > 0 && (
                    <span className="text-[10px] text-faint">{view.count}</span>
                  )}
                </button>
              ))}
            </div>
            <div
              id={`knowledge-panel-${knowledgeView}`}
              role="tabpanel"
              aria-labelledby={`knowledge-tab-${knowledgeView}`}
              tabIndex={0}
            >
              {knowledgeView === 'specs' && (
                <SpecsPanel project={project} onOpenDrawer={onOpenDrawer} />
              )}
              {knowledgeView === 'audits' && (
                <AuditsPanel project={project} onOpenDrawer={onOpenDrawer} />
              )}
              {knowledgeView === 'docs' && (
                <DocumentationCoverage project={project} onOpenDrawer={onOpenDrawer} />
              )}
              {knowledgeView === 'activity' && (
                <ActivityPanel project={project} onOpenDrawer={onOpenDrawer} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Focused evidence under the timeline: top next actions and real blockers. */
function StatusEvidence({
  project,
  onSelectTab,
  onOpenDrawer,
}: {
  project: ProjectData;
  onSelectTab: (tab: TabId) => void;
  onOpenDrawer: (item: DrawerItem) => void;
}) {
  const next = project.nextTasks.slice(0, 3);
  const blockers = project.signalGroups.realBlockers.slice(0, 3);
  if (next.length === 0 && blockers.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <EvidenceCard
        title="Next up"
        accent="text-accent-ink"
        total={project.nextTasks.length}
        items={next.map((t) => ({
          text: t.text,
          onClick: () =>
            onOpenDrawer(taskDrawer(t, project, 'Next action', 'next-action')),
        }))}
        onViewAll={() => onSelectTab('work')}
      />
      <EvidenceCard
        title="Real blockers"
        accent={blockers.length > 0 ? 'text-danger' : 'text-mute'}
        total={project.signalGroups.realBlockers.length}
        items={blockers.map((b) => ({
          text: b.text,
          onClick: () => onOpenDrawer(blockerDrawer(b, project)),
        }))}
        onViewAll={() => onSelectTab('work')}
        empty="No real blockers recorded."
      />
    </div>
  );
}

function EvidenceCard({
  title,
  accent,
  total,
  items,
  onViewAll,
  empty,
}: {
  title: string;
  accent: string;
  total: number;
  items: { text: string; onClick: () => void }[];
  onViewAll: () => void;
  empty?: string;
}) {
  return (
    <section className="glass rounded-xl p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[11px] font-medium tracking-[0.18em] text-mute uppercase">
          {title} <span className={`ml-1 font-display text-sm tracking-normal ${accent}`}>{total}</span>
        </h3>
        {total > items.length && (
          <button
            onClick={onViewAll}
            className="rounded-lg border border-line px-2.5 py-1 font-mono text-[10px] text-mute transition-colors hover:border-accent/40 hover:text-accent-ink"
          >
            View all in Work →
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-faint">{empty ?? 'Nothing recorded.'}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i}>
              <button
                onClick={it.onClick}
                className="w-full rounded-lg border border-line bg-void/30 px-3 py-2 text-left text-sm leading-snug text-mute transition-colors hover:border-line-strong hover:text-ink"
              >
                <span className="line-clamp-2">{it.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
