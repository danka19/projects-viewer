import type { DrawerItem, ProjectData, TabId } from '../types';
import FocusCards from './FocusCards';
import ProjectTimeline from '../timeline/ProjectTimeline';
import SpecsPanel from './SpecsPanel';
import TasksPanel from './TasksPanel';
import DecisionsPanel from './DecisionsPanel';
import AuditsPanel from './AuditsPanel';
import DocumentationCoverage from './DocumentationCoverage';
import ActivityPanel from './ActivityPanel';

interface Props {
  project: ProjectData;
  activeTab: TabId;
  generatedAt: string;
  liveMode: boolean;
  onSelectTab: (tab: TabId) => void;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function ProjectTabs({
  project,
  activeTab,
  generatedAt,
  liveMode,
  onSelectTab,
  onOpenDrawer,
}: Props) {
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'roadmap', label: 'Roadmap', count: project.phases.length },
    {
      id: 'specs',
      label: 'SDD / Specs',
      count: project.specs.length + project.docs.filter((d) => d.category === 'spec').length,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      count: project.openTasks.length + project.nextTasks.length,
    },
    { id: 'decisions', label: 'Decisions', count: project.decisions.length },
    { id: 'audits', label: 'Audits', count: project.audits.length },
    { id: 'docs', label: 'Documentation', count: project.docs.length },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Project detail tabs"
        className="scroll-slim flex gap-1 overflow-x-auto border-b border-line pb-px"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => onSelectTab(t.id)}
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
                  activeTab === t.id
                    ? 'bg-accent/15 text-accent-ink'
                    : 'bg-dim/15 text-faint'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <FocusCards project={project} onOpenTab={onSelectTab} onOpenDrawer={onOpenDrawer} />
        )}
        {activeTab === 'roadmap' && (
          <ProjectTimeline
            project={project}
            generatedAt={generatedAt}
            sourceMode={liveMode ? 'live' : 'static'}
            onOpenDrawer={onOpenDrawer}
            onOpenDocs={() => onSelectTab('docs')}
          />
        )}
        {activeTab === 'specs' && <SpecsPanel project={project} onOpenDrawer={onOpenDrawer} />}
        {activeTab === 'tasks' && <TasksPanel project={project} onOpenDrawer={onOpenDrawer} />}
        {activeTab === 'decisions' && (
          <DecisionsPanel project={project} onOpenDrawer={onOpenDrawer} />
        )}
        {activeTab === 'audits' && (
          <AuditsPanel project={project} onOpenDrawer={onOpenDrawer} />
        )}
        {activeTab === 'docs' && (
          <DocumentationCoverage project={project} onOpenDrawer={onOpenDrawer} />
        )}
        {activeTab === 'activity' && (
          <ActivityPanel project={project} onOpenDrawer={onOpenDrawer} />
        )}
      </div>
    </div>
  );
}
