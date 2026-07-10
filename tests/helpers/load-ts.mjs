import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC_ROOT = path.dirname(fileURLToPath(new URL('../../src/placeholder', import.meta.url)));

/**
 * Load a TypeScript module from src/ for node:test without a bundler.
 * Transpiles the file and recursively inlines its relative imports as
 * data: URLs so pure model modules can be unit-tested directly.
 * Type-only imports are erased by transpilation and need no resolution.
 */
export async function loadTsModule(relativeSrcPath) {
  const dataUrl = await toDataUrl(path.join(SRC_ROOT, relativeSrcPath), new Map());
  return import(dataUrl);
}

async function toDataUrl(absPath, cache) {
  const resolved = await resolveTsFile(absPath);
  if (cache.has(resolved)) return cache.get(resolved);
  const source = await fs.readFile(resolved, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;

  // Rewrite remaining runtime relative imports to nested data: URLs.
  const importRe = /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g;
  let rewritten = '';
  let last = 0;
  for (const match of compiled.matchAll(importRe)) {
    const [full, pre, spec, post] = match;
    const childUrl = await toDataUrl(path.resolve(path.dirname(resolved), spec), cache);
    rewritten += compiled.slice(last, match.index) + pre + childUrl + post;
    last = match.index + full.length;
  }
  rewritten += compiled.slice(last);

  const url = `data:text/javascript;base64,${Buffer.from(rewritten, 'utf8').toString('base64')}`;
  cache.set(resolved, url);
  return url;
}

async function resolveTsFile(absPath) {
  const candidates = absPath.endsWith('.ts')
    ? [absPath]
    : [`${absPath}.ts`, `${absPath}.tsx`, absPath];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Cannot resolve TypeScript module for ${absPath}`);
}
