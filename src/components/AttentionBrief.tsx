import { useMemo, useState } from 'react';
import type { DrawerItem, ProjectData, TabId } from '../types';
import { blockerDrawer, phaseDrawer } from '../drawer';

/**
 * Cross-project attention brief: four prioritized groups instead of equal
 * inventory metrics. Every count opens the exact matching global result set —
 * the number shown always equals the number of listed items.
 */

export type AttentionGroupId = 'decisions' | 'blockers' | 'active' | 'between';

export interface AttentionItem {
  project: ProjectData;
  label: string;
  sub: string;
  tab: TabId;
  drawer?: DrawerItem;
}

interface AttentionGroup {
  id: AttentionGroupId;
  title: string;
  hint: string;
  accent: string;
  items: AttentionItem[];
}

export function buildAttentionGroups(projects: ProjectData[]): AttentionGroup[] {
  const decisions: AttentionItem[] = [];
  const blockers: AttentionItem[] = [];
  const active: AttentionItem[] = [];
  const between: AttentionItem[] = [];

  for (const p of projects) {
    for (const gate of p.signalGroups.approvalGates) {
      decisions.push({
        project: p,
        label: gate.text,
        sub: `${p.name} · approval gate`,
        tab: 'work',
        drawer: blockerDrawer(gate, p),
      });
    }
    for (const ph of p.phases) {
      if (ph.status === 'pending_acceptance') {
        decisions.push({
          project: p,
          label: `Phase ${ph.id} — ${ph.name}`,
          sub: `${p.name} · implemented, awaiting owner acceptance`,
          tab: 'status',
          drawer: phaseDrawer(ph, p),
        });
      }
      if (ph.status === 'in_progress') {
        active.push({
          project: p,
          label: `Phase ${ph.id} — ${ph.name}`,
          sub: `${p.name} · in progress`,
          tab: 'status',
          drawer: phaseDrawer(ph, p),
        });
      }
    }
    for (const b of p.signalGroups.realBlockers) {
      blockers.push({
        project: p,
        label: b.text,
        sub: `${p.name} · ${b.kind === 'rejection' ? 'rejection / acceptance gap' : 'real blocker'}`,
        tab: 'work',
        drawer: blockerDrawer(b, p),
      });
    }
    const hasActivePhase = p.phases.some((ph) => ph.status === 'in_progress');
    if (!hasActivePhase && p.status !== 'done' && p.status !== 'unknown') {
      between.push({
        project: p,
        label:
          p.phases.length === 0
            ? 'No roadmap phases documented'
            : 'No active phase — between phases',
        sub: `${p.name} · ${p.statusReason}`,
        tab: 'status',
      });
    }
  }

  return [
    {
      id: 'decisions',
      title: 'Owner decisions',
      hint: 'Approval gates and phases implemented but awaiting acceptance',
      accent: 'text-gate',
      items: decisions,
    },
    {
      id: 'blockers',
      title: 'Real blockers',
      hint: 'Work that documents an actual inability to continue',
      accent: 'text-danger',
      items: blockers,
    },
    {
      id: 'active',
      title: 'Active work',
      hint: 'Phases explicitly documented as in progress',
      accent: 'text-info',
      items: active,
    },
    {
      id: 'between',
      title: 'Between phases',
      hint: 'Projects with no explicit active phase or no roadmap',
      accent: 'text-warn',
      items: between,
    },
  ];
}

interface Props {
  projects: ProjectData[];
  onOpenItem: (item: AttentionItem) => void;
}

export default function AttentionBrief({ projects, onOpenItem }: Props) {
  const groups = useMemo(() => buildAttentionGroups(projects), [projects]);
  const [openGroup, setOpenGroup] = useState<AttentionGroupId | null>(null);
  const expanded = groups.find((g) => g.id === openGroup && g.items.length > 0) ?? null;

  return (
    <section aria-label="Cross-project attention brief">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            title={group.hint}
            aria-expanded={openGroup === group.id}
            aria-controls={openGroup === group.id ? 'attention-results' : undefined}
            onClick={() => setOpenGroup((prev) => (prev === group.id ? null : group.id))}
            disabled={group.items.length === 0}
            className={`glass rounded-xl px-4 py-3 text-left transition-all duration-150 ${
              openGroup === group.id
                ? 'border-accent/60'
                : group.items.length === 0
                  ? 'cursor-default border-line'
                  : 'hover:border-line-strong'
            }`}
          >
            <p className="truncate font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              {group.title}
            </p>
            <p className={`mt-1 font-display text-[22px] leading-none font-semibold ${group.items.length > 0 ? group.accent : 'text-mute'}`}>
              {group.items.length}
            </p>
            <p className="mt-1 truncate text-[11px] text-mute">
              {group.items.length === 0 ? 'nothing waiting' : 'open the full list'}
            </p>
          </button>
        ))}
      </div>

      {expanded && (
        <div
          id="attention-results"
          role="region"
          aria-label={`${expanded.title}: ${expanded.items.length} items across all projects`}
          className="glass mt-3 rounded-xl p-4"
        >
          <div className="flex items-baseline gap-3">
            <h3 className="font-mono text-[11px] font-medium tracking-[0.18em] text-mute uppercase">
              {expanded.title} · {expanded.items.length}
            </h3>
            <p className="min-w-0 flex-1 truncate text-[11px] text-faint">{expanded.hint}</p>
            <button
              type="button"
              onClick={() => setOpenGroup(null)}
              className="rounded-lg border border-line px-2 py-0.5 font-mono text-[10px] text-mute transition-colors hover:text-ink"
            >
              Close
            </button>
          </div>
          <ul className="scroll-slim mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {expanded.items.map((item, i) => (
              <li key={`${item.project.path}:${i}`}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className="flex w-full items-baseline gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
                >
                  <span className="w-40 flex-none truncate font-mono text-[11px] text-accent-ink">
                    {item.project.name}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-[13px] text-ink">{item.label}</span>
                    <span className="line-clamp-1 font-mono text-[10px] text-faint">
                      {item.sub}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
