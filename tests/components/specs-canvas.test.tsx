import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpecsCanvas, { PrimaryViewSelector } from '../../src/specs/SpecsCanvas';
import { makeDenseSpecProject, makeProject } from './fixtures';

afterEach(cleanup);

function project() {
  return makeProject({
    id: 'canvas-project',
    phases: [],
    specWork: {
      projectId: 'canvas-project',
      specifications: [
        {
          key: 'spec:base', id: 'base', name: 'Search contract', kind: 'openspec-change', lifecycleStatus: 'closed', confidence: 'high',
          source: { file: 'openspec/changes/base/proposal.md', line: 1 }, sourceScopeId: 'openspec/changes', groupId: 'search', dependsOnIds: [],
          tasks: [{ key: 'base-task', id: null, name: 'Contract test', status: 'closed', source: { file: 'openspec/changes/base/tasks.md', line: 1 }, order: 0 }],
        },
        {
          key: 'spec:rank', id: 'rank', name: 'Ranking rules', kind: 'openspec-change', lifecycleStatus: 'in_progress', confidence: 'high',
          source: { file: 'openspec/changes/rank/proposal.md', line: 1 }, sourceScopeId: 'openspec/changes', groupId: 'search', dependsOnIds: ['base'],
          tasks: [{ key: 'rank-task', id: null, name: 'Tune ranking', status: 'in_progress', source: { file: 'openspec/changes/rank/tasks.md', line: 1 }, order: 0 }],
        },
        {
          key: 'spec:independent', id: 'independent', name: 'Independent export', kind: 'generic-spec', lifecycleStatus: 'planned', confidence: 'high',
          source: { file: 'docs/specs/export.md', line: 1 }, sourceScopeId: 'docs/specs', groupId: null, dependsOnIds: [], tasks: [],
        },
      ],
      dependencies: [{ key: 'base->rank', prerequisiteId: 'base', dependentId: 'rank', sourceEvidence: [{ file: 'openspec/changes/rank/proposal.md' }], state: 'unknown' }],
      unassignedTasks: [], integrityIssues: [], isPartial: false,
    },
  });
}

describe('primary view selector', () => {
  it('keeps both choices visible with counts, selection, and unavailable reason', () => {
    const onChange = vi.fn();
    render(<PrimaryViewSelector value="specs" roadmapCount={0} specsCount={3} onChange={onChange} />);
    expect(screen.getByRole('tab', { name: /Roadmap 0/ })).toBeDisabled();
    expect(screen.getByRole('tab', { name: /Roadmap 0/ })).toHaveAttribute('title', 'No roadmap detected');
    expect(screen.getByRole('tab', { name: /Specs 3/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Specs Canvas', () => {
  it('selects, expands, collapses, switches cards, and repeats dependencies as text', () => {
    const onStateChange = vi.fn();
    render(<SpecsCanvas project={project()} generatedAt="2026-07-11" sourceMode="live" state={null} onStateChange={onStateChange} onOpenDrawer={vi.fn()} />);
    const ranking = screen.getByRole('button', { name: /Ranking rules.*in progress.*1 task/i });
    expect(screen.getAllByText('Requires base')).toHaveLength(2);
    fireEvent.click(ranking);
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ selectedSpecKey: 'spec:rank', expandedSpecKey: 'spec:rank' }), 'push');
    fireEvent.click(ranking);
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ selectedSpecKey: 'spec:rank', expandedSpecKey: null }), 'push');
  });

  it('offers controls, spatial keyboard navigation, task drawer, and independent label', () => {
    const onOpenDrawer = vi.fn();
    const onStateChange = vi.fn();
    render(<SpecsCanvas project={project()} generatedAt="2026-07-11" sourceMode="live" state={null} onStateChange={onStateChange} onOpenDrawer={onOpenDrawer} />);
    expect(screen.getByRole('region', { name: /Specifications canvas/i })).toHaveAttribute('aria-label', expect.stringMatching(/3 specifications.*1 dependency/i));
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit all' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Center active specification' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fit all' }));
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ zoom: 50, panX: 0, panY: 0 }), 'replace');
    expect(screen.getByText('Independent work')).toBeInTheDocument();
    const rankingCard = screen.getByTestId('spec-card-spec:rank');
    fireEvent.click(within(rankingCard).getByRole('button', { name: /Ranking rules/ }));
    fireEvent.click(within(rankingCard).getByRole('button', { name: /Tune ranking/ }));
    expect(onOpenDrawer).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tune ranking', file: 'openspec/changes/rank/tasks.md' }));
  });

  it('discloses dense, partial, cyclic, archived, and unassigned work without dropping counts', () => {
    const { container } = render(<SpecsCanvas project={makeDenseSpecProject()} generatedAt="2026-07-11" sourceMode="stale" state={null} onStateChange={vi.fn()} onOpenDrawer={vi.fn()} />);
    expect(screen.getByRole('region', { name: /32 specifications/ })).toBeInTheDocument();
    expect(screen.getAllByRole('status').find((node) => /Partial scan/.test(node.textContent ?? ''))).toHaveTextContent(/stale.*Partial scan.*Dependency cycle/i);
    expect(screen.getByText('Unassigned work · 1')).toBeInTheDocument();
    expect(container.querySelector('[data-compact="true"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show archived specifications (6)' })).toBeInTheDocument();
    expect(container.querySelectorAll('.spec-card')).toHaveLength(26);
    fireEvent.click(screen.getByRole('button', { name: 'Show archived specifications (6)' }));
    expect(container.querySelectorAll('.spec-card')).toHaveLength(32);
  });
});
