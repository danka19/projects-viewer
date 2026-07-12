import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import {
  UI_STATE_HISTORY_KEY,
  UI_STATE_STORAGE_KEY,
  UI_STATE_VERSION,
} from '../../src/uiState';
import type { ProjectData, ScanOutput } from '../../src/types';
import { makePhase, makeProject } from './fixtures';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, '');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function task(text: string, file: string, line: number) {
  return { text, file, line, section: null };
}

function diagnostic(text: string, line: number) {
  return {
    text,
    file: 'docs/AGENTS.md',
    line,
    classification: 'agent_rule' as const,
    includedInProjectStatus: false,
    confidence: 'high' as const,
    reason: 'Matching diagnostic policy',
    matchedKeywords: ['needle'],
    nearbyContext: text,
  };
}

function searchProjects(): ProjectData[] {
  const alpha = makeProject({
    name: 'Needle Alpha',
    path: 'C:/projects/alpha',
    status: 'active',
    phases: [makePhase({ id: '1', name: 'Needle delivery', status: 'in_progress' })],
    nextTasks: [task('Needle next action', 'docs/NEXT.md', 3)],
    openTasks: [task('Needle alpha task', 'docs/TASKS.md', 4)],
    docs: [
      {
        file: 'docs/needle-guide.md',
        category: 'other',
        sizeBytes: 100,
        modified: '2026-07-11T00:00:00.000Z',
      },
    ],
  });
  const beta = makeProject({
    name: 'Beta',
    path: 'C:/projects/beta',
    status: 'done',
    openTasks: [task('Needle external task', 'docs/TASKS.md', 8)],
  });
  return [alpha, beta];
}

function auditedLateMatchProject(): ProjectData {
  const auditedEvidence = task(
    'Decision required for the next phase: choose whether the next product slice is dashboard UI, Markdown/rendered brief, or an agent preflight packet follow-up.',
    'docs/phases/PHASE_3_FIRST_USABLE_WORKFLOW.md',
    356,
  );
  return makeProject({
    name: 'Audited project',
    path: 'C:/projects/audited',
    nextTasks: [auditedEvidence],
    openTasks: [{ ...auditedEvidence }],
  });
}

function scan(projects = searchProjects()): ScanOutput {
  return {
    generatedAt: '2026-07-11T00:00:00.000Z',
    activeDays: 14,
    projects,
  };
}

function mockAppData(data = scan()) {
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

function jsonResponse(value: unknown, ok = true, status = ok ? 200 : 404) {
  return { ok, status, json: async () => value } as Response;
}

async function renderApp(data = scan()) {
  mockAppData(data);
  render(<App />);
  return screen.findByLabelText('Search projects, tasks, roadmap items, decisions, specs, and docs');
}

describe('accessible global search integration', () => {
  it('visibly explains a late query match on the retained deduplicated result', async () => {
    const user = userEvent.setup();
    const search = await renderApp(scan([auditedLateMatchProject()]));

    await user.type(search, 'preflight packet');

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAccessibleName(/Next action.*Audited project/i);
    const contextualMatch = /(?:\S+\s+){2,}preflight packet\s+\S+/i;
    const matchExplanations = within(options[0]).queryAllByText(
      (_content, element) =>
        element !== options[0] &&
        contextualMatch.test(element?.textContent ?? '') &&
        ![...(element?.children ?? [])].some((child) =>
          contextualMatch.test(child.textContent ?? ''),
        ),
    );
    expect(matchExplanations).toHaveLength(1);
    const matchExplanation = matchExplanations[0];
    expect(matchExplanation).not.toBe(options[0]);
    expect(matchExplanation).toBeVisible();
    expect(matchExplanation.className).not.toMatch(
      /\b(?:truncate|overflow-hidden|line-clamp(?:-\d+)?)\b/,
    );
  });

  it('activates the retained late-match result by keyboard and pointer', async () => {
    const user = userEvent.setup();
    const search = await renderApp(scan([auditedLateMatchProject()]));

    await user.type(search, 'preflight packet');
    const keyboardOption = within(screen.getByRole('listbox')).getByRole('option');
    await user.keyboard('{ArrowDown}');
    expect(search).toHaveAttribute('aria-activedescendant', keyboardOption.id);
    await user.keyboard('{Enter}');

    expect(search).toHaveValue('preflight packet');
    expect(screen.getByRole('dialog')).toHaveTextContent(/agent preflight packet follow-up/i);
    await user.keyboard('{Escape}');
    expect(search).toHaveFocus();

    await user.click(search);
    const pointerOption = within(screen.getByRole('listbox')).getByRole('option');
    expect(pointerOption.id).toBe(keyboardOption.id);
    await user.click(pointerOption);

    expect(screen.getByRole('dialog')).toHaveTextContent(/agent preflight packet follow-up/i);
    expect(search).toHaveValue('preflight packet');
  });

  it('uses one ranked semantic listbox with stable option identity and full keyboard dismissal', async () => {
    const user = userEvent.setup();
    const search = await renderApp();

    expect(search).toHaveAttribute('role', 'combobox');
    expect(search).toHaveAttribute('aria-expanded', 'false');
    expect(search).toHaveAttribute('aria-controls');

    await user.click(search);
    await user.type(search, 'needle');
    const listbox = screen.getByRole('listbox', { name: /Search results/i });
    expect(search).toHaveAttribute('aria-expanded', 'true');
    expect(search).toHaveAttribute('aria-controls', listbox.id);

    const options = within(listbox).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringMatching(/Project.*Needle Alpha.*Needle Alpha/i),
      expect.stringMatching(/Roadmap.*Needle delivery.*Needle Alpha/i),
      expect.stringMatching(/Next action.*Needle next action.*Needle Alpha/i),
      expect.stringMatching(/Task.*Needle alpha task.*Needle Alpha/i),
      expect.stringMatching(/Task.*Needle external task.*Beta/i),
      expect.stringMatching(/Doc.*needle-guide.*Needle Alpha/i),
    ]);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    expect(options.every((option) => option.id.length > 0)).toBe(true);
    expect(options.every((option) => option.getAttribute('tabindex') === '-1')).toBe(true);

    await user.keyboard('{ArrowDown}');
    expect(search).toHaveAttribute('aria-activedescendant', options[0].id);
    await user.keyboard('{End}');
    expect(search).toHaveAttribute('aria-activedescendant', options.at(-1)!.id);
    await user.keyboard('{ArrowUp}');
    expect(search).toHaveAttribute('aria-activedescendant', options.at(-2)!.id);
    await user.keyboard('{Home}');
    expect(search).toHaveAttribute('aria-activedescendant', options[0].id);

    await user.keyboard('{Escape}');
    expect(search).toHaveAttribute('aria-expanded', 'false');
    expect(search).toHaveValue('needle');
    await user.keyboard('{Escape}');
    expect(search).toHaveValue('');

    await user.type(search, 'needle');
    await user.tab();
    expect(search).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).not.toHaveAttribute('role', 'option');

    await user.click(search);
    expect(search).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('heading', { level: 1, name: 'Projects Viewer' }));
    expect(search).toHaveAttribute('aria-expanded', 'false');

    await user.clear(search);
    await user.type(search, 'no such result');
    expect(screen.getByRole('listbox', { name: /Search results/i })).toBeEmptyDOMElement();
    expect(screen.getByText(/Nothing matches “no such result”/i)).toBeInTheDocument();
  });

  it('discloses the true total/truncation and diagnostic opt-in/count', async () => {
    const user = userEvent.setup();
    const project = makeProject({
      name: 'Bulk project',
      path: 'C:/projects/bulk',
      openTasks: Array.from({ length: 45 }, (_, index) =>
        task(`Bulk result ${index}`, 'docs/TASKS.md', index + 1),
      ),
    });
    project.blockedGatedDiagnostics.filteredAgentRules = [
      diagnostic('Needle diagnostic one', 101),
      diagnostic('Needle diagnostic two', 102),
    ];
    const search = await renderApp(scan([project]));

    await user.type(search, 'bulk');
    expect(screen.getByText('Showing 40 of 46 results')).toBeInTheDocument();
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(40);

    await user.clear(search);
    await user.type(search, 'needle');
    expect(screen.getByText(/2 matching diagnostics available/i)).toBeInTheDocument();
    const diagnostics = screen.getByRole('checkbox', { name: /Include diagnostics/i });
    expect(diagnostics).not.toBeChecked();
    await user.click(diagnostics);
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options.every((option) => /Diagnostic.*Bulk project/i.test(option.textContent ?? ''))).toBe(true);
  });

  it('opens a filtered-out project target while preserving query and status filter', async () => {
    const user = userEvent.setup();
    const search = await renderApp();
    await user.click(screen.getByRole('button', { name: /Phase 1 Needle delivery/i }));
    expect(window.history.state[UI_STATE_HISTORY_KEY].timeline).toMatchObject({
      projectId: 'C:/projects/alpha',
    });
    await user.click(screen.getByRole('button', { name: 'Active 1' }));
    expect(screen.getByRole('button', { name: 'Active 1' })).toHaveAttribute('aria-pressed', 'true');

    await user.type(search, 'external task');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(search).toHaveValue('external task');
    expect(search).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Active 1', hidden: true })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('heading', { level: 2, name: 'Beta', hidden: true })).not.toHaveLength(0);
    expect(screen.getByRole('tab', { name: /Work/i, hidden: true })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Needle external task/i);
    expect(window.history.state[UI_STATE_HISTORY_KEY].timeline).toBeNull();

    await user.keyboard('{Escape}');
    expect(search).toHaveFocus();

    await user.click(search);
    await user.click(
      within(screen.getByRole('listbox')).getByRole('option', {
        name: /Needle external task.*Beta/i,
      }),
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Needle external task/i);
    await user.keyboard('{Escape}');
    expect(search).toHaveFocus();
  });
});

describe('durable App UI state', () => {
  it('does not create an empty history entry for an already-active tab', async () => {
    const user = userEvent.setup();
    const pushSpy = vi.spyOn(window.history, 'pushState');
    await renderApp();
    pushSpy.mockClear();

    await user.click(screen.getByRole('tab', { name: /Status/i }));
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('prefers a present namespaced history state over localStorage and otherwise restores storage', async () => {
    const projects = searchProjects();
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: UI_STATE_VERSION,
        selectedPath: projects[0].path,
        statusFilter: 'active',
        activeTab: 'status',
        knowledgeView: 'specs',
        query: 'stored query',
        includeDiagnostics: false,
        timeline: null,
        drawer: null,
      }),
    );
    window.history.replaceState({
      [UI_STATE_HISTORY_KEY]: {
        version: UI_STATE_VERSION,
        selectedPath: projects[1].path,
        statusFilter: 'done',
        activeTab: 'work',
        knowledgeView: 'docs',
        query: 'history query',
        includeDiagnostics: true,
        timeline: null,
        drawer: {
          projectPath: projects[1].path,
          kind: 'task',
          file: 'docs/TASKS.md',
          line: 8,
        },
      },
    }, '');

    const search = await renderApp(scan(projects));
    expect(search).toHaveValue('history query');
    expect(screen.getByRole('button', { name: 'Done 1', hidden: true })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('heading', { level: 2, name: 'Beta', hidden: true })).not.toHaveLength(0);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Needle external task/i);

    cleanup();
    window.history.replaceState(null, '');
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: UI_STATE_VERSION,
        selectedPath: projects[0].path,
        statusFilter: 'active',
        activeTab: 'status',
        knowledgeView: 'specs',
        query: 'stored query',
        includeDiagnostics: false,
        timeline: null,
        drawer: null,
      }),
    );
    mockAppData(scan(projects));
    render(<App />);
    expect(
      await screen.findByLabelText('Search projects, tasks, roadmap items, decisions, specs, and docs'),
    ).toHaveValue('stored query');
  });

  it('replaces transient changes, pushes navigation, restores popstate, and never changes the URL', async () => {
    const user = userEvent.setup();
    const projects = searchProjects();
    const initialUrl = window.location.href;
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const search = await renderApp(scan(projects));
    replaceSpy.mockClear();
    pushSpy.mockClear();

    await user.type(search, 'needle');
    expect(replaceSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(initialUrl);

    replaceSpy.mockClear();
    await user.click(screen.getByRole('button', { name: 'Done 1' }));
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(initialUrl);
    expect(window.location.href).not.toContain(encodeURIComponent(projects[1].path));

    const popped = {
      version: UI_STATE_VERSION,
      selectedPath: projects[1].path,
      statusFilter: 'done',
      activeTab: 'decisions',
      knowledgeView: 'specs',
      query: 'popped query',
      includeDiagnostics: false,
      timeline: null,
      drawer: null,
    };
    window.history.replaceState({ [UI_STATE_HISTORY_KEY]: popped }, '');
    replaceSpy.mockClear();
    pushSpy.mockClear();
    await act(async () => window.dispatchEvent(new PopStateEvent('popstate')));

    expect(search).toHaveValue('popped query');
    expect(screen.getAllByRole('heading', { level: 2, name: 'Beta' })).not.toHaveLength(0);
    expect(screen.getByRole('tab', { name: /Decisions/i })).toHaveAttribute('aria-selected', 'true');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY)!)).toMatchObject(popped);
  });
});
