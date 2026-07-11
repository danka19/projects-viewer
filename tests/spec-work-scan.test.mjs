import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSpecWork } from '../server/spec-work.mjs';

function doc(file, content, category = 'spec') {
  return { file, content, category, modified: '2026-07-11T00:00:00.000Z' };
}

test('buildSpecWork recognizes openspec and .openspec changes with owned tasks', () => {
  const model = buildSpecWork({
    projectId: 'fixture',
    docs: [
      doc('openspec/changes/search/proposal.md', '# Search\n\nStatus: in progress.'),
      doc('openspec/changes/search/tasks.md', '- [x] Contract\n- [ ] Ranking'),
      doc('.openspec/changes/export/proposal.md', '# Export\n\nStatus: planned.'),
      doc('.openspec/changes/export/tasks.md', '- [ ] CSV'),
    ],
  });

  assert.deepEqual(model.specifications.map((item) => item.id), ['export', 'search']);
  assert.deepEqual(model.specifications.find((item) => item.id === 'search').tasks.map((task) => task.name), ['Contract', 'Ranking']);
  assert.equal(model.unassignedTasks.length, 0);
  assert.equal(model.specifications.find((item) => item.id === 'search').lifecycleStatus, 'in_progress');
  assert.equal(model.specifications.find((item) => item.id === 'export').lifecycleStatus, 'planned');
});

test('buildSpecWork does not treat proposal/spec requirement checkboxes as unassigned tasks', () => {
  const model = buildSpecWork({
    projectId: 'fixture',
    docs: [
      doc('openspec/changes/done/proposal.md', '# Done proposal\n- [ ] Acceptance scenario'),
      doc('openspec/changes/done/tasks.md', '- [x] Implemented'),
      doc('openspec/specs/capability/spec.md', '# Capability\n- [ ] Requirement example'),
      doc('docs/TASKS.md', '# Tasks\n- [ ] Actually unassigned', 'spec'),
    ],
  });
  assert.deepEqual(model.unassignedTasks.map((task) => task.name), ['Actually unassigned']);
  assert.equal(model.specifications.find((item) => item.id === 'done').lifecycleStatus, 'pending_acceptance');
  assert.equal(model.specifications.find((item) => item.id === 'capability').lifecycleStatus, 'accepted');
});

test('buildSpecWork emits only explicit dependencies and preserves invalid evidence', () => {
  const model = buildSpecWork({
    projectId: 'fixture',
    docs: [
      doc('openspec/changes/base/proposal.md', '---\nwork:\n  id: base\n---\n# Base\nStatus: closed.'),
      doc('openspec/changes/feature/proposal.md', '---\nwork:\n  id: feature\n  dependsOn:\n    - base\n    - missing\n  group: product\n---\n# Feature\nStatus: planned.'),
      doc('openspec/changes/similar-2/proposal.md', '# Feature 2\nStatus: planned.'),
      doc('docs/specs/loose-tasks.md', '# Loose\n- [ ] Unowned task'),
    ],
  });

  assert.deepEqual(model.dependencies.map((edge) => [edge.prerequisiteId, edge.dependentId]), [
    ['base', 'feature'],
    ['missing', 'feature'],
  ]);
  assert.equal(model.specifications.find((item) => item.id === 'feature').groupId, 'product');
  assert.equal(model.unassignedTasks[0].name, 'Unowned task');
  assert.equal(model.dependencies.some((edge) => edge.prerequisiteId === 'similar-2'), false);
});

test('buildSpecWork reports self edges, cycles, duplicate ids, and partial input', () => {
  const model = buildSpecWork({
    projectId: 'fixture',
    truncated: true,
    docs: [
      doc('openspec/changes/a/proposal.md', '---\nwork:\n  id: a\n  dependsOn: [b, a]\n---\n# A'),
      doc('openspec/changes/b/proposal.md', '---\nwork:\n  id: b\n  dependsOn: [a]\n---\n# B'),
      doc('docs/specs/duplicate.md', '---\nwork:\n  id: a\n---\n# Duplicate'),
    ],
  });

  assert.equal(model.isPartial, true);
  assert.ok(model.integrityIssues.some((issue) => issue.kind === 'self-dependency'));
  assert.ok(model.integrityIssues.some((issue) => issue.kind === 'cycle'));
  assert.ok(model.integrityIssues.some((issue) => issue.kind === 'duplicate-id'));
});

test('buildSpecWork applies configured roots per view without inventing specs', () => {
  const model = buildSpecWork({
    projectId: 'fixture',
    documentationViews: { specs: { roots: ['analytics'] } },
    docs: [
      doc('analytics/ranking.md', '---\nwork:\n  id: ranking\n---\n# Ranking'),
      doc('docs/specs/ignored.md', '---\nwork:\n  id: ignored\n---\n# Ignored'),
      doc('docs/ROADMAP.md', '# Roadmap', 'roadmap'),
    ],
  });
  assert.deepEqual(model.specifications.map((item) => item.id), ['ranking']);
});

test('buildSpecWork keeps archived changes and owns tasks embedded in a generic spec', () => {
  const model = buildSpecWork({
    projectId: 'fixture',
    docs: [
      doc('openspec/changes/archive/2026-07-01-old-change/proposal.md', '# Old change'),
      doc('openspec/changes/archive/2026-07-01-old-change/tasks.md', '- [x] Historical task'),
      doc('analytics/ranking-spec.md', '---\nwork:\n  id: ranking\n---\n# Ranking\n- [ ] Owned generic task'),
    ],
  });
  const archived = model.specifications.find((item) => item.id === '2026-07-01-old-change');
  const generic = model.specifications.find((item) => item.id === 'ranking');
  assert.equal(archived.lifecycleStatus, 'archived');
  assert.deepEqual(archived.tasks.map((task) => task.name), ['Historical task']);
  assert.deepEqual(generic.tasks.map((task) => task.name), ['Owned generic task']);
  assert.equal(model.unassignedTasks.length, 0);
});
