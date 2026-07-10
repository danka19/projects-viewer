import type { DrawerItem, ProjectData, TaskItem } from '../types';
import { BLOCKER_META } from '../statusMeta';
import {
  blockedGatedCandidateDrawer,
  blockerDrawer,
  markerDrawer,
  riskDrawer,
  taskDrawer,
} from '../drawer';
import Section from './Section';

interface Props {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}

const MARKER_STYLES: Record<string, string> = {
  TODO: 'bg-warn/10 text-warn border-warn/30',
  FIXME: 'bg-danger/10 text-danger border-danger/30',
  BUG: 'bg-danger/10 text-danger border-danger/30',
  NEXT: 'bg-accent/10 text-accent-ink border-accent/30',
  DONE: 'bg-ok/10 text-ok border-ok/30',
};

export default function TasksPanel({ project, onOpenDrawer }: Props) {
  const groups = project.signalGroups;
  return (
    <div className="space-y-4">
      <Section title="Next up" count={project.nextTasks.length} accent="text-accent-ink">
        <TaskButtons
          items={project.nextTasks}
          kind="Next action"
          descriptorKind="next-action"
          project={project}
          onOpenDrawer={onOpenDrawer}
          empty="No next actions, NEXT markers, or tasks under a “Next” heading."
        />
      </Section>

      <Section title="Open tasks" count={project.openTasks.length}>
        <TaskButtons
          items={project.openTasks}
          kind="Open task"
          project={project}
          onOpenDrawer={onOpenDrawer}
          empty="No open checkbox tasks found in documentation."
        />
      </Section>

      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="font-mono text-[11px] font-medium tracking-[0.18em] text-mute uppercase">
          Work constraints
        </h3>
        <span className="font-mono text-[10px] text-faint">
          {project.blockedGatedDiagnostics.summary.includedProjectSignalCount} included В·{' '}
          {project.blockedGatedDiagnostics.summary.filteredOutCount} filtered
        </span>
      </div>

      <SignalSection
        title="Real blockers"
        tooltip="Actual inability to continue: blocked, failing, missing required data, unavailable dependency, or an acceptance gap that prevents completion."
        items={groups.realBlockers}
        project={project}
        onOpenDrawer={onOpenDrawer}
        accent={groups.realBlockers.length > 0 ? 'text-danger' : 'text-mute'}
        empty="No real blockers recorded."
        defaultOpen={groups.realBlockers.length > 0}
      />

      <SignalSection
        title="Approval gates"
        tooltip="Normal owner/SDD approval gates: pending approval, merge approval, or completed work waiting for approval."
        items={groups.approvalGates}
        project={project}
        onOpenDrawer={onOpenDrawer}
        accent={groups.approvalGates.length > 0 ? 'text-accent-ink' : 'text-mute'}
        empty="No approval gates recorded."
      />

      <SignalSection
        title="Needs review"
        tooltip="Review or validation work: needs review, pending review, needs verification, requires validation, or final review."
        items={groups.needsReview}
        project={project}
        onOpenDrawer={onOpenDrawer}
        accent={groups.needsReview.length > 0 ? 'text-review' : 'text-mute'}
        empty="No review items recorded."
      />

      <SignalSection
        title="Paused / deferred"
        tooltip="Work intentionally paused, on hold, deferred, planned later, or marked resume later."
        items={groups.pausedDeferred}
        project={project}
        onOpenDrawer={onOpenDrawer}
        accent={groups.pausedDeferred.length > 0 ? 'text-mute' : 'text-mute'}
        empty="No paused or deferred work recorded."
      />

      <ConstraintDiagnostics project={project} onOpenDrawer={onOpenDrawer} />

      <Section
        title="Risks & open questions"
        count={project.risks.length}
        accent={project.risks.length > 0 ? 'text-warn' : 'text-mute'}
        defaultOpen={false}
      >
        {project.risks.length === 0 ? (
          <Empty text="No risk sections or open questions found." />
        ) : (
          <ul className="space-y-1.5">
            {project.risks.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => onOpenDrawer(riskDrawer(r, project))}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
                >
                  <span className="mt-0.5 rounded border border-warn/30 bg-warn/10 px-1.5 py-px font-mono text-[10px] whitespace-nowrap text-warn">
                    {r.kind === 'open-question' ? 'question' : 'risk'}
                  </span>
                  <span className="line-clamp-2 min-w-0 text-sm leading-snug text-mute">
                    {r.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Attention markers"
        count={project.markers.length}
        accent={project.markers.length > 0 ? 'text-warn' : 'text-mute'}
        defaultOpen={false}
      >
        {project.markers.length === 0 ? (
          <Empty text="No TODO / FIXME / BUG / NEXT / DONE markers found." />
        ) : (
          <ul className="space-y-1.5">
            {project.markers.map((m, i) => (
              <li key={i}>
                <button
                  onClick={() => onOpenDrawer(markerDrawer(m, project))}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
                >
                  <span
                    className={`mt-0.5 rounded border px-1.5 py-px font-mono text-[10px] ${MARKER_STYLES[m.type] ?? 'border-dim/40 bg-dim/10 text-dim'}`}
                  >
                    {m.type}
                  </span>
                  <span className="line-clamp-2 min-w-0 text-sm leading-snug text-mute">
                    {m.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Completed tasks"
        count={project.completedTasks.length}
        accent="text-ok"
        defaultOpen={false}
      >
        <TaskButtons
          items={project.completedTasks}
          kind="Completed task"
          project={project}
          onOpenDrawer={onOpenDrawer}
          empty="No completed checkbox tasks found."
          done
        />
      </Section>
    </div>
  );
}

function SignalSection({
  title,
  tooltip,
  items,
  project,
  onOpenDrawer,
  accent,
  empty,
  defaultOpen = false,
}: {
  title: string;
  tooltip: string;
  items: ProjectData['blockers'];
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
  accent: string;
  empty: string;
  defaultOpen?: boolean;
}) {
  return (
    <Section title={title} count={items.length} accent={accent} defaultOpen={defaultOpen}>
      <div title={tooltip}>
        {items.length === 0 ? (
          <Empty text={empty} />
        ) : (
          <ul className="space-y-1.5">
            {items.map((b, i) => (
              <li key={i}>
                <button
                  onClick={() => onOpenDrawer(blockerDrawer(b, project))}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
                >
                  <span
                    className={`mt-0.5 rounded border px-1.5 py-px font-mono text-[10px] whitespace-nowrap ${BLOCKER_META[b.kind]?.chip ?? ''}`}
                  >
                    {BLOCKER_META[b.kind]?.label ?? b.kind}
                  </span>
                  <span className="line-clamp-2 min-w-0 text-sm leading-snug text-mute">
                    {b.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function ConstraintDiagnostics({
  project,
  onOpenDrawer,
}: {
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
}) {
  const d = project.blockedGatedDiagnostics;
  const groups = [
    ['Included project signals', d.includedProjectSignals],
    ['Filtered agent rules', d.filteredAgentRules],
    ['Filtered process policies', d.filteredProcessPolicies],
    ['Filtered examples/templates', d.filteredExamplesOrTemplates],
  ] as const;
  return (
    <Section
      title="Constraint diagnostics"
      count={d.summary.oldRawCandidateCount}
      accent={d.summary.filteredOutCount > 0 ? 'text-mute' : 'text-mute'}
      defaultOpen={false}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <DiagnosticCount label="Raw" value={d.summary.oldRawCandidateCount} />
        <DiagnosticCount label="Included" value={d.summary.includedProjectSignalCount} />
        <DiagnosticCount label="Filtered" value={d.summary.filteredOutCount} />
        <DiagnosticCount label="Agent rules" value={d.summary.filteredAgentRuleCount} />
      </div>
      <div className="space-y-3">
        {groups.map(([label, items]) => (
          <div key={label}>
            <p className="mb-1.5 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              {label} В· {items.length}
            </p>
            {items.length === 0 ? (
              <Empty text="No candidates in this bucket." />
            ) : (
              <ul className="space-y-1">
                {items.slice(0, 40).map((item, i) => (
                  <li key={`${item.file}:${item.line}:${i}`}>
                    <button
                      onClick={() => onOpenDrawer(blockedGatedCandidateDrawer(item, project))}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
                    >
                      <span className="mt-0.5 rounded border border-dim/40 bg-dim/10 px-1.5 py-px font-mono text-[10px] whitespace-nowrap text-dim">
                        {item.confidence}
                      </span>
                      <span className="min-w-0 text-sm leading-snug text-mute">
                        <span className="line-clamp-2">{item.text}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-faint">
                          {item.file}:{item.line} В· {item.reason}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function DiagnosticCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-void/30 px-2.5 py-2">
      <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-ok/60" />
      <p className="text-sm text-faint">{text}</p>
    </div>
  );
}

function TaskButtons({
  items,
  kind,
  project,
  onOpenDrawer,
  empty,
  done = false,
  descriptorKind = 'task',
}: {
  items: TaskItem[];
  kind: string;
  project: ProjectData;
  onOpenDrawer: (item: DrawerItem) => void;
  empty: string;
  done?: boolean;
  descriptorKind?: 'task' | 'next-action';
}) {
  if (items.length === 0) return <Empty text={empty} />;
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i}>
          <button
            onClick={() => onOpenDrawer(taskDrawer(t, project, kind, descriptorKind))}
            className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-void/40"
          >
            <span className={`mt-px ${done ? 'text-ok' : 'text-faint'}`}>
              {done ? '☑' : '☐'}
            </span>
            <span className="line-clamp-2 min-w-0 text-sm leading-snug text-mute">
              {t.text}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
