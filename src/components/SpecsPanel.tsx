import type { DrawerItem, ProjectData, SpecItem } from '../types';
import { SPEC_STATUS_CHIP } from '../statusMeta';
import { docDrawer, specDrawer } from '../drawer';
import Section from './Section';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

const GROUPS: { title: string; match: (s: SpecItem) => boolean; empty?: true }[] = [
  { title: 'Active proposals', match: (s) => s.status === 'active' },
  { title: 'Accepted / done', match: (s) => s.status === 'done' },
  { title: 'Archived', match: (s) => s.status === 'archived' },
  { title: 'Other', match: (s) => !['active', 'done', 'archived'].includes(s.status) },
];

export default function SpecsPanel({ project, onOpenDrawer }: Props) {
  const specDocs = project.docs.filter((d) => d.category === 'spec');
  const hasAnything = project.specs.length > 0 || specDocs.length > 0;

  if (!hasAnything) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-mute">
          No SDD, spec, proposal, or design documents detected in this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = project.specs.filter(g.match);
        if (items.length === 0) return null;
        return (
          <Section key={g.title} title={g.title} count={items.length}>
            <ul className="space-y-2">
              {items.map((sp, i) => (
                <li key={i}>
                  <button
                    onClick={() => onOpenDrawer(specDrawer(sp, project))}
                    className="flex w-full flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg border border-line bg-void/30 px-3 py-2 text-left transition-colors hover:border-slate-500/40"
                  >
                    <span className="font-mono text-[10px] tracking-wider text-faint uppercase">
                      {sp.kind}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{sp.name}</span>
                    <span
                      className={`rounded border px-1.5 py-px font-mono text-[10px] ${SPEC_STATUS_CHIP[sp.status] ?? SPEC_STATUS_CHIP.unknown}`}
                    >
                      {sp.status}
                    </span>
                    {sp.artifacts && sp.artifacts.length > 0 && (
                      <span className="font-mono text-[10px] text-faint">
                        {sp.artifacts.join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}

      {specDocs.length > 0 && (
        <Section title="Spec documents" count={specDocs.length} defaultOpen={project.specs.length === 0}>
          <ul className="space-y-1.5">
            {specDocs.map((d) => (
              <li key={d.file}>
                <button
                  onClick={() => onOpenDrawer(docDrawer(d, project))}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left font-mono text-xs text-slate-300 transition-colors hover:bg-void/40 hover:text-ink"
                >
                  {d.file}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
