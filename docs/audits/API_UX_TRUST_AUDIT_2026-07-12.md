# API And UX Trust Audit

Status: verification complete; four confirmed findings require the remediation routing recorded below.

Date: 2026-07-12 (Asia/Vladivostok).

## Boundary And Outcome

This audit records one verification session against Projects Viewer on branch `dashboard-redesign/ui-rebuild` at `http://127.0.0.1:5173`. It covers the local API boundary, query validation and read-only behavior, scan concurrency evidence, automated regression and build health, first-glance usability, navigation and search behavior, theme and responsive behavior, console health, and the accuracy of scanner-derived blockers and next actions.

The verification found a healthy build, 198 passing automated tests, correct responses for known API routes, unchanged runtime-data hashes during repeated read-only requests, working desktop/mobile navigation, no page-level mobile overflow, and no browser console warnings or errors. It also confirmed four information-trust defects: an unknown API route returns the frontend HTML shell, scanner output promotes false blockers, scanner output promotes a false next action, and search can hide the text that explains why a result matched.

This was verification and documentation work only. No defect fix, product behavior change, roadmap placement, or OpenSpec remediation artifact was implemented as part of this audit.

## Criteria And Classification

The API criteria were availability and status, JSON content type and contract shape, validation and domain errors, unsafe/path-like parameter rejection, read-only side effects, response time, scan concurrency/throttle behavior, automated regression coverage, and build health.

The UI criteria were first-glance hierarchy, project and view navigation, search and keyboard behavior, Manage Projects clarity, theme behavior, responsive/mobile layout, horizontal overflow, console errors, and the accuracy and explainability of displayed project information.

Results use these classifications:

- **Confirmed defect:** directly reproduced and supported by implementation or generated-data evidence.
- **Verified limitation:** a known boundary on what this session established.
- **Pass:** observed behavior met the criterion in the exercised scenario.
- **Unverified suspicion:** plausible but not established; none are promoted to findings in this audit.

Severity expresses user and automation trust impact: **high** can materially misstate project state or violate an API contract used by agents; **medium** impairs interpretation or usability without corrupting source data; **low** has limited operational impact.

## Environment And Reproducible Evidence

- Repository: `C:\Users\danoc\Documents\projects\projects-viewer`
- Branch: `dashboard-redesign/ui-rebuild`
- Local URL: `http://127.0.0.1:5173`
- Date/timezone: 2026-07-12, Asia/Vladivostok
- Configured scan at build time: 6 projects, 284 Markdown files processed, 142 items skipped

The verification used these commands and equivalent browser requests:

```powershell
npm test
npm run build
git diff --check
Get-FileHash -Algorithm SHA256 app-data/projects.config.json, app-data/projects.generated.json
```

The API matrix exercised direct `GET` requests to the routes listed below and inspected HTTP status, `Content-Type`, response shape/domain code, and elapsed time. Browser evidence came from the actual local UI in the in-app browser at desktop and 390x844 mobile sizes; it included DOM geometry, keyboard interaction, theme and project/view switching, and console inspection.

### Automated Verification

| Check | Result | Classification |
|---|---|---|
| `npm test` | Node test runner 107/107 passed; posttest Vitest 91/91 passed; total 198/198 | Pass |
| `npm run build` | TypeScript no-emit and Vite production build passed; 65 modules transformed | Pass |
| `git diff --check` | Passed | Pass |
| Scan behavior coverage | Automated tests cover report/preflight read-only boundaries and single-flight scanning with one queued rescan | Pass for covered scenarios |
| 30-second minimum rescan throttle | `server/scan-controller.mjs` defaults `minIntervalMs` to `30_000`, but the concurrency test sets it to `0`; this session did not separately exercise the 30-second delay | Verified limitation |

### API Matrix

| Request | Observed result | Classification |
|---|---|---|
| `GET /api/projects` | 200 JSON, 80 ms | Pass |
| `GET /api/config` | 200 JSON, 5 ms | Pass |
| `GET /api/scan-status` | 200 JSON, 1 ms | Pass |
| `GET /api/project-brief-report` | 200 JSON, 15 ms, `kind=project-brief-report` | Pass |
| Weekly report with valid `since` | 200 JSON, 14 ms | Pass |
| Report with invalid `mode=monthly` | 400 JSON, 1 ms | Pass |
| Report with unsafe `path=C:\temp` | 400 JSON, 1 ms | Pass |
| Preflight for `projects-viewer`, role `verification` | 200 JSON, 18 ms, `kind=agent-preflight-packet` | Pass |
| Preflight without `projectId` | 400 JSON, `code=invalid-query` | Pass |
| Preflight for unknown project | 404 JSON, `code=project-not-found` | Pass |
| Preflight with unsafe `path=C:\temp` | 400 JSON, `code=invalid-query` | Pass |
| AI context for unknown project | 404 JSON | Pass |
| `GET /api/definitely-unknown` | Expected 404 JSON; received 200 `text/html` Vite shell | Confirmed defect, API-001 |

A fresh final spot-check reproduced API-001 while `/api/projects`, invalid report mode, and valid preflight continued to return the expected statuses and content types.

### Read-Only Side-Effect Evidence

The paired before/after check established that three repeated daily-report and verification-preflight requests did not change either existing runtime file. The raw verification record did not retain the paired hash strings. A later Task 2 documentation check recorded these current SHA-256 values separately:

| File | SHA-256 at the later documentation check |
|---|---|
| `app-data/projects.config.json` | `C02AFE93F5CF0A277CEED07E7404688E34FB8714AE4E0101A9127D376B940C6D` |
| `app-data/projects.generated.json` | `4344FEB50ADA7E39F597FFD3D2CB74979D3628C272B4959050057118A725F6C8` |

The paired check, not the later values, proves no changes to those two files in the exercised calls. It does not assert that every possible file or mutation endpoint was observed live; the broader read-only boundary is supported by the focused automated tests noted above.

### Browser, Responsive, And Console Evidence

- Desktop light and dark themes rendered without browser console warnings or errors.
- Project switching worked from `AutoParts` to `projects-viewer`.
- Roadmap and Specs Canvas switching worked. Specs Canvas exposed status, task counts, progress, zoom, Fit all, Center active, and archive controls.
- Global search accepted `preflight packet`; ArrowDown selected a result and Escape dismissed the result list.
- Manage Projects displayed the config location, add-project/workspace actions, tracked-project states, rescan/remove actions, and documentation-view controls.
- At 390x844, the sidebar became `Switch selected project`; selecting `finance-sheets` updated both the visible heading and selected option.
- At the 390 px viewport, document/body `scrollWidth` measured 380 px against a 390 px viewport: no global horizontal overflow.
- An immediate mobile screenshot briefly omitted lower content after the viewport change, but DOM geometry showed the content present and a 250 ms follow-up rendered it. This is classified as capture/reflow timing, not a product defect.
- The UI was restored after verification to `AutoParts`, light theme, empty search, and a 1280 px viewport.

## Confirmed Findings

### API-001 — Unknown API route returns the frontend shell

- **Classification / severity:** confirmed defect / high.
- **Affected behavior and impact:** `GET /api/definitely-unknown` returns HTTP 200 and `text/html` instead of a JSON 404. Clients and MCP adapters can mistake an unavailable API route for success and receive frontend markup outside the API contract.
- **Reproducible evidence:** the API matrix and fresh spot-check both produced the same response while known success and error routes retained correct JSON responses.
- **Verified root cause:** `server.mjs` mounts known `/api/*` handlers and then Vite/static SPA middleware without a final `/api/*` JSON 404 handler.
- **Residual uncertainty:** this audit did not enumerate every unknown method/path combination; the reproduced catch-all ordering explains the tested unknown GET route.
- **Recommended next action:** implement and verify existing `harden-mcp-context-api` tasks 3.1–3.3; do not create duplicate requirements.
- **Canonical artifacts:** [`MCP_CONTEXT_API_HARDENING_PLAN.md`](../planning/MCP_CONTEXT_API_HARDENING_PLAN.md) and [`harden-mcp-context-api`](../../openspec/changes/harden-mcp-context-api/).

### DATA-001 — False real blockers enter trusted project state

- **Classification / severity:** confirmed defect / high.
- **Affected behavior and impact:** all three displayed real blockers for `projects-viewer` were false positives and affected blocker count, project status, and health. Only `**THEN** its dependent remains blocked` became the scalar `summary.mainBlocker`. The dashboard therefore presents non-blocking specification/task text with the authority of current project state.
- **Reproducible evidence:** `signalGroups.realBlockers` contained (1) `**THEN** its dependent remains blocked` from `openspec/changes/add-selectable-specs-canvas/specs/spec-work-model/spec.md:37`, whose preceding line is the normative `WHEN`; and completed items (2) `[x] 1.1 ... checkbox blocker ...` and (3) `[x] 1.3 ... hard-block pattern.` from `openspec/changes/harden-dashboard-state-derivation/tasks.md:3,5`. All had `includedInProjectStatus=true`.
- **Verified root cause:** `TASK_RE` matches both `[ ]` and `[x]`, and the later blocker guard does not inspect the captured completion state. Separately, `CONDITIONAL_BLOCK_RE` evaluates only the current line, so it misses cross-line OpenSpec `WHEN`/`THEN` normative context.
- **Residual uncertainty:** semantic blocker accuracy was not manually audited across the other five configured projects, so this finding does not establish that all 28 cross-project blocker items are false.
- **Recommended next action:** cover both verified extraction shapes in the authorized, non-overlapping scanner/search trust change, extending rather than duplicating the existing state-derivation contract.
- **Canonical context:** [`harden-dashboard-state-derivation`](../../openspec/changes/harden-dashboard-state-derivation/) owns existing source and unchecked-task trust rules but does not cover checked tasks or cross-line normative conditions.

### DATA-002 — Implemented proposal prose becomes the primary next action

- **Classification / severity:** confirmed defect / high.
- **Affected behavior and impact:** the main next-action card for `projects-viewer` displayed an already implemented proposal statement, `Next-action signals ... are no longer sourced ...`, instead of active work. This can direct the owner or an agent toward completed/non-actionable behavior.
- **Reproducible evidence:** the promoted line came from `openspec/changes/harden-dashboard-state-derivation/proposal.md:7` and appeared as the selected project's primary next action.
- **Verified root cause:** `NEXT_ACTION_RE` matches `Next-action signals`; the same explanatory line includes the example marker ``NEXT:``, satisfying the secondary `is|should|must|:` check despite lacking active-work semantics.
- **Residual uncertainty:** the audit verified this exact false positive, not every heading, embedded marker example, or explanatory use of next-action terminology.
- **Recommended next action:** add real-shape regression fixtures and require active-work semantics in the authorized scanner/search trust change.
- **Canonical context:** [`harden-dashboard-state-derivation`](../../openspec/changes/harden-dashboard-state-derivation/) covers excluded source categories but does not own this explanatory-prose shape.

### SEARCH-001 — Search result hides why it matched

- **Classification / severity:** confirmed defect / medium.
- **Affected behavior and impact:** query `preflight packet` returned eight results, but the highest-ranked option began `Decision required for the next phase: choose whether the next product slice is dashboard U` and exposed no visible matching text. The source later contains `agent preflight packet follow-up`; hiding that fragment makes a correct result look unrelated and weakens search explainability. A related decision can also appear as both Next action and Decision when source evidence differs.
- **Reproducible evidence:** the query, result order, keyboard selection, displayed label, and full source text were inspected in the live UI.
- **Verified root cause:** the result label uses `text.slice(0, 90)`, which truncates before the matching phrase rather than selecting a match-aware fragment.
- **Residual uncertainty:** this session did not measure every query position, source kind, or long-text truncation case. Keyboard behavior itself passed.
- **Recommended next action:** require a visible matching fragment or equivalent query-to-result explanation while preserving evidence deduplication in the authorized scanner/search trust change.
- **Canonical context:** [`improve-dashboard-search-navigation`](../../openspec/changes/improve-dashboard-search-navigation/) owns deterministic ranking and deduplication, but its current requirements do not require visible match fragments.

## Positive Results

- Known API success, validation, unsafe-input, and unknown-project cases returned the expected JSON statuses and stable shapes/codes in the matrix.
- Repeated report/preflight reads did not change either hashed runtime file.
- Automated coverage passed for report/preflight read-only behavior and scan single-flight/one-queued-rescan behavior.
- All 198 automated tests and the production build passed.
- Desktop light/dark rendering, project and primary-view switching, search keyboard dismissal, Manage Projects content, and mobile project selection worked.
- No global overflow was measured at 390x844, and the browser console contained no warnings or errors.

## Scope Limitations And Residual Risk

- Full semantic accuracy of blocker and action extraction across the other five configured projects was not manually audited. The cross-project count must not be treated as a confirmed false-positive count.
- API mutation endpoints were exercised through isolated automated tests rather than against the live saved config.
- The scan-controller test proves single-flight execution and one queued rescan with throttling disabled. Although the implementation default is 30 seconds, this audit did not separately establish the real 30-second delay behavior.
- Response times are single local observations, not a benchmark or service-level guarantee.
- Browser checks are representative manual evidence, not visual-regression automation across all content states and browsers.
- External integrations, cloud, authentication, arbitrary-path scanning, and scanned-project writes were not tested because they are outside the current approved product scope.

## Duplicate Search And Remediation Routing

Focused repository searches covered `docs/audits`, `docs/planning`, `docs/ROADMAP.md`, and `openspec/changes` for unknown API/HTML fallback language, checked/completed-task and cross-line blocker extraction, false next-action wording, and match-context/search-snippet requirements.

The search established these ownership decisions:

- API-001 is already specified and tasked by `harden-mcp-context-api`, especially tasks 3.1–3.3. This audit only supplies fresh evidence.
- Existing `harden-dashboard-state-derivation` requirements exclude untrusted source categories and distinguish unchecked plan tasks from blockers, but they do not cover checked `[x]` task text, cross-line OpenSpec normative conditions, or explanatory next-action terminology with embedded marker examples.
- Existing `improve-dashboard-search-navigation` requirements cover deterministic ranking, source-aware deduplication, visible project/type context, keyboard operation, and scope disclosure, but not a visible matching fragment.
- Therefore DATA-001, DATA-002, and SEARCH-001 require one new non-overlapping scanner/search trust change. The user explicitly authorized creation of its specs, tasks, and roadmap placement; that remediation is separate from this audit artifact.

The dated audit owns the observations, evidence, classifications, findings, and residual risks. OpenSpec owns proposed behavior and acceptance scenarios; the roadmap owns sequencing. Those requirements are linked above instead of copied here.
