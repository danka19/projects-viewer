import type { DrawerItem, ProjectData } from '../types';
import { decisionDrawer } from '../drawer';
import Section from './Section';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function DecisionsPanel({ project, onOpenDrawer }: Props) {
  if (project.decisions.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-mute">
          No decisions detected. Decisions are parsed from dated decision prose, “Human/Key
          Decisions” sections, and decision files.
        </p>
      </div>
    );
  }

  const dated = project.decisions.filter((d) => d.date);
  const undated = project.decisions.filter((d) => !d.date);

  return (
    <div className="space-y-4">
      <Section title="Dated decisions" count={dated.length} accent="text-accent-ink">
        <DecisionList items={dated} project={project} onOpenDrawer={onOpenDrawer} />
      </Section>
      {undated.length > 0 && (
        <Section title="Decision-section items" count={undated.length} defaultOpen={false}>
          <DecisionList items={undated} project={project} onOpenDrawer={onOpenDrawer} />
        </Section>
      )}
    </div>
  );
}

function DecisionList({
  items,
  project,
  onOpenDrawer,
}: {
  items: ProjectData['decisions'];
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((d, i) => (
        <li key={i}>
          <button
            onClick={() => onOpenDrawer(decisionDrawer(d, project))}
            className="flex w-full items-start gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
          >
            <span className="mt-0.5 w-20 flex-none font-mono text-[10px] text-accent-ink/80">
              {d.date ?? '—'}
            </span>
            <span className="line-clamp-2 min-w-0 text-sm leading-snug text-mute">
              {d.text}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
