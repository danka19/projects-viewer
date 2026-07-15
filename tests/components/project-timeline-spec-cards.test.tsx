import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectTimeline from '../../src/timeline/ProjectTimeline';
import type { RawSpecWorkItem } from '../../src/types';
import { makePhase, makeProject, makeStep } from './fixtures';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeSpec(overrides: Partial<RawSpecWorkItem> = {}): RawSpecWorkItem {
  return {
    key: 'openspec:cards',
    id: 'cards',
    name: 'Roadmap spec cards',
    kind: 'openspec-change',
    lifecycleStatus: 'in_progress',
    confidence: 'high',
    source: { file: 'openspec/changes/cards/proposal.md', line: 8 },
    sourceScopeId: 'openspec/changes/cards',
    groupId: null,
    tasks: [
      {
        key: 'openspec:cards:task-1',
        id: '1',
        name: 'Render cards',
        status: 'closed',
        source: { file: 'openspec/changes/cards/tasks.md', line: 4 },
        order: 0,
      },
      {
        key: 'openspec:cards:task-2',
        id: '2',
        name: 'Verify navigation',
        status: 'planned',
        source: { file: 'openspec/changes/cards/tasks.md', line: 5 },
        order: 1,
      },
    ],
    dependsOnIds: [],
    roadmapPhaseId: '1',
    roadmapStepId: '1.1',
    ...overrides,
  };
}

function renderTimeline(specWork: RawSpecWorkItem[]) {
  const onOpenDrawer = vi.fn();
  const onOpenSpec = vi.fn();
  render(
    <ProjectTimeline
      project={makeProject({
        phases: [
          makePhase({
            id: '1',
            name: 'Delivery',
            status: 'in_progress',
            steps: [makeStep({ id: '1.1', name: 'Build', status: 'in_progress' })],
          }),
        ],
        specWork: {
          projectId: 'fixture-project',
          specifications: specWork,
          dependencies: [],
          unassignedTasks: [],
          integrityIssues: [],
          isPartial: false,
        },
      })}
      generatedAt="2026-07-11T00:00:00.000Z"
      sourceMode="live"
      onOpenDrawer={onOpenDrawer}
      onOpenSpec={onOpenSpec}
    />,
  );
  return { onOpenDrawer, onOpenSpec };
}

describe('timeline specification cards', () => {
  it('renders step-owned cards with task progress and opens them in Specs', async () => {
    const user = userEvent.setup();
    const { onOpenDrawer, onOpenSpec } = renderTimeline([makeSpec()]);

    expect(screen.getByRole('article', { name: /Roadmap spec cards/i })).toBeInTheDocument();
    expect(screen.getByText('1/2 tasks')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open Roadmap spec cards in Specs/i }));
    expect(onOpenSpec).toHaveBeenCalledWith(expect.objectContaining({ id: 'cards' }));

    await user.click(screen.getByRole('button', { name: /Open specification Roadmap spec cards details/i }));
    expect(onOpenDrawer).toHaveBeenCalledWith(expect.objectContaining({ descriptorKind: 'spec-work' }));
  });

  it('keeps unassigned specs visible and explains unknown progress', () => {
    renderTimeline([
      makeSpec({
        key: 'openspec:unassigned',
        id: 'unassigned',
        name: 'Unassigned large spec',
        roadmapPhaseId: null,
        roadmapStepId: null,
        tasks: [],
      }),
    ]);

    expect(screen.getByText('Unassigned specifications')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Unassigned large spec/i })).toBeInTheDocument();
    expect(screen.getByText(/Progress unknown.*No tasks documented/i)).toBeInTheDocument();
  });
});
