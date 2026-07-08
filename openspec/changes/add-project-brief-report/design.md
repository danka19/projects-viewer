## Context

Projects Viewer currently has three relevant layers: read-only scan output in `app-data/projects.generated.json`, compact AI context and changes-since helpers, and review-required AI findings stored under `app-data/`. Phase 1 selected a daily/weekly brief as the recommended first end-to-end AI-assisted workflow because it helps the human owner decide what changed and what needs attention without granting AI control.

The report must stay local-only and advisory. It is a composition layer over accepted `ai-context` and `ai-findings` behavior, not a new source of project truth.

## Goals / Non-Goals

**Goals:**

- Produce a structured local project brief/report from saved config, generated scan data, AI context changes, and findings review state.
- Highlight changed projects, unresolved findings, likely blockers, approval gates, and recommended human decisions.
- Preserve source evidence where available and clearly label derived interpretations.
- Support safe first-run and missing-data behavior.
- Keep the report usable by both a human dashboard/report surface and future AI-agent preflight.

**Non-Goals:**

- No remote LLM provider, cloud sync, auth, API keys, external issue tracker, calendar, or Trello integration.
- No automatic task creation, commits, shell commands, notifications, or scanned-project edits.
- No full findings-review UI in this change.
- No change to accepted `ai-context` or `ai-findings` requirements unless implementation evidence later proves their contracts insufficient.

## Decisions

### Add a dedicated report composition module

The implementation should add a focused module, for example `server/project-brief-report.mjs`, that accepts generated scan data, saved config, changes-since output, and findings. This keeps report ranking and message construction separate from `server.mjs` routing and avoids overloading `server/ai-context.mjs` with presentation concerns.

Alternative considered: build the report directly inside the API route. Rejected because report rules need independent tests and will likely evolve.

### Make structured JSON the primary contract

The first implementation should return a structured JSON report with metadata, project items, evidence, recommended human decisions, and warnings. A text/Markdown rendering can be added later from the same data shape.

Alternative considered: generate only Markdown. Rejected because JSON is easier to test, easier for AI agents to consume, and safer for future UI rendering.

### Rank attention without claiming authority

The report may rank or group items by attention reason, such as unresolved findings, blockers, approval gates, or changed next actions. It must phrase outcomes as recommendations for human review, not actions taken or verified truth.

Alternative considered: mark the highest-ranked item as the next mandatory task. Rejected because findings and summaries are derived evidence and can be wrong.

### Reuse existing local runtime files

The report should not introduce a new persistent store in the first slice. It can read the generated scan output, findings store, and AI context snapshot behavior already used by changes-since. If a future implementation needs report history, that requires a separate design decision.

Alternative considered: persist every generated report. Deferred because current Phase 1 value is a current brief, not audit-grade report history.

## Risks / Trade-offs

- Report recommendations could look authoritative -> Mitigation: every recommendation must be labeled as a recommended human decision and preserve evidence where available.
- Missing previous snapshot could make first-run output noisy -> Mitigation: return a clear first-run or missing-baseline warning and still provide current attention items.
- Report logic could duplicate AI context logic -> Mitigation: compose existing context/findings helpers and keep only report-specific ranking and shaping in the new module.
- A JSON-only first slice is less visible than a dashboard UI -> Mitigation: JSON gives a testable contract first; UI can follow once the content proves useful.
