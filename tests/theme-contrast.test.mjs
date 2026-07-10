import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const attentionBrief = await readFile(
  new URL('../src/components/AttentionBrief.tsx', import.meta.url),
  'utf8',
);
const statusMeta = await readFile(new URL('../src/statusMeta.ts', import.meta.url), 'utf8');
const statusVisuals = await readFile(
  new URL('../src/timeline/statusVisuals.ts', import.meta.url),
  'utf8',
);
const interactiveTimeline = await Promise.all(
  [
    '../src/timeline/ProjectTimeline.tsx',
    '../src/timeline/TimelineFallback.tsx',
    '../src/components/DetailDrawer.tsx',
    '../src/components/SelectedProjectHeader.tsx',
    '../src/components/ManageProjects.tsx',
  ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')),
).then((parts) => parts.join('\n'));

function variables(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing ${selector} theme block`);
  return new Map(
    [...match[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((entry) => [
      entry[1],
      entry[2],
    ]),
  );
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendHex(foreground, background, alpha) {
  const channels = (hex) => hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16));
  const fg = channels(foreground);
  const bg = channels(background);
  const mixed = fg.map((value, index) => Math.round(value * alpha + bg[index] * (1 - alpha)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

const normalTextTokens = [
  'ink',
  'mute',
  'faint',
  'accent-ink',
  'ok',
  'warn',
  'info',
  'danger',
  'gate',
  'review',
  'dim',
];

for (const [name, selector] of [
  ['dark', ':root'],
  ['light', '.light'],
]) {
  test(`${name} semantic text tokens meet WCAG AA against both dashboard surfaces`, () => {
    const theme = variables(selector);
    for (const token of normalTextTokens) {
      const foreground = theme.get(token);
      assert.ok(foreground, `missing --${token}`);
      for (const surface of ['bg', 'panel']) {
        const background = theme.get(surface);
        assert.ok(background, `missing --${surface}`);
        const ratio = contrast(foreground, background);
        assert.ok(
          ratio >= 4.5,
          `${name} --${token} on --${surface} is ${ratio.toFixed(2)}:1; expected >= 4.5:1`,
        );
      }
    }
  });
}

test('empty attention cards do not lower all text contrast with whole-card opacity', () => {
  assert.doesNotMatch(attentionBrief, /opacity-\d+/);
  assert.doesNotMatch(attentionBrief, /text-[\w-]+\/\d+/);
});

test('lifecycle text, axis, focus, and accent hover states retain required contrast', () => {
  assert.doesNotMatch(statusMeta, /text-(?:dim|info|ok|warn|danger|gate|review)\/\d+/);
  assert.match(
    statusVisuals,
    /planned:.*node: '[^']*border-mute[^']*'.*connectorClass: 'border-mute'/,
  );
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent-ink\)/s);
  assert.doesNotMatch(
    interactiveTimeline,
    /hover:bg-(?:accent|warn|ok|danger)\/(?:1[6-9]|[2-9]\d)/,
  );

  for (const selector of [':root', '.light']) {
    const theme = variables(selector);
    for (const token of ['ok', 'info', 'gate', 'danger', 'mute', 'warn', 'dim']) {
      assert.ok(contrast(theme.get(token), theme.get('panel')) >= 3, `${selector} ${token} axis`);
    }
    assert.ok(
      contrast(
        theme.get('accent-ink'),
        blendHex(theme.get('accent'), theme.get('panel'), 0.15),
      ) >= 4.5,
      `${selector} accent text on 15% accent hover`,
    );
    for (const token of ['dim', 'ok', 'warn', 'info', 'danger', 'gate', 'review']) {
      const ratio = contrast(
        theme.get(token),
        blendHex(theme.get(token), theme.get('panel'), 0.1),
      );
      assert.ok(
        ratio >= 4.5,
        `${selector} ${token} text on its 10% tint is ${ratio.toFixed(2)}:1; expected >= 4.5:1`,
      );
    }
  }
});
