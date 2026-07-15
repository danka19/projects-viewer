# Projects Viewer Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved Sweep Ring SVG favicon to the Projects Viewer browser tab.

**Architecture:** Keep the change static and dependency-free: one SVG in Vite's `public/` directory and one explicit `<link rel="icon">` in `index.html`. A focused Node test verifies both integration and the design guard against a centered terracotta recording dot.

**Tech Stack:** SVG, HTML, Node.js built-in test runner, Vite.

## Global Constraints

- Use the approved Sweep Ring palette: `#242724`, `#DCC9A9`, `#AC5045`, and `#8FAE8A`.
- Keep the center hollow; never place a filled terracotta shape at `32,32`.
- Add no dependencies, raster variants, manifest, animation, text, or dynamic theme behavior.

---

### Task 1: Add And Connect The Sweep Ring Favicon

**Files:**
- Create: `tests/favicon.test.mjs`
- Create: `public/favicon.svg`
- Modify: `index.html`

**Interfaces:**
- Consumes: Vite's existing `/` public-asset convention.
- Produces: `/favicon.svg`, referenced as an SVG favicon by `index.html`.

- [x] **Step 1: Write the failing integration and design tests**

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const faviconUrl = new URL('../public/favicon.svg', import.meta.url);

test('index connects the SVG favicon from Vite public assets', () => {
  assert.match(html, /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="\/favicon\.svg"\s*\/>/);
  assert.equal(existsSync(faviconUrl), true);
});

test('favicon uses the approved Sweep Ring palette without a centered terracotta dot', () => {
  assert.equal(existsSync(faviconUrl), true);
  const svg = readFileSync(faviconUrl, 'utf8');
  assert.match(svg, /viewBox="0 0 64 64"/);
  for (const color of ['#242724', '#dcc9a9', '#ac5045', '#8fae8a']) {
    assert.match(svg.toLowerCase(), new RegExp(color));
  }
  assert.doesNotMatch(svg.toLowerCase(), /<circle[^>]*cx="32"[^>]*cy="32"[^>]*fill="#ac5045"/);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/favicon.test.mjs`

Expected: both tests fail because `index.html` has no favicon link and `public/favicon.svg` does not exist.

- [x] **Step 3: Add the minimal SVG and HTML integration**

Create `public/favicon.svg` with the approved 64Г—64 Sweep Ring geometry: rounded dark tile, sand ring and faint crosshairs, upper-right terracotta scan arc, hollow center diamond, and lower-right sage marker.

Add this line to `index.html` after the viewport metadata:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [x] **Step 4: Verify GREEN and production build**

Run: `node --test tests/favicon.test.mjs`

Expected: 2 tests pass.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [x] **Step 5: Verify the browser result and commit**

Reload `http://127.0.0.1:5173`, confirm the favicon appears in the tab in both application themes, and inspect its 16 px silhouette for the absence of a recording-dot reading.

```powershell
git add -- tests/favicon.test.mjs public/favicon.svg index.html docs/superpowers/plans/2026-07-15-projects-viewer-favicon.md
git commit -m "feat: add Projects Viewer favicon"
```
