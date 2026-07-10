import type { AuditDoc, DrawerItem, ProjectData } from '../types';
import { AUDIT_STATUS_CHIP } from '../statusMeta';
import { auditDrawer } from '../drawer';
import Section from './Section';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

export default function AuditsPanel({ project, onOpenDrawer }: Props) {
  if (project.audits.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-mute">
          No audit, review, verification, or checklist documents detected.
        </p>
      </div>
    );
  }

  const attention = project.audits.filter((a) => a.status === 'attention');
  const latest = project.audits.slice(0, 5);
  const recorded = project.audits.filter((a) => a.status === 'recorded');
  const archived = project.audits.filter((a) => a.status === 'archived');

  return (
    <div className="space-y-4">
      {attention.length > 0 && (
        <Section title="Attention" count={attention.length} accent="text-danger">
          <AuditList items={attention} project={project} onOpenDrawer={onOpenDrawer} />
        </Section>
      )}
      <Section title="Latest" count={latest.length}>
        <AuditList items={latest} project={project} onOpenDrawer={onOpenDrawer} />
      </Section>
      {recorded.length > 0 && (
        <Section title="Recorded / passed" count={recorded.length} defaultOpen={false}>
          <AuditList items={recorded} project={project} onOpenDrawer={onOpenDrawer} />
        </Section>
      )}
      {archived.length > 0 && (
        <Section title="Archived / superseded" count={archived.length} defaultOpen={false}>
          <AuditList items={archived} project={project} onOpenDrawer={onOpenDrawer} />
        </Section>
      )}
    </div>
  );
}

function AuditList({
  items,
  project,
  onOpenDrawer,
}: {
  items: AuditDoc[];
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.file}>
          <button
            onClick={() => onOpenDrawer(auditDrawer(a, project))}
            className="flex w-full flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg border border-line bg-void/30 px-3 py-2 text-left transition-colors hover:border-line-strong"
          >
            <span className="font-mono text-[10px] text-accent-ink">{a.date}</span>
            <span className="min-w-0 text-sm font-medium text-ink">{a.title}</span>
            <span
              className={`rounded border px-1.5 py-px font-mono text-[10px] ${AUDIT_STATUS_CHIP[a.status]}`}
            >
              {a.status}
            </span>
            {a.severeSignals > 0 && (
              <span className="font-mono text-[10px] text-danger">
                {a.severeSignals} signal{a.severeSignals === 1 ? '' : 's'}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
