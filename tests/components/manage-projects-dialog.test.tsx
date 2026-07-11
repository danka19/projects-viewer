import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import type { ScanOutput } from '../../src/types';
import { makeProject } from './fixtures';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, '');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const data: ScanOutput = {
  generatedAt: '2026-07-11T00:00:00.000Z',
  activeDays: 14,
  projects: [
    makeProject({
      name: 'managed-project',
      path: 'C:/projects/managed-project',
    }),
  ],
};

function jsonResponse(value: unknown, ok = true, status = ok ? 200 : 404) {
  return { ok, status, json: async () => value } as Response;
}

function mockManageApp() {
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

async function openManageProjects() {
  const user = userEvent.setup();
  mockManageApp();
  render(<App />);
  const trigger = await screen.findByRole('button', { name: 'Manage' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Manage Projects' });
  return { user, trigger, dialog };
}

describe('Manage Projects modal dialog', () => {
  it('exposes modal semantics, an accessible name, initial focus, and an isolated background', async () => {
    const { trigger, dialog } = await openManageProjects();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', { name: 'Manage Projects' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();

    const header = trigger.closest('header');
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    for (const backgroundRegion of [header, main, footer]) {
      expect(backgroundRegion).not.toBeNull();
      expect(backgroundRegion).toHaveAttribute('inert');
      expect(backgroundRegion).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('contains both Shift+Tab and Tab at the modal boundaries', async () => {
    const { user, dialog } = await openManageProjects();
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const lastControl = within(dialog).getByRole('button', { name: 'Rescan enabled' });

    expect(close).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(lastControl).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();
  });

  it('closes on Escape, restores the background, and returns focus to the exact Manage trigger', async () => {
    const { user, trigger } = await openManageProjects();
    const header = trigger.closest('header');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Manage Projects' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(header).not.toHaveAttribute('inert');
    expect(header).not.toHaveAttribute('aria-hidden');
  });

  it('returns focus to the exact Manage trigger when the Close button is activated', async () => {
    const { user, trigger, dialog } = await openManageProjects();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: 'Manage Projects' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
