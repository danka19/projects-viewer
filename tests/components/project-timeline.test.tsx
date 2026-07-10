import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectTimeline from '../../src/timeline/ProjectTimeline';
import { makePhase, makeProject, makeStep } from './fixtures';

afterEach(cleanup);

function renderTimeline(project = makeProject(), extra: Record<string, unknown> = {}) {
  const onOpenDrawer = vi.fn();
  const utils = render(
    <ProjectTimeline
      project={project}
      generatedAt="2026-07-11T00:00:00.000Z"
      sourceMode="live"
      onOpenDrawer={onOpenDrawer}
      {...extra}
    />,
  );
  return { ...utils, onOpenDrawer };
}

function projectWithCurrent() {
  return makeProject({
    phases: [
      makePhase({ id: '0', name: 'Foundation', status: 'closed', line: 3 }),
      makePhase({
        id: '1',
        name: 'Delivery',
        status: 'in_progress',
        line: 9,
        statusText: 'Status: in progress.',
        steps: [
          makeStep({ id: '1.1', name: 'Design', status: 'closed', line: 11 }),
          makeStep({ id: '1.2', name: 'Build', status: 'in_progress', line: 14 }),
          makeStep({ id: '1.3', name: 'Verify', status: 'planned', line: 17 }),
        ],
      }),
      makePhase({ id: '2', name: 'Hardening', status: 'planned', line: 21 }),
    ],
  });
}

describe('lifecycle presentation', () => {
  it('renders phases in order with visible status labels and non-color cues', () => {
    renderTimeline(projectWithCurrent());
    const phaseButtons = screen.getAllByRole('button', { name: /^Phase \d/ });
    expect(phaseButtons).toHaveLength(3);
    expect(phaseButtons[0]).toHaveAccessibleName(/Foundation, closed/i);
    expect(phaseButtons[1]).toHaveAccessibleName(/Delivery, in progress/i);
    expect(phaseButtons[2]).toHaveAccessibleName(/Hardening, planned/i);
  });

  it('marks only the explicit current phase with aria-current and expands it by default', () => {
    renderTimeline(projectWithCurrent());
    const current = screen.getByRole('button', { name: /Delivery.*current phase/i });
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(current).toHaveAttribute('aria-expanded', 'true');
    const others = screen
      .getAllByRole('button', { name: /^Phase \d/ })
      .filter((b) => b !== current);
    for (const other of others) expect(other).not.toHaveAttribute('aria-current');

    const stepRegion = screen.getByRole('region', { name: /Steps of phase 1 Delivery/i });
    expect(within(stepRegion).getAllByRole('button', { name: /^Step / })).toHaveLength(3);
    expect(
      within(stepRegion).getByRole('button', { name: /Build.*current step/i }),
    ).toHaveAttribute('aria-current', 'step');
  });

  it('shows a between-phases state without fabricating a current phase', () => {
    renderTimeline(
      makeProject({
        phases: [
          makePhase({ id: '0', status: 'closed', line: 3 }),
          makePhase({ id: '1', status: 'planned', line: 9 }),
        ],
      }),
    );
    expect(screen.getByText(/No active phase — project is between phases/i)).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: /^Phase \d/ })) {
      expect(button).not.toHaveAttribute('aria-current');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('shows an integrity warning for ambiguous current phases without fake emphasis', () => {
    renderTimeline(
      makeProject({
        phases: [
          makePhase({ id: '1', status: 'in_progress', line: 3 }),
          makePhase({ id: '2', status: 'in_progress', line: 9 }),
        ],
      }),
    );
    expect(screen.getByText(/Current phase ambiguous/i)).toBeInTheDocument();
    expect(screen.getByText(/2 phases are documented as in progress/i)).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: /^Phase \d/ })) {
      expect(button).not.toHaveAttribute('aria-current');
    }
  });

  it('renders known progress with basis and never fabricates unknown progress', () => {
    renderTimeline(
      makeProject({
        phases: [
          makePhase({ id: '0', status: 'closed', line: 3 }),
          makePhase({ id: '1', status: 'blocked', line: 9, statusText: 'Status: blocked by data.' }),
        ],
      }),
    );
    expect(
      screen.getByRole('button', { name: /Phase 0 .*100% implemented/i }),
    ).toBeInTheDocument();
    const blocked = screen.getByRole('button', { name: /^Phase 1 /i });
    expect(blocked).toHaveAccessibleName(/blocked/i);
    expect(blocked).not.toHaveAccessibleName(/%/);
  });

  it('legend lists only lifecycle groups present in the model with counts', () => {
    renderTimeline(projectWithCurrent());
    // Counts appear in the header summary and the legend; both are valid.
    expect(screen.getAllByText(/1 closed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 in progress/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 planned/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
  });
});

describe('expansion behavior', () => {
  it('expands exclusively, collapses on repeat, and keeps focus on the phase button', async () => {
    const user = userEvent.setup();
    renderTimeline(projectWithCurrent());
    const planned = screen.getByRole('button', { name: /Hardening/i });
    const current = screen.getByRole('button', { name: /Delivery/i });

    await user.click(planned);
    expect(planned).toHaveAttribute('aria-expanded', 'true');
    expect(current).toHaveAttribute('aria-expanded', 'false');
    expect(planned).toHaveFocus();

    await user.click(planned);
    expect(planned).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /Steps of phase/i })).not.toBeInTheDocument();
    expect(planned).toHaveFocus();
  });

  it('expanding a phase without steps shows the no-steps state with details access', async () => {
    const user = userEvent.setup();
    const { onOpenDrawer } = renderTimeline(projectWithCurrent());
    const planned = screen.getByRole('button', { name: /Hardening/i });
    await user.click(planned);

    expect(screen.getByText(/No steps documented for this phase/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open phase details/i }));
    expect(onOpenDrawer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Roadmap phase', title: expect.stringContaining('Hardening') }),
    );
  });

  it('announces expansion changes through a polite live region', async () => {
    const user = userEvent.setup();
    renderTimeline(projectWithCurrent());
    await user.click(screen.getByRole('button', { name: /Hardening/i }));
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent(/Phase 2 Hardening expanded: no steps documented/i);
  });

  it('step activation opens the read-only drawer with source evidence', async () => {
    const user = userEvent.setup();
    const { onOpenDrawer } = renderTimeline(projectWithCurrent());
    await user.click(screen.getByRole('button', { name: /Step 1\.1 Design/i }));
    expect(onOpenDrawer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Phase 1 step',
        file: 'docs/ROADMAP.md',
        line: 11,
      }),
    );
  });
});

describe('step lifecycle presentation', () => {
  it('renders every supported step status with a visible label', () => {
    const statuses = [
      'closed',
      'accepted',
      'in_progress',
      'pending_acceptance',
      'blocked',
      'deferred',
      'cancelled',
      'superseded',
      'planned',
      'draft',
      'ready',
    ] as const;
    renderTimeline(
      makeProject({
        phases: [
          makePhase({
            id: '1',
            status: 'in_progress',
            steps: statuses.map((status, i) =>
              makeStep({ id: `1.${i + 1}`, name: `Step ${status}`, status, line: i + 30 }),
            ),
          }),
        ],
      }),
    );
    for (const status of statuses) {
      expect(
        screen.getByRole('button', {
          name: new RegExp(`Step ${status}, ${status.replace('_', ' ')}`, 'i'),
        }),
      ).toBeInTheDocument();
    }
  });
});

describe('keyboard interaction', () => {
  it('supports arrow/home/end roving focus and enter/space toggling on phases', async () => {
    const user = userEvent.setup();
    renderTimeline(projectWithCurrent());
    const buttons = screen.getAllByRole('button', { name: /^Phase \d/ });

    buttons[1].focus(); // current
    await user.keyboard('{ArrowRight}');
    expect(buttons[2]).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(buttons[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(buttons[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape collapses; ArrowDown enters steps; ArrowUp returns to the phase', async () => {
    const user = userEvent.setup();
    renderTimeline(projectWithCurrent());
    const current = screen.getByRole('button', { name: /Delivery/i });

    current.focus();
    await user.keyboard('{ArrowDown}');
    const firstStep = screen.getByRole('button', { name: /Step 1\.1 Design/i });
    expect(firstStep).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Step 1\.2 Build/i })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: /Step 1\.3 Verify/i })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(firstStep).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(current).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(current).toHaveAttribute('aria-expanded', 'false');
    expect(current).toHaveFocus();
  });
});

describe('fallback states', () => {
  it('renders the empty state without a fake axis or progress', () => {
    renderTimeline(makeProject({ phases: [] }));
    expect(screen.getByText(/No roadmap phases detected/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Phase \d/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('renders a busy skeleton without fake statuses while initially loading', () => {
    renderTimeline(makeProject({ phases: [] }), { initialLoading: true });
    const section = screen.getByRole('region', { name: /Project timeline for/i });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a retryable error only in live mode', () => {
    const onRetry = vi.fn();
    renderTimeline(makeProject({ phases: [] }), { error: 'scan failed', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent(/scan failed/i);
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();

    cleanup();
    renderTimeline(makeProject({ phases: [] }), {
      error: 'scan failed',
      onRetry,
      sourceMode: 'static',
    });
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('keeps the rendered model visible during a background refresh', () => {
    renderTimeline(projectWithCurrent(), { refreshing: true });
    expect(screen.getAllByRole('button', { name: /^Phase \d/ })).toHaveLength(3);
    expect(screen.getByText(/refreshing…/i)).toBeInTheDocument();
    const section = screen.getByRole('region', { name: /Project timeline for/i });
    expect(section).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps a stale model visible and marks it stale', () => {
    renderTimeline(projectWithCurrent(), { sourceMode: 'stale' });
    expect(screen.getAllByRole('button', { name: /^Phase \d/ })).toHaveLength(3);
    expect(screen.getByText(/Stale data/i)).toBeInTheDocument();
  });

  it('discloses partial data as a visible warning', () => {
    const phases = Array.from({ length: 100 }, (_, i) =>
      makePhase({ id: String(i), line: i + 1 }),
    );
    renderTimeline(makeProject({ phases }));
    expect(screen.getByText(/Partial timeline/i)).toBeInTheDocument();
  });

  it('keeps compact metadata accessible with more than twelve phases', () => {
    const phases = Array.from({ length: 14 }, (_, i) =>
      makePhase({
        id: String(i),
        name: `Phase name ${i}`,
        line: i * 5 + 1,
        statusText: `Status: planned step ${i}.`,
      }),
    );
    renderTimeline(makeProject({ phases }));
    const buttons = screen.getAllByRole('button', { name: /^Phase \d/ });
    expect(buttons).toHaveLength(14);
    // Accessible names stay complete even when prose is visually compacted.
    expect(buttons[3]).toHaveAccessibleName(/Phase 3 Phase name 3, planned/i);
    expect(screen.queryByText('Status: planned step 3.')).not.toBeInTheDocument();
  });
});
