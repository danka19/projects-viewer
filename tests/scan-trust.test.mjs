import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runScan } from '../scan-projects.mjs';

async function scanFixture(name, files) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), `projects-viewer-trust-${name}-`));
  const projectRoot = path.join(tmp, 'sample-project');
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(projectRoot, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  const configPath = path.join(tmp, 'projects.config.json');
  const outputPath = path.join(tmp, 'projects.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({ activeDays: 7, projects: [{ name: 'Sample', path: projectRoot }] }),
  );
  const result = await runScan({ configPath, outputPath, quiet: true });
  return result.output.projects[0];
}

function assertSameBlockerDerivedState(actual, control) {
  assert.equal(actual.status, control.status, 'false evidence must not change project status');
  assert.equal(
    actual.statusReason,
    control.statusReason,
    'false evidence must not change the blocker-derived status reason',
  );
  assert.equal(actual.summary.status, control.summary.status);
  assert.equal(
    actual.summary.healthScore,
    control.summary.healthScore,
    'false evidence must not change blocker-derived project health',
  );
}

test('unchecked explicitly blocked tasks remain live blockers', async () => {
  const project = await scanFixture('positive-unchecked-blocker', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Current work',
      '',
      '- [ ] Release is blocked by the missing signing key.',
      '',
    ].join('\n'),
  });

  assert.equal(project.signalGroups.realBlockers.length, 1);
  assert.match(project.signalGroups.realBlockers[0].text, /missing signing key/);
  assert.equal(project.signalGroups.realBlockers[0].file, 'docs/ROADMAP.md');
  assert.match(project.summary.mainBlocker, /missing signing key/);
});

test('ordinary unchecked active tasks remain next actions', async () => {
  const project = await scanFixture('positive-unchecked-next-action', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Next actions',
      '',
      '- [ ] Implement the import pipeline.',
      '',
    ].join('\n'),
  });

  assert.equal(project.nextTasks.length, 1);
  assert.match(project.nextTasks[0].text, /Implement the import pipeline/);
  assert.equal(project.nextTasks[0].file, 'docs/ROADMAP.md');
  assert.match(project.summary.nextAction, /Implement the import pipeline/);
});

test('standalone actionable directives from trusted planning sources remain next actions', async () => {
  const project = await scanFixture('positive-standalone-next-action', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': '# Roadmap\n\nNEXT: Implement scanner exclusions.\n',
  });

  assert.equal(project.nextTasks.length, 1);
  assert.equal(project.nextTasks[0].text, 'Implement scanner exclusions.');
  assert.equal(project.nextTasks[0].file, 'docs/ROADMAP.md');
  assert.equal(project.summary.nextAction, 'Implement scanner exclusions.');
});

test('agent rules and verification checklists do not become next actions', async () => {
  const project = await scanFixture('agent-rules', {
    'AGENTS.md': [
      '# Agent Rules',
      '',
      '13. User-facing reports must always include next steps. If there is no active required action, state the recommended next step.',
      '',
      '## Next Steps For Agents',
      '',
      '- [ ] Follow the next step rule in every report.',
      'NEXT: always restate the recommended next action in reports.',
      '',
    ].join('\n'),
    'docs/AI_STEP_VERIFICATION_CHECKLIST.md': [
      '# Verification Checklist',
      '',
      'If the human asks what is next, the next step recommendation must be concrete.',
      '',
    ].join('\n'),
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      'The next implementation step is building the import pipeline.',
      '',
    ].join('\n'),
  });

  assert.equal(project.nextTasks.length, 1, 'only the roadmap next action survives');
  assert.match(project.nextTasks[0].text, /import pipeline/);
  assert.match(project.summary.nextAction, /import pipeline/);
  assert.ok(
    project.nextTasks.every((t) => !/AGENTS\.md|CHECKLIST/i.test(t.file)),
    'no next action originates from agent rules or checklists',
  );
});

test('done projects with only rule files report no live next actions', async () => {
  const project = await scanFixture('done-quiet', {
    'AGENTS.md': [
      '# Agent Rules',
      '',
      '12. Reports must always include next steps and the recommended next action.',
      '',
    ].join('\n'),
    'README.md': '# Sample\n- [x] Ship the CLI\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Phase 0. Foundation',
      '',
      'Status: accepted and closed on 2026-07-01.',
      '',
      '## Phase 1. Delivery',
      '',
      'Status: closed as complete on 2026-07-05.',
      '',
    ].join('\n'),
  });

  assert.equal(project.status, 'done');
  assert.equal(project.nextTasks.length, 0, 'a done project must not accumulate rule-derived next actions');
  assert.equal(project.summary.nextAction, null);
});

test('TDD plan checkboxes with failing-test wording are not real blockers', async () => {
  const project = await scanFixture('tdd-steps', {
    'README.md': '# Sample\n',
    'docs/superpowers/plans/2026-07-09-feature-plan.md': [
      '# Phase 3 - Feature Plan',
      '',
      'Status: in progress.',
      '',
      '- [ ] Step 1. Add a failing test named buildPacket composes ordered required reading and blocked-state evidence.',
      '- [ ] Step 2. Implement the module until the failing test passes.',
      '',
    ].join('\n'),
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '- Import job is blocked by missing required data from the vendor.',
      '',
    ].join('\n'),
  });

  assert.equal(project.signalGroups.realBlockers.length, 1, 'only the real roadmap blocker remains');
  assert.match(project.signalGroups.realBlockers[0].text, /vendor/);
  assert.match(project.summary.mainBlocker, /vendor/);
  assert.ok(
    !/failing test/i.test(project.summary.mainBlocker ?? ''),
    'a TDD instruction must never be the main blocker',
  );
});

test('checked blocker tasks never become live blockers', async () => {
  const project = await scanFixture('completed-blockers', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Current work',
      '',
      '- [x] 1.1 Add failing UX-001 fixtures: rule-derived next actions, done-project counts, TDD checkbox blocker, ambiguous current phase (`tests/scan-trust.test.mjs`).',
      '- [x] 1.3 Exclude plan checkboxes without explicit blocked wording from real blockers and fix the failing-test hard-block pattern.',
      '- [ ] Import job is blocked by missing required data from the vendor.',
      '',
    ].join('\n'),
  });

  assert.equal(project.signalGroups.realBlockers.length, 1, 'only the unchecked blocker remains live');
  assert.match(project.signalGroups.realBlockers[0].text, /vendor/);
  assert.match(project.summary.mainBlocker, /vendor/);
  assert.ok(
    project.signalGroups.realBlockers.every((signal) => !/checkbox blocker|hard-block pattern/i.test(signal.text)),
    'checked blocker tasks stay completed evidence',
  );
  assert.doesNotMatch(project.summary.mainBlocker ?? '', /checkbox blocker|hard-block pattern/i);

  const control = await scanFixture('completed-blockers-control', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Current work',
      '',
      '- [x] 1.1 Add completed UX-001 fixtures for historical scanner evidence.',
      '- [x] 1.3 Finish classification coverage for completed plan checkboxes.',
      '- [ ] Import job is blocked by missing required data from the vendor.',
      '',
    ].join('\n'),
  });
  assertSameBlockerDerivedState(project, control);
});

test('cross-line OpenSpec normative scenarios never become live blockers', async () => {
  const project = await scanFixture('openspec-normative-blockers', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '- Import job is blocked by missing required data from the vendor.',
      '',
    ].join('\n'),
    'openspec/changes/dependency/specs/dependency/spec.md': [
      '# Dependency Specification',
      '',
      '#### Scenario: Dependent remains blocked',
      '',
      '- **WHEN** a prerequisite is implementation-complete but pending human acceptance',
      '- **THEN** its dependent remains blocked',
      '- **AND** dependent work cannot continue until the prerequisite is final',
      '',
    ].join('\n'),
  });

  assert.equal(project.signalGroups.realBlockers.length, 1, 'only ordinary planning evidence remains live');
  assert.match(project.signalGroups.realBlockers[0].text, /vendor/);
  assert.match(project.summary.mainBlocker, /vendor/);
  assert.ok(
    project.signalGroups.realBlockers.every((signal) => !/\*\*(THEN|AND)\*\*/.test(signal.text)),
    'normative THEN and AND lines stay specification context',
  );
  assert.doesNotMatch(project.summary.mainBlocker ?? '', /dependent remains blocked|cannot continue/i);

  const control = await scanFixture('openspec-normative-blockers-control', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '- Import job is blocked by missing required data from the vendor.',
      '',
    ].join('\n'),
    'openspec/changes/dependency/specs/dependency/spec.md': [
      '# Dependency Specification',
      '',
      '#### Scenario: Dependent follows prerequisite',
      '',
      '- **WHEN** a prerequisite is implementation-complete and accepted',
      '- **THEN** its dependent becomes ready',
      '- **AND** dependent work may proceed after the prerequisite is final',
      '',
    ].join('\n'),
  });
  assertSameBlockerDerivedState(project, control);
});

test('explanatory next-action prose with an embedded marker never becomes current work', async () => {
  const project = await scanFixture('embedded-next-marker', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': '# Roadmap\n\nNEXT: Implement scanner exclusions.\n',
    'openspec/changes/dependency/proposal.md': [
      '# Proposal',
      '',
      'Next-action signals (checkbox next-tasks, `NEXT:` markers, prose next-action matches) are no longer sourced from explanatory prose.',
      '',
    ].join('\n'),
  });

  assert.equal(project.nextTasks.length, 1, 'only the standalone active directive remains');
  assert.match(project.nextTasks[0].text, /Implement scanner exclusions/);
  assert.match(project.summary.nextAction, /Implement scanner exclusions/);
  assert.ok(
    project.nextTasks.every((task) => !/no longer sourced|Next-action signals/i.test(task.text)),
    'an embedded NEXT example stays explanatory prose',
  );
  assert.doesNotMatch(project.summary.nextAction ?? '', /no longer sourced|Next-action signals/i);

  const control = await scanFixture('embedded-next-marker-control', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': '# Roadmap\n\nNEXT: Implement scanner exclusions.\n',
    'openspec/changes/dependency/proposal.md': [
      '# Proposal',
      '',
      'Scanner evidence rules distinguish explanatory proposal prose from active work.',
      '',
    ].join('\n'),
  });
  assertSameBlockerDerivedState(project, control);
});

test('next-action headings and descriptive labels never become current work', async () => {
  const project = await scanFixture('next-action-labels', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Next action: classification behavior',
      '',
      'Next-action label: diagnostic terminology.',
      '',
      'NEXT: Implement scanner exclusions.',
      '',
    ].join('\n'),
  });

  assert.equal(project.nextTasks.length, 1, 'only the standalone active directive remains');
  assert.match(project.nextTasks[0].text, /Implement scanner exclusions/);
  assert.match(project.summary.nextAction, /Implement scanner exclusions/);
  assert.ok(
    project.nextTasks.every((task) => !/classification behavior|diagnostic terminology/i.test(task.text)),
    'headings and descriptive labels stay structural context',
  );
});

test('summary current phase follows the first unfinished roadmap phase', async () => {
  const single = await scanFixture('current-single', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Phase 0. Foundation',
      '',
      'Status: accepted and closed on 2026-07-01.',
      '',
      '## Phase 1. Delivery',
      '',
      'Status: in progress.',
      '',
    ].join('\n'),
  });
  assert.equal(single.summary.currentPhase, '1 Delivery');

  const ambiguous = await scanFixture('current-ambiguous', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Phase 1. First',
      '',
      'Status: in progress.',
      '',
      '## Phase 2. Second',
      '',
      'Status: in progress.',
      '',
    ].join('\n'),
  });
  assert.equal(ambiguous.summary.currentPhase, '1 First', 'roadmap order breaks ties between unfinished phases');

  const betweenPhases = await scanFixture('current-between', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Phase 0. Foundation',
      '',
      'Status: accepted and closed on 2026-07-01.',
      '',
      '## Phase 1. Waiting',
      '',
      'Status: completed but requires approval from the owner.',
      '',
      '## Phase 2. Later',
      '',
      'Status: planned.',
      '',
    ].join('\n'),
  });
  assert.equal(
    betweenPhases.summary.currentPhase,
    '1 Waiting',
    'pending acceptance remains the first unfinished roadmap phase',
  );
});

test('only canonical current sources can create live blocker-derived state', async () => {
  const project = await scanFixture('canonical-live-sources', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': '- Current release is blocked by the signing key.\n',
    'docs/BUGS.md': '- BUG-42: Export is blocked by a reproducible crash.\n',
    'openspec/changes/live-import/proposal.md': '- Current import is blocked by the active migration.\n',
    'docs/archive/old-release.md': '- Current deployment is blocked by historic credentials.\n',
    'docs/audits/evidence.md': '- Current audit is blocked by an old screenshot.\n',
    'docs/evidence/trace.md': '- Current evidence collection is blocked by stale logs.\n',
    'docs/plans/release.md': '- Current implementation is blocked by plan text.\n',
    'openspec/changes/archive/old-import/proposal.md': '- Current import is blocked by archived migration.\n',
  });

  assert.deepEqual(
    project.signalGroups.realBlockers.map((item) => item.file).sort(),
    ['docs/BUGS.md', 'docs/ROADMAP.md', 'openspec/changes/live-import/proposal.md'],
  );
  assert.ok(
    project.blockedGatedDiagnostics.filteredProcessPolicies.some(
      (item) => item.file === 'docs/archive/old-release.md' && !item.includedInProjectStatus,
    ),
  );
});

test('bare blocked wording, technical invariants, and historical quotes are not live blockers', async () => {
  const project = await scanFixture('non-explicit-blockers', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '- Phase 4 is blocked.',
      '- Technical invariant: blocked phases retain their status until evidence changes.',
      '> Previous release was blocked by signing credentials.',
    ].join('\n'),
  });

  assert.equal(project.signalGroups.realBlockers.length, 0);
  assert.equal(project.summary.mainBlocker, null);
});

test('superseded work is non-live and missing replacement is a quality-only warning', async () => {
  const project = await scanFixture('superseded-quality', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '- Previous migration is superseded.',
      '- Current migration is blocked by active key rotation.',
    ].join('\n'),
  });

  assert.equal(project.signalGroups.realBlockers.length, 1);
  assert.match(project.summary.mainBlocker, /active key rotation/);
  assert.ok(
    project.blockedGatedDiagnostics.filteredProcessPolicies.some(
      (item) => /superseded work lacks a replacement reference/i.test(item.reason),
    ),
  );
});

test('ScanLab-style roadmap selects its first blocked unfinished phase', async () => {
  const project = await scanFixture('scanlab-current-phase', {
    'README.md': '# Sample\n',
    'docs/ROADMAP.md': [
      '# Roadmap',
      '',
      '## Phase 0. Foundation',
      'Status: closed.',
      '',
      '## Phase 4. Review, Geometry, And Export',
      'Status: blocked.',
      '',
      '## Phase 5. Camera MVP External Control',
      'Status: blocked.',
    ].join('\n'),
  });

  assert.equal(project.summary.currentPhase, '4 Review, Geometry, And Export');
  assert.equal(project.phases.find((phase) => phase.id === '4').status, 'blocked');
});
