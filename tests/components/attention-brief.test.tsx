import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttentionBrief, { buildAttentionGroups } from '../../src/components/AttentionBrief';
import { makePhase, makeProject } from './fixtures';
import type { BlockerItem } from '../../src/types';

afterEach(cleanup);

function blocker(overrides: Partial<BlockerItem> = {}): BlockerItem {
  return {
    group: 'realBlockers',
    kind: 'blocked',
    severe: true,
    text: 'Import job is blocked by missing data.',
    file: 'docs/ROADMAP.md',
    line: 4,
    ...overrides,
  };
}

function fixtureProjects() {
  const withGate = makeProject({
    name: 'gated',
    path: 'C:/tmp/gated',
    status: 'pending-approval',
    phases: [
      makePhase({ id: '1', status: 'pending_acceptance', name: 'Waiting', line: 3 }),
      makePhase({ id: '2', status: 'planned', line: 9 }),
    ],
  });
  withGate.signalGroups.approvalGates = [
    blocker({ group: 'approvalGates', kind: 'approval-gate', severe: false, text: 'Merge requires owner approval.' }),
  ];

  const withBlocker = makeProject({
    name: 'blocked-project',
    path: 'C:/tmp/blocked',
    status: 'needs-attention',
    phases: [makePhase({ id: '1', status: 'in_progress', line: 3 })],
  });
  withBlocker.signalGroups.realBlockers = [blocker(), blocker({ text: 'Vendor API unavailable.', line: 9 })];

  const done = makeProject({
    name: 'done-project',
    path: 'C:/tmp/done',
    status: 'done',
    phases: [makePhase({ id: '1', status: 'closed', line: 3 })],
  });

  return [withGate, withBlocker, done];
}

describe('buildAttentionGroups', () => {
  it('assigns items to the four prioritized groups with matching counts', () => {
    const groups = buildAttentionGroups(fixtureProjects());
    const byId = Object.fromEntries(groups.map((g) => [g.id, g]));

    // 1 approval gate + 1 pending-acceptance phase.
    expect(byId.decisions.items).toHaveLength(2);
    expect(byId.blockers.items).toHaveLength(2);
    // one explicit in_progress phase.
    expect(byId.active.items).toHaveLength(1);
    expect(byId.active.items[0].label).toMatch(/Phase 1/);
    // gated project has no in_progress phase; done project is excluded.
    expect(byId.between.items).toHaveLength(1);
    expect(byId.between.items[0].project.name).toBe('gated');
  });

  it('never counts a done project as between phases or active work', () => {
    const groups = buildAttentionGroups([
      makeProject({ status: 'done', phases: [makePhase({ id: '1', status: 'closed' })] }),
    ]);
    for (const g of groups) expect(g.items).toHaveLength(0);
  });
});

describe('AttentionBrief component', () => {
  it('shows counts whose expanded global result set has exactly that many items', async () => {
    const user = userEvent.setup();
    render(<AttentionBrief projects={fixtureProjects()} onOpenItem={vi.fn()} />);

    const decisionsCard = screen.getByRole('button', { name: /Owner decisions/i });
    expect(within(decisionsCard).getByText('2')).toBeInTheDocument();

    await user.click(decisionsCard);
    const results = screen.getByRole('region', { name: /Owner decisions: 2 items/i });
    expect(within(results).getAllByRole('listitem')).toHaveLength(2);
  });

  it('opens the matching item target when a global result is activated', async () => {
    const user = userEvent.setup();
    const onOpenItem = vi.fn();
    render(<AttentionBrief projects={fixtureProjects()} onOpenItem={onOpenItem} />);

    await user.click(screen.getByRole('button', { name: /Real blockers/i }));
    await user.click(screen.getByRole('button', { name: /Vendor API unavailable/i }));
    expect(onOpenItem).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: 'work',
        label: 'Vendor API unavailable.',
        project: expect.objectContaining({ path: 'C:/tmp/blocked' }),
      }),
    );
  });

  it('disables empty groups instead of opening an empty result set', () => {
    render(
      <AttentionBrief
        projects={[makeProject({ status: 'done', phases: [] })]}
        onOpenItem={vi.fn()}
      />,
    );
    for (const name of [/Owner decisions/i, /Real blockers/i, /Active work/i]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });
});
