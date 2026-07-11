import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectTimeline from '../../src/timeline/ProjectTimeline';
import { buildProjectTimelineModel } from '../../src/timeline/model';
import { makePhase, makeProject, makeStep } from './fixtures';

const originalScrollTo = Element.prototype.scrollTo;

afterEach(() => {
  cleanup();
  Element.prototype.scrollTo = originalScrollTo;
  vi.restoreAllMocks();
});

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

  it('describes lifecycle confidence and integrity issues to assistive technology', () => {
    renderTimeline(
      makeProject({
        phases: [
          makePhase({
            id: '4',
            name: 'Risky handoff',
            status: 'blocked',
            confidence: 'low',
            issue: 'documentation',
            issueNote: 'Roadmap and phase plan disagree.',
          }),
        ],
      }),
    );

    const phase = screen.getByRole('button', { name: /Phase 4 Risky handoff, blocked/i });
    expect(phase).toHaveClass('relative');
    expect(phase).toHaveAccessibleDescription(
      /low confidence.*documentation issue.*Roadmap and phase plan disagree/i,
    );
    expect(screen.getByText('⚠ check')).toHaveClass('text-danger');
    expect(screen.getByText('⚠ check').className).not.toContain('text-danger/');
  });

  it('renders every lifecycle status label with an unattenuated semantic text token', () => {
    renderTimeline(
      makeProject({
        phases: [
          makePhase({ id: '1', name: 'Draft phase', status: 'draft' }),
          makePhase({ id: '2', name: 'Ready phase', status: 'ready' }),
          makePhase({
            id: '3',
            name: 'Accepted phase',
            status: 'accepted',
            steps: [makeStep({ id: '3.1', name: 'Draft step', status: 'draft' })],
          }),
        ],
      }),
    );

    for (const [phaseName, status] of [
      ['Draft phase', 'draft'],
      ['Ready phase', 'ready'],
      ['Accepted phase', 'accepted'],
    ]) {
      const phase = screen.getByRole('button', { name: new RegExp(phaseName, 'i') });
      expect(within(phase).getByText(status, { exact: true }).className).not.toMatch(/text-\w+\//);
    }

    fireEvent.click(screen.getByRole('button', { name: /Accepted phase/i }));
    const draftStep = screen.getByRole('button', { name: /Draft step, draft/i });
    expect(within(draftStep).getByText('draft', { exact: true }).className).not.toMatch(
      /text-\w+\//,
    );
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

  it('centers a phase once after pointer activation expands it', async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    renderTimeline(projectWithCurrent());
    const viewport = screen.getByLabelText('Phase timeline, scrolls horizontally');
    const hardening = screen.getByRole('button', { name: /Hardening/i });
    scrollTo.mockClear();

    await user.click(hardening);

    expect(scrollTo.mock.contexts).toContain(viewport);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('expanding a phase without steps shows the no-steps state with details access', async () => {
    const user = userEvent.setup();
    const { onOpenDrawer } = renderTimeline(projectWithCurrent());
    const planned = screen.getByRole('button', { name: /Hardening/i });
    await user.click(planned);

    expect(screen.getByText(/No steps documented for this phase/i)).toBeInTheDocument();
    const phaseDetails = screen.getByRole('button', { name: /^Phase details/i });
    const emptyPhaseDetails = screen.getByRole('button', { name: /Open phase details/i });
    expect(phaseDetails.id).toMatch(/^tl-phase-details-/);
    expect(emptyPhaseDetails.id).toMatch(/^tl-phase-empty-details-/);
    expect(emptyPhaseDetails.id).not.toBe(phaseDetails.id);
    await user.click(emptyPhaseDetails);
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

  it('restores only a matching timeline descriptor and rejects a stale revision', () => {
    const project = projectWithCurrent();
    const model = buildProjectTimelineModel(project, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    const hardening = model.phases[2];

    renderTimeline(project, {
      restoredDescriptor: {
        projectId: model.projectId,
        revision: model.revision,
        expandedPhaseKey: hardening.key,
      },
    });
    expect(screen.getByRole('button', { name: /Hardening/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Delivery/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    cleanup();
    renderTimeline(project, {
      restoredDescriptor: {
        projectId: model.projectId,
        revision: 'stale-revision',
        expandedPhaseKey: hardening.key,
      },
    });
    expect(screen.getByRole('button', { name: /Delivery/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Hardening/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('emits a stable descriptor for user-driven expansion and collapse', async () => {
    const user = userEvent.setup();
    const project = projectWithCurrent();
    const model = buildProjectTimelineModel(project, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    const onDescriptorChange = vi.fn();
    renderTimeline(project, { onDescriptorChange });
    const hardening = screen.getByRole('button', { name: /Hardening/i });

    await user.click(hardening);
    expect(onDescriptorChange).toHaveBeenLastCalledWith({
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: model.phases[2].key,
    });

    await user.click(hardening);
    expect(onDescriptorChange).toHaveBeenLastCalledWith({
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: null,
    });
  });

  it('restores an external null descriptor to the current-phase default', () => {
    const project = projectWithCurrent();
    const model = buildProjectTimelineModel(project, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    const descriptor = {
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: model.phases[2].key,
    };
    const { rerender } = renderTimeline(project, { restoredDescriptor: descriptor });
    expect(screen.getByRole('button', { name: /Hardening/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    rerender(
      <ProjectTimeline
        project={project}
        generatedAt="2026-07-11T00:00:00.000Z"
        sourceMode="live"
        restoredDescriptor={null}
        onOpenDrawer={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Delivery/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Hardening/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('prioritizes an external descriptor change when the model revision changes too', () => {
    const project = projectWithCurrent();
    const model = buildProjectTimelineModel(project, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    const descriptor = {
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: model.phases[2].key,
    };
    const { rerender } = renderTimeline(project, { restoredDescriptor: descriptor });
    const refreshed = {
      ...project,
      phases: project.phases.map((phase, index) =>
        index === 0 ? { ...phase, status: 'accepted' as const } : phase,
      ),
    };

    rerender(
      <ProjectTimeline
        project={refreshed}
        generatedAt="2026-07-11T00:00:00.000Z"
        sourceMode="live"
        restoredDescriptor={null}
        onOpenDrawer={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Delivery/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Hardening/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('reconciles a surviving expansion across revision refresh and emits replace normalization', () => {
    const project = projectWithCurrent();
    const model = buildProjectTimelineModel(project, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    const descriptor = {
      projectId: model.projectId,
      revision: model.revision,
      expandedPhaseKey: model.phases[2].key,
    };
    const onDescriptorChange = vi.fn();
    const { rerender } = renderTimeline(project, {
      restoredDescriptor: descriptor,
      onDescriptorChange,
    });
    const refreshed = {
      ...project,
      phases: project.phases.map((phase, index) =>
        index === 0 ? { ...phase, status: 'accepted' as const } : phase,
      ),
    };
    const refreshedModel = buildProjectTimelineModel(refreshed, {
      generatedAt: '2026-07-11T00:00:00.000Z',
      sourceMode: 'live',
    });
    expect(refreshedModel.revision).not.toBe(model.revision);

    rerender(
      <ProjectTimeline
        project={refreshed}
        generatedAt="2026-07-11T00:00:00.000Z"
        sourceMode="live"
        restoredDescriptor={descriptor}
        onDescriptorChange={onDescriptorChange}
        onOpenDrawer={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Hardening/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(onDescriptorChange).toHaveBeenLastCalledWith(
      {
        projectId: refreshedModel.projectId,
        revision: refreshedModel.revision,
        expandedPhaseKey: refreshedModel.phases[2].key,
      },
      'replace',
    );
  });
});

describe('step lifecycle presentation', () => {
  it('renders a child axis with lifecycle connectors and compact evidence summaries', () => {
    renderTimeline(projectWithCurrent());
    const steps = screen.getByRole('region', { name: 'Step timeline, scrolls horizontally' });
    const items = within(steps).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('[data-step-axis-node]')).toHaveClass('bg-ok');
    expect(items[1].querySelector('[data-step-axis-node]')).toHaveClass('bg-info');
    expect(items[2].querySelector('[data-step-axis-node]')).toHaveClass('border-mute');
    expect(items[2].querySelector('.tl-step-seg')).toHaveClass('border-dashed', 'border-mute');
    expect(within(items[0]).getByText('fixture evidence')).toBeInTheDocument();
  });

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

  it('announces the phase that was actually collapsed when Escape comes from another phase', async () => {
    const user = userEvent.setup();
    const onDescriptorChange = vi.fn();
    renderTimeline(projectWithCurrent(), { onDescriptorChange });
    const current = screen.getByRole('button', { name: /Delivery/i });
    const other = screen.getByRole('button', { name: /Hardening/i });

    other.focus();
    await user.keyboard('{Escape}');

    expect(current).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      /Phase 1 Delivery collapsed/i,
    );
    expect(onDescriptorChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ expandedPhaseKey: null }),
    );
  });
});

describe('horizontal viewport behavior', () => {
  it('stretches every phase card so the shared axis stays level with mixed content', () => {
    renderTimeline(projectWithCurrent());

    const phaseTrack = screen
      .getByRole('region', { name: 'Phase timeline, scrolls horizontally' })
      .querySelector('ol');
    expect(phaseTrack).toHaveClass('items-stretch');

    const phaseCards = screen.getAllByRole('button', { name: /^Phase \d/ });
    expect(phaseCards.length).toBeGreaterThan(1);
    for (const card of phaseCards) {
      expect(card).toHaveClass('flex-1');
      expect(card.parentElement).toHaveClass('flex-col');
    }
  });

  it('exposes named focusable local scroll regions with non-wrapping centered tracks', () => {
    renderTimeline(projectWithCurrent());

    const phases = screen.getByRole('region', {
      name: 'Phase timeline, scrolls horizontally',
    });
    const steps = screen.getByRole('region', {
      name: 'Step timeline, scrolls horizontally',
    });
    expect(phases).toHaveAttribute('tabindex', '0');
    expect(steps).toHaveAttribute('tabindex', '0');
    expect(phases.querySelector('ol')).toHaveClass('tl-phase-track', 'flex-nowrap');
    expect(steps.querySelector('ol')).toHaveClass('tl-step-track', 'flex-nowrap', 'gap-0');
    expect(within(phases).getByRole('list')).toHaveAccessibleName('3 phases');
    expect(within(steps).getByRole('list')).toHaveAccessibleName(
      '3 steps for phase 1 Delivery',
    );
    const phaseButtons = screen.getAllByRole('button', { name: /^Phase \d/ });
    const controlledIds = phaseButtons.map((phase) => phase.getAttribute('aria-controls'));
    for (const phase of phaseButtons) {
      expect(phase).toHaveAttribute('aria-controls');
    }
    expect(new Set(controlledIds).size).toBe(phaseButtons.length);
    const expanded = phaseButtons.find((phase) => phase.getAttribute('aria-expanded') === 'true');
    expect(expanded?.getAttribute('aria-controls')).toBe(
      screen.getByRole('region', { name: /Steps of phase 1 Delivery/i }).id,
    );
  });

  it('shows leading and trailing affordances from measured phase overflow', () => {
    renderTimeline(projectWithCurrent());
    const viewport = screen.getByLabelText('Phase timeline, scrolls horizontally');
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    fireEvent(window, new Event('resize'));
    expect(screen.queryByTestId('phase-overflow-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('phase-overflow-end')).toBeInTheDocument();

    viewport.scrollLeft = 250;
    fireEvent.scroll(viewport);
    expect(screen.getByTestId('phase-overflow-start')).toBeInTheDocument();
    expect(screen.getByTestId('phase-overflow-end')).toBeInTheDocument();

    viewport.scrollLeft = 600;
    fireEvent.scroll(viewport);
    expect(screen.getByTestId('phase-overflow-start')).toBeInTheDocument();
    expect(screen.queryByTestId('phase-overflow-end')).not.toBeInTheDocument();
  });

  it('updates Jump to current when resize clips or reveals the current phase', () => {
    renderTimeline(projectWithCurrent());
    const viewport = screen.getByLabelText('Phase timeline, scrolls horizontally');
    const current = screen.getByRole('button', { name: /Delivery.*current phase/i });
    let currentOffset = 500;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });
    Object.defineProperties(current, {
      offsetLeft: { configurable: true, get: () => currentOffset },
      offsetWidth: { configurable: true, value: 200 },
    });

    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('button', { name: 'Jump to current' })).toBeInTheDocument();

    currentOffset = 40;
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('button', { name: 'Jump to current' })).not.toBeInTheDocument();
  });

  it('measures overflow affordances independently for the nested step viewport', () => {
    renderTimeline(projectWithCurrent());
    const viewport = screen.getByLabelText('Step timeline, scrolls horizontally');
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 720 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    fireEvent(window, new Event('resize'));
    expect(screen.queryByTestId('step-overflow-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-overflow-end')).toBeInTheDocument();

    viewport.scrollLeft = 240;
    fireEvent.scroll(viewport);
    expect(screen.getByTestId('step-overflow-start')).toBeInTheDocument();
    expect(screen.getByTestId('step-overflow-end')).toBeInTheDocument();
  });

  it('starts measuring both axes when a loading fallback yields to the timeline', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    const project = projectWithCurrent();
    const { rerender } = renderTimeline(project, { initialLoading: true });
    expect(scrollTo).not.toHaveBeenCalled();

    rerender(
      <ProjectTimeline
        project={project}
        generatedAt="2026-07-11T00:00:00.000Z"
        sourceMode="live"
        onOpenDrawer={vi.fn()}
      />,
    );
    const phaseViewport = screen.getByLabelText('Phase timeline, scrolls horizontally');
    const stepViewport = screen.getByLabelText('Step timeline, scrolls horizontally');
    expect(scrollTo.mock.contexts).toContain(phaseViewport);
    expect(scrollTo.mock.contexts).toContain(stepViewport);
    Object.defineProperties(phaseViewport, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });
    Object.defineProperties(stepViewport, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 720 },
    });

    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('phase-overflow-end')).toBeInTheDocument();
    expect(screen.getByTestId('step-overflow-end')).toBeInTheDocument();

    const current = screen.getByRole('button', { name: /Delivery.*current phase/i });
    Object.defineProperties(current, {
      offsetLeft: { configurable: true, value: 500 },
      offsetWidth: { configurable: true, value: 200 },
    });
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('button', { name: 'Jump to current' })).toBeInTheDocument();
  });

  it('centers the explicit current phase and current step without recentering a routine refresh', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    const project = projectWithCurrent();
    const { rerender } = renderTimeline(project);
    const phaseViewport = screen.getByLabelText('Phase timeline, scrolls horizontally');
    const stepViewport = screen.getByLabelText('Step timeline, scrolls horizontally');

    expect(scrollTo.mock.contexts).toContain(phaseViewport);
    expect(scrollTo.mock.contexts).toContain(stepViewport);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    const initialCalls = scrollTo.mock.calls.length;

    rerender(
      <ProjectTimeline
        project={project}
        generatedAt="2026-07-11T00:01:00.000Z"
        sourceMode="live"
        refreshing
        onOpenDrawer={vi.fn()}
      />,
    );
    expect(scrollTo).toHaveBeenCalledTimes(initialCalls);
  });

  it('uses instant current-item centering when reduced motion is requested', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    renderTimeline(projectWithCurrent());
    const phaseViewport = screen.getByLabelText('Phase timeline, scrolls horizontally');
    const stepViewport = screen.getByLabelText('Step timeline, scrolls horizontally');

    const timelineCalls = scrollTo.mock.calls.filter((_, index) =>
      [phaseViewport, stepViewport].includes(scrollTo.mock.contexts[index] as HTMLElement),
    );
    expect(timelineCalls).toHaveLength(2);
    for (const [options] of timelineCalls) {
      expect(options).toEqual(expect.objectContaining({ behavior: 'auto' }));
    }
  });

  it('keeps status connectors and current focus at full token strength without muting whole cards', () => {
    renderTimeline(
      makeProject({
        phases: [
          makePhase({ id: '0', status: 'closed' }),
          makePhase({ id: '1', status: 'in_progress' }),
          makePhase({ id: '2', status: 'cancelled' }),
        ],
      }),
    );

    for (const card of screen.getAllByRole('button', { name: /^Phase / })) {
      expect(card.className).not.toMatch(/opacity-/);
    }
    const connectorClasses = Array.from(document.querySelectorAll('.tl-seg')).map(
      (segment) => segment.className,
    );
    expect(connectorClasses.some((name) => /border-(ok|info|dim)\//.test(name))).toBe(false);
    expect(document.querySelector('.ring-\\[var\\(--accent-ink\\)\\]')).toBeInTheDocument();
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

  it('keeps retained phases interactive and reports a failed stale refresh', () => {
    renderTimeline(projectWithCurrent(), {
      sourceMode: 'stale',
      error: 'watcher rescan failed',
    });
    expect(screen.getAllByRole('button', { name: /^Phase \d/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Delivery/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Refresh failed.*showing last loaded timeline.*watcher rescan failed/i,
    );
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
