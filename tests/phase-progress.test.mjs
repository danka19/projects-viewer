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

test('phaseProgress trusts completed phase status over stale step details', async () => {
  const { phaseProgress } = await loadPhaseProgress();
  const progress = phaseProgress({
    status: 'completed',
    steps: [
      { status: 'unknown' },
      { status: 'pending' },
    ],
  });

  assert.equal(progress, 100);
});

test('phaseProgress trusts approval-complete phase status over stale step details', async () => {
  const { phaseProgress } = await loadPhaseProgress();
  const progress = phaseProgress({
    status: 'completed_pending_approval',
    steps: [{ status: 'unknown' }],
  });

  assert.equal(progress, 100);
});
