import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadPhaseProgress() {
  const source = await fs.readFile(new URL('../src/phaseProgress.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = Buffer.from(compiled.outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

test('phaseProgress trusts closed phase status over stale step details', async () => {
  const { phaseProgress } = await loadPhaseProgress();
  const progress = phaseProgress({
    status: 'closed',
    steps: [
      { status: 'draft' },
      { status: 'planned' },
    ],
  });

  assert.equal(progress, 100);
});

test('phaseProgress treats pending acceptance as implemented but not closed', async () => {
  const { phaseProgress } = await loadPhaseProgress();
  const progress = phaseProgress({
    status: 'pending_acceptance',
    steps: [{ status: 'draft' }],
  });

  assert.equal(progress, 100);
});

test('phaseProgress does not count deferred cancelled or superseded steps as implemented', async () => {
  const { phaseProgress } = await loadPhaseProgress();
  const progress = phaseProgress({
    status: 'in_progress',
    steps: [
      { status: 'deferred' },
      { status: 'cancelled' },
      { status: 'superseded' },
      { status: 'closed' },
    ],
  });

  assert.equal(progress, 25);
});
