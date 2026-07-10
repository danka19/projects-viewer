import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const ALLOWED_PHASE_STATUSES = new Set([
  'draft',
  'planned',
  'ready',
  'in_progress',
  'blocked',
  'pending_acceptance',
  'accepted',
  'closed',
  'deferred',
  'cancelled',
  'superseded',
]);

test('static fallback project data uses only supported phase lifecycle statuses', async () => {
  const raw = await fs.readFile(new URL('../src/data/projects.json', import.meta.url), 'utf8');
  const scan = JSON.parse(raw);
  const invalid = [];

  for (const project of scan.projects ?? []) {
    for (const phase of project.phases ?? []) {
      if (!ALLOWED_PHASE_STATUSES.has(phase.status)) {
        invalid.push(`${project.id}:${phase.title}:${phase.status}`);
      }
      for (const step of phase.steps ?? []) {
        if (!ALLOWED_PHASE_STATUSES.has(step.status)) {
          invalid.push(`${project.id}:${phase.title}:${step.label}:${step.status}`);
        }
      }
    }
  }

  assert.deepEqual(invalid, []);
});
