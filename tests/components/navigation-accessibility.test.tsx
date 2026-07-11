import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import type { DrawerItem, KnowledgeViewId, ScanOutput, TabId } from '../../src/types';
import DetailDrawer from '../../src/components/DetailDrawer';
import ProjectTabs from '../../src/components/ProjectTabs';
import { makePhase, makeProject, makeStep } from './fixtures';
import { UI_STATE_HISTORY_KEY } from '../../src/uiState';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, '');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const project = makeProject({
  decisions: [
    {
      text: 'Keep the dashboard read-only',
      date: '2026-07-11',
      file: 'docs/CONTEXT.md',
      line: 12,
    },
  ],
  docs: [
    {
      file: 'docs/README.md',
      category: 'other',
      sizeBytes: 100,
      modified: '2026-07-11T00:00:00.000Z',
    },
  ],
});

function ProjectTabsHarness() {
  const [activeTab, setActiveTab] = useState<TabId>('status');
  const [knowledgeView, setKnowledgeView] = useState<KnowledgeViewId>('specs');
  return (
    <ProjectTabs
      project={project}
      activeTab={activeTab}
      knowledgeView={knowledgeView}
      onSelectTab={setActiveTab}
      onSelectKnowledgeView={setKnowledgeView}
      onOpenDrawer={() => {}}
    />
  );
}

describe('secondary tab navigation', () => {
  it('exposes a roving tablist and linked tabpanel with Arrow/Home/End behavior', async () => {
    const user = userEvent.setup();
    render(<ProjectTabsHarness />);

    const tablist = screen.getByRole('tablist', { name: 'Project detail surfaces' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs.slice(1).every((tab) => tab.getAttribute('tabindex') === '-1')).toBe(true);

    const statusPanel = screen.getByRole('tabpanel', { name: /Status/i });
    expect(tabs[0]).toHaveAttribute('aria-controls', statusPanel.id);
    expect(statusPanel).toHaveAttribute('aria-labelledby', tabs[0].id);

    tabs[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Work/i })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Work/i })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Knowledge/i })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Knowledge/i })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /Status/i })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Status/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('gives the nested Knowledge views the same roving keyboard contract', async () => {
    const user = userEvent.setup();
    render(<ProjectTabsHarness />);

    await user.click(screen.getByRole('tab', { name: /Knowledge/i }));
    const nested = screen.getByRole('tablist', { name: 'Knowledge views' });
    const tabs = within(nested).getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('aria-controls');

    tabs[0].focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Activity/i })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Activity/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const panel = screen.getByRole('tabpanel', { name: /Activity/i });
    expect(panel).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('tab', { name: /Activity/i }).id,
    );
  });
});

function jsonResponse(value: unknown, ok = true, status = ok ? 200 : 404) {
  return { ok, status, json: async () => value } as Response;
}

function mockNavigationApp(
  data: ScanOutput,
  scanStatusOverride: Record<string, unknown> = {},
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/projects')) return jsonResponse(data);
      if (url.endsWith('/api/scan-status')) {
        return jsonResponse({
          status: 'success',
          lastScannedAt: data.generatedAt,
          durationMs: 1,
          scannedFilesCount: 1,
          skippedFilesCount: 0,
          error: null,
          trigger: 'startup',
          ...scanStatusOverride,
        });
      }
      if (url.endsWith('/api/config')) {
        return jsonResponse({
          workspaces: [],
          projects: [],
          settings: { watchDocs: true, autoRescanIntervalSec: 0 },
        });
      }
      return jsonResponse({}, false, 404);
    }),
  );
}

describe('selected-project information hierarchy', () => {
  it('renders the header, always-visible timeline, then secondary navigation in DOM order', async () => {
    const selected = makeProject({
      name: 'ordered-project',
      path: 'C:/projects/ordered-project',
      phases: [makePhase({ id: '1', name: 'Active delivery', status: 'in_progress' })],
    });
    mockNavigationApp({
      generatedAt: '2026-07-11T00:00:00.000Z',
      activeDays: 14,
      projects: [selected],
    });
    render(<App />);

    const matchingHeadings = await screen.findAllByRole('heading', {
      level: 2,
      name: selected.name,
    });
    const header = matchingHeadings.at(-1);
    expect(header).toBeDefined();
    const timeline = screen.getByRole('region', {
      name: `Project timeline for ${selected.name}`,
    });
    const navigation = screen.getByRole('tablist', { name: 'Project detail surfaces' });
    expect(
      header!.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      timeline.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('persists a selected phase by project revision and restores it on remount', async () => {
    const user = userEvent.setup();
    const selected = makeProject({
      name: 'timeline-state-project',
      path: 'C:/projects/timeline-state-project',
      phases: [
        makePhase({ id: '1', name: 'Current delivery', status: 'in_progress' }),
        makePhase({ id: '2', name: 'Future delivery', status: 'planned', line: 20 }),
      ],
    });
    const data: ScanOutput = {
      generatedAt: '2026-07-11T00:00:00.000Z',
      activeDays: 14,
      projects: [selected],
    };
    mockNavigationApp(data);
    render(<App />);

    const future = await screen.findByRole('button', { name: /Phase 2 Future delivery/i });
    await user.click(future);
    expect(future).toHaveAttribute('aria-expanded', 'true');
    expect(window.history.state[UI_STATE_HISTORY_KEY]).toMatchObject({
      selectedPath: selected.path,
      timeline: {
        projectId: selected.path,
        expandedPhaseKey: expect.any(String),
      },
    });

    cleanup();
    mockNavigationApp(data);
    render(<App />);
    expect(
      await screen.findByRole('button', { name: /Phase 2 Future delivery/i }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps loaded project context visible when the latest live scan failed', async () => {
    const selected = makeProject({
      name: 'retained-project',
      path: 'C:/projects/retained-project',
      phases: [makePhase({ id: '1', name: 'Retained delivery', status: 'in_progress' })],
    });
    const data: ScanOutput = {
      generatedAt: '2026-07-11T00:00:00.000Z',
      activeDays: 14,
      projects: [selected],
    };
    mockNavigationApp(data, {
      status: 'error',
      error: 'watcher scan failed safely',
      trigger: 'watcher',
    });
    render(<App />);

    expect(
      await screen.findByRole('button', { name: /Phase 1 Retained delivery/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Refresh failed.*watcher scan failed safely/i,
    );
    expect(screen.getByText(/Stale data/i)).toBeInTheDocument();
  });
});

const related: DrawerItem = {
  descriptorKind: 'doc',
  type: 'Document',
  title: 'Related evidence',
  file: 'docs/RELATED.md',
  line: 2,
  projectPath: project.path,
};

const drawerItem: DrawerItem = {
  descriptorKind: 'phase',
  type: 'Phase',
  title: 'Focused evidence',
  text: 'Read-only source evidence',
  file: 'docs/ROADMAP.md',
  line: 10,
  projectPath: project.path,
  related: [{ label: 'Open related evidence', item: related }],
};

function DrawerHarness() {
  const [item, setItem] = useState<DrawerItem | null>(null);
  return (
    <div>
      <div data-testid="drawer-background">
        <button id="drawer-test-origin" type="button" onClick={() => setItem(drawerItem)}>
          Open details
        </button>
      </div>
      {item && (
        <DetailDrawer item={item} onNavigate={setItem} onClose={() => setItem(null)} />
      )}
    </div>
  );
}

function RefreshingDrawerHarness({ revision }: { revision: string }) {
  const [item, setItem] = useState<DrawerItem | null>(null);
  return (
    <div>
      <div data-testid="refreshing-drawer-background">
        <button
          key={revision}
          id="phase-details-focus-origin"
          type="button"
          onClick={() => setItem(drawerItem)}
        >
          Phase details
        </button>
      </div>
      {item && (
        <DetailDrawer item={item} onNavigate={setItem} onClose={() => setItem(null)} />
      )}
    </div>
  );
}

function GeneratedOriginDrawerHarness() {
  const [item, setItem] = useState<DrawerItem | null>(null);
  return (
    <div>
      <button type="button" onClick={() => setItem(drawerItem)}>
        Open generated origin
      </button>
      {item && (
        <DetailDrawer item={item} onNavigate={setItem} onClose={() => setItem(null)} />
      )}
    </div>
  );
}

describe('read-only detail drawer focus contract', () => {
  it('moves focus inside, traps Tab, isolates the background, and returns focus on Escape', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    const opener = screen.getByRole('button', { name: 'Open details' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Focused evidence' });
    const close = within(dialog).getByRole('button', { name: 'Close details' });
    const relatedButton = within(dialog).getByRole('button', { name: 'Open related evidence' });
    expect(close).toHaveFocus();
    expect(screen.getByTestId('drawer-background')).toHaveAttribute('inert');
    expect(screen.getByTestId('drawer-background')).toHaveAttribute('aria-hidden', 'true');

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(relatedButton).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();

    await user.click(relatedButton);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Related evidence');
    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(screen.getByTestId('drawer-background')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('drawer-background')).not.toHaveAttribute('aria-hidden');
  });

  it('returns focus by stable opener identity when live refresh replaces the opener node', async () => {
    const user = userEvent.setup();
    const view = render(<RefreshingDrawerHarness revision="before-refresh" />);

    const originalOpener = screen.getByRole('button', { name: 'Phase details' });
    await user.click(originalOpener);
    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus();

    view.rerender(<RefreshingDrawerHarness revision="after-refresh" />);
    const refreshedOpener = screen.getByRole('button', {
      name: 'Phase details',
      hidden: true,
    });
    expect(refreshedOpener).not.toBe(originalOpener);
    expect(refreshedOpener).toHaveAttribute('id', 'phase-details-focus-origin');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(refreshedOpener).toHaveFocus();
  });

  it('removes a generated fallback origin id after restoring focus', async () => {
    const user = userEvent.setup();
    render(<GeneratedOriginDrawerHarness />);

    const opener = screen.getByRole('button', { name: 'Open generated origin' });
    expect(opener).not.toHaveAttribute('id');
    await user.click(opener);

    expect(opener.id).toMatch(/^detail-drawer-origin-/);
    await user.keyboard('{Escape}');

    expect(opener).toHaveFocus();
    expect(opener).not.toHaveAttribute('id');
  });

  it('keeps the real App drawer focus origin stable across a live project refresh', async () => {
    const user = userEvent.setup();
    const initialProject = makeProject({
      name: 'refresh-focus-project',
      path: 'C:/projects/refresh-focus-project',
      phases: [
        makePhase({
          id: '1',
          name: 'Active delivery',
          status: 'in_progress',
          statusText: 'Status: in progress.',
          steps: [makeStep({ phaseId: '1', id: '1.1', status: 'in_progress' })],
        }),
      ],
    });
    const refreshedProject = makeProject({
      ...initialProject,
      phases: [
        makePhase({
          id: '1a',
          name: 'Active delivery refreshed',
          status: 'in_progress',
          statusText: 'Status: in progress after live refresh.',
          steps: [makeStep({ phaseId: '1a', id: '1a.1', status: 'in_progress' })],
        }),
      ],
    });
    let currentData: ScanOutput = {
      generatedAt: '2026-07-11T00:00:00.000Z',
      activeDays: 14,
      projects: [initialProject],
    };
    const refreshedData: ScanOutput = {
      generatedAt: '2026-07-11T00:01:00.000Z',
      activeDays: 14,
      projects: [refreshedProject],
    };
    let poll: (() => void) | null = null;
    vi.spyOn(window, 'setInterval').mockImplementation(
      ((handler: TimerHandler, timeout?: number) => {
        if (timeout === 2000 && typeof handler === 'function' && poll === null) {
          poll = handler as () => void;
        }
        return 1;
      }) as typeof window.setInterval,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/projects')) return jsonResponse(currentData);
        if (url.endsWith('/api/scan-status')) {
          return jsonResponse({
            status: 'success',
            lastScannedAt: currentData.generatedAt,
            durationMs: 1,
            scannedFilesCount: 1,
            skippedFilesCount: 0,
            error: null,
            trigger: 'watcher',
          });
        }
        if (url.endsWith('/api/config')) {
          return jsonResponse({
            workspaces: [],
            projects: [],
            settings: { watchDocs: true, autoRescanIntervalSec: 0 },
          });
        }
        return jsonResponse({}, false, 404);
      }),
    );
    render(<App />);

    const originalOpener = await screen.findByRole('button', { name: /^Phase details/i });
    await waitFor(() => expect(poll).not.toBeNull());
    expect(originalOpener.id).not.toBe('');
    await user.click(originalOpener);
    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus();

    currentData = refreshedData;
    await act(async () => {
      poll?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(document.contains(originalOpener)).toBe(false));
    const refreshedOpener = await screen.findByRole(
      'button',
      { name: /^Phase details/i, hidden: true },
    );
    expect(refreshedOpener).not.toBe(originalOpener);
    expect(refreshedOpener.id).toBe(originalOpener.id);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(refreshedOpener).toHaveFocus();
  });
});
