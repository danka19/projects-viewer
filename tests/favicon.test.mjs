import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const faviconUrl = new URL('../public/favicon.svg', import.meta.url);

test('index connects the SVG favicon from Vite public assets', () => {
  assert.match(
    html,
    /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="\/favicon\.svg"\s*\/>/,
  );
  assert.equal(existsSync(faviconUrl), true);
});

test('favicon uses the approved Sweep Ring palette without a centered terracotta dot', () => {
  assert.equal(existsSync(faviconUrl), true);
  const svg = readFileSync(faviconUrl, 'utf8');

  assert.match(svg, /viewBox="0 0 64 64"/);
  for (const color of ['#242724', '#dcc9a9', '#ac5045', '#8fae8a']) {
    assert.match(svg.toLowerCase(), new RegExp(color));
  }
  assert.doesNotMatch(
    svg.toLowerCase(),
    /<circle[^>]*cx="32"[^>]*cy="32"[^>]*fill="#ac5045"/,
  );
});
