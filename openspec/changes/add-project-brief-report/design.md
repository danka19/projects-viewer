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

#### Project brief report JSON contract

The report contract is intentionally advisory and deterministic. It is a report over derived local state, not a new accepted-decision store.

Top-level shape:

| Field | Type | Source / rule | Purpose |
|---|---|---|---|
| `kind` | `"project-brief-report"` | Constant. | Lets clients distinguish this response from AI context and findings responses. |
| `schemaVersion` | Number | Starts at `1`. | Gives future clients a stable migration hook for report shape changes. |
| `generatedAt` | ISO timestamp | Report generation time. | Records when the report was composed. |
| `mode` | `"daily"` or `"weekly"` | Safe request parameter or default. | Describes the intended review cadence without changing data sources. |
| `since` | ISO timestamp or `null` | Optional safe request parameter. | Defines the requested comparison anchor when supplied. |
| `generatedFrom` | Object | Constant plus file/source names. | States that the report used saved config, generated scan data, AI context changes, and findings review state. |
| `inputState` | Object | Local input availability checks. | Separates whether inputs existed from report warnings and item composition. |
| `baseline` | Object | AI context snapshot availability and comparison result. | Makes first-run and missing-baseline behavior explicit. |
| `safeStates` | Array of safe-state objects | Missing/empty local data checks. | Gives clients clear warnings or empty states without fallback scans; this is the report's structured warning list. |
| `summary` | Object | Derived counts from report items and inputs. | Supports quick triage without treating counts as accepted truth. |
| `items` | Array of project brief items | Ranked deterministic composition over current project context, changes, constraints, and findings. | Lists projects needing attention or explicitly remains empty. |
| `noAttentionMessage` | String or `null` | Present only when generated data exists and no item qualifies. | Gives a clear no-attention state. |
| `workBoundaries` | Object of booleans | Constant safety assertions. | Keeps no-action, local-only, read-only, and no-remote-provider rules machine-readable. |

`generatedFrom` fields:

| Field | Type | Required value |
|---|---|---|
| `projectConfig` | `"app-data/projects.config.json"` | Saved tracked-project config only. |
| `scanData` | `"app-data/projects.generated.json"` | Generated scan output only. |
| `aiContextChanges` | `"derived"` or `"unavailable"` | Derived by existing AI context comparison helpers when a valid `since` is supplied. |
| `aiFindings` | `"app-data/ai.findings.generated.json"` | Findings review state store. |
| `remoteServicesUsed` | `false` | No cloud/model provider/sync call. |

`inputState` fields:

| Field | Type | Meaning |
|---|---|---|
| `generatedScanAvailable` | Boolean | Whether `app-data/projects.generated.json` was present and valid. |
| `trackedProjectCount` | Number | Count from saved config or generated scan data, depending on which inputs are available. |
| `previousBaselineAvailable` | Boolean | Whether the AI context snapshot existed before composition. |
| `findingsAvailable` | Boolean | Whether findings data could be read or generated from current scan data. |
| `changesAvailable` | Boolean | Whether a changes-since comparison could be computed. |

`baseline` fields:

| Field | Type | Meaning |
|---|---|---|
| `kind` | `"ai-context-snapshot"` | The current baseline source. |
| `requestedSince` | ISO timestamp or `null` | Mirrors `since`. |
| `previousSnapshotAvailable` | Boolean | Whether `app-data/ai.context.snapshot.json` existed and could be used. |
| `comparisonAvailable` | Boolean | Whether changes could be computed. |
| `message` | String | Human-readable baseline note, especially for first run. |

Baseline rules:

- If `since` is `null`, `comparisonAvailable` is `false`, `generatedFrom.aiContextChanges` is `"unavailable"`, and the report uses current signals only.
- If `since` is a valid ISO timestamp and a previous snapshot exists, `comparisonAvailable` is `true` and changed categories come from AI context snapshot comparison.
- If `since` is valid but no previous snapshot exists, `comparisonAvailable` is `false`, `previousSnapshotAvailable` is `false`, and `safeStates` includes `missing-previous-baseline` while the report can still include current blockers, gates, gaps, and unresolved findings.
- Invalid `since` handling belongs to the API surface decision in work item 2.3; the report composition contract should not silently reinterpret invalid timestamps.

Safe-state object fields:

| Field | Type | Meaning |
|---|---|---|
| `code` | `"missing-generated-scan-data"`, `"missing-previous-baseline"`, `"missing-findings-store"`, `"empty-findings"`, or `"no-attention-items"` | Stable safe-state identifier. |
| `severity` | `"info"`, `"warning"`, or `"error"` | `error` only when no report items can be generated, for example missing scan data. |
| `message` | String | Client-readable explanation. |
| `blocksReport` | Boolean | Whether the state prevents item composition. |

Summary fields:

| Field | Type | Meaning |
|---|---|---|
| `projectCount` | Number | Number of projects in generated scan data when available. |
| `itemCount` | Number | Number of project brief items returned. |
| `highPriorityCount` | Number | Number of items with `priority: "high"`. |
| `unresolvedFindingCount` | Number | Sum of unresolved findings represented in item summaries. |
| `blockerCount` | Number | Count of report blockers represented in items. |
| `approvalGateCount` | Number | Count of approval-gate reasons represented in items. |
| `changedProjectCount` | Number | Count of items with at least one changed category. |
| `safeStateCount` | Number | Number of safe-state entries. |

Project brief item fields:

| Field | Type | Source / rule |
|---|---|---|
| `project` | `{ id, name, path }` | Saved config id when known plus generated project identity. |
| `priority` | `"high"`, `"medium"`, or `"low"` | Deterministic ranking tier, not authority. |
| `rank` | Number | 1-based deterministic order after ranking. |
| `attentionReasons` | Array | Stable reason objects such as unresolved findings, blockers, approval gates, changed next action, changed status/risk/gaps, or needs review. |
| `changedCategories` | Array | Existing AI context change categories when known. |
| `findingsSummary` | Object | Counts by review state plus unresolved finding ids and compact unresolved finding summaries. |
| `blockers` | Array | Source-backed blocker/approval/needs-review summaries from current context. |
| `currentState` | Object | Derived status, health score, current phase, next action, main blocker, and main risk. |
| `evidence` | Array | Source and derived-summary evidence references used by the item. |
| `derivedLabels` | Array of derived-label objects | Labels for derived interpretation fields used without direct source evidence. |
| `recommendedHumanDecision` | Object | Advisory decision prompt for the human owner. |

Attention reason object fields:

| Field | Type | Meaning |
|---|---|---|
| `kind` | `"unresolved-finding"`, `"blocker"`, `"approval-gate"`, `"needs-review"`, `"changed-next-action"`, `"changed-status"`, `"changed-risk"`, `"documentation-gap"`, or `"first-run-current-signal"` | Stable reason for inclusion. |
| `label` | String | Short display label. |
| `severity` | `"high"`, `"medium"`, or `"low"` | Used for deterministic ranking. |
| `source` | `"ai-finding"`, `"ai-context"`, `"scan-summary"`, or `"baseline"` | Makes derivation visible. |

Derived-label object fields:

| Field | Type | Meaning |
|---|---|---|
| `field` | String | Dot-path for the report field, such as `currentState.status`, `currentState.healthScore`, or `recommendedHumanDecision`. |
| `reason` | `"derived-status"`, `"derived-health-score"`, `"derived-summary"`, `"derived-recommendation"`, or `"missing-source-line"` | Stable reason the field is labeled as derived. |
| `evidenceKind` | `"derived-summary"` | Keeps the label aligned with evidence semantics. |

Finding summary fields:

| Field | Type | Meaning |
|---|---|---|
| `unresolvedCount`, `acceptedCount`, `dismissedCount`, `staleCount` | Number | Review-state counts from findings data. |
| `unresolvedIds` | Array of strings | Finding ids for review workflows. |
| `unresolved` | Array | Compact unresolved finding summaries with `id`, `type`, `title`, `confidence`, and `evidence`. |

Recommended human decision fields:

| Field | Type | Meaning |
|---|---|---|
| `kind` | `"review-findings"`, `"resolve-blocker"`, `"approve-or-reject-gate"`, `"choose-next-action"`, `"inspect-changes"`, or `"no-action-needed"` | Stable decision category. |
| `prompt` | String | Advisory human-readable decision prompt. |
| `rationale` | String | Why this is recommended from report evidence. |
| `actionTaken` | `false` | Constant guard: report generation never performs the decision. |
| `acceptedDecision` | `false` | Constant guard: recommendation is not project truth. |

Evidence fields reuse `AiEvidenceItem`: `kind` is either `source` or `derived-summary`; source evidence includes `file`, optional `line`, and optional `text`; derived evidence includes explanatory `text`.

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
