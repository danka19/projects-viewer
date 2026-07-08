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

#### Report composition module boundary

The report module should be a deterministic composition module, not an IO or route module.

Proposed module: `server/project-brief-report.mjs`.

Primary export:

```js
buildProjectBriefReport({
  scanOutput,
  config,
  findings,
  changes,
  previousSnapshotAvailable,
  mode,
  since,
  now,
})
```

Input ownership:

| Input | Owner before composition | Report module responsibility |
|---|---|---|
| `scanOutput` | `server.mjs` reads `app-data/projects.generated.json` through existing config-path helpers. | Validate enough shape for composition and derive project items from generated scan data. |
| `config` | `server.mjs` reads saved project config. | Match generated projects to saved tracked-project ids and names when available. |
| `findings` | `server.mjs` obtains current findings through `server/ai-findings.mjs`. | Group findings by project, include review-state counts, unresolved summaries, and finding evidence. |
| `changes` | `server.mjs` or a small orchestration helper computes AI context changes when a valid `since` is available. | Propagate changed categories into report items and safe-state metadata. |
| `previousSnapshotAvailable` | `server.mjs` checks the existing AI context snapshot. | Report baseline availability and include missing-baseline safe states. |
| `mode`, `since`, `now` | `server.mjs` validates or defaults request-level values. | Echo safe metadata and use injected time for deterministic tests. |

Allowed dependencies:

- Pure AI context helpers such as `buildAllProjectsAiContext`, `compareAiContextChanges`, and `normalizeEvidence` when useful for context shaping, comparison, or evidence normalization.
- Shared constants/types once report types are added to `src/types.ts`.

Forbidden dependencies and side effects:

- No Express `req`/`res`, HTTP status handling, or query parsing.
- No direct filesystem reads/writes, including no direct reads of `app-data/projects.generated.json`, project config, findings store, or AI context snapshot.
- No calls to `writeAiContextSnapshot`.
- No direct calls to `generateFindings`, `updateFindingReviewState`, or any function that persists review state.
- No scanner, watcher, rescan controller, shell command, Git, task/calendar, notification, remote model, auth, or cloud dependency.
- No scanned-project path traversal, arbitrary request path handling, globbing, or raw markdown body loading.

Responsibilities by module:

| Module | Responsibilities |
|---|---|
| `server.mjs` | Local API route orchestration, safe query validation, reading saved config/generated scan data, invoking findings generation if the route design accepts that side effect, reading baseline snapshot, deciding HTTP status codes, and sending JSON responses. |
| `server/project-brief-report.mjs` | Pure report contract composition, item shaping, attention reason construction, summary counts, safe-state objects, evidence aggregation, derived labels, recommendation guard fields, and deterministic ranking once work item 2.4 defines ranking details. |
| `server/ai-context.mjs` | Compact AI context mapping, AI context changes comparison, snapshot path/read/write helpers, and evidence normalization. It should not grow brief-specific ranking or recommendation text. |
| `server/ai-findings.mjs` | Findings generation, findings persistence, review-state updates, stale handling, and review-state filtering. It should not know about report rank, report summary counts, or recommended human decisions. |
| `src/types.ts` | Shared TypeScript contract types after Phase 3 starts implementation. It should describe report shape, not own composition behavior. |
| `tests/project-brief-report.test.mjs` | Future pure composition tests with fixture data; API tests should come later after work item 2.3 finalizes endpoint behavior. |

The module should return either a `project-brief-report` object or a small domain error with a status-like code for missing/invalid generated scan data. It should not know how that error is serialized over HTTP.

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

### Add a local read-only project brief report endpoint

The first retrieval surface should be `GET /api/project-brief-report`.

This endpoint is local API/report JSON first. It should return the structured `project-brief-report` contract and should not add dashboard UI, Markdown rendering, scheduling, notifications, external task/calendar writes, or agent execution.

Allowed query parameters:

| Parameter | Type | Default | Behavior |
|---|---|---|---|
| `since` | ISO timestamp string | Omitted / `null` | Optional comparison anchor. When omitted, the report uses current signals only and `baseline.comparisonAvailable` is `false`. When present, it must parse as a valid timestamp or the endpoint returns `400`. |
| `mode` | `"daily"` or `"weekly"` | `"daily"` | Metadata-only cadence label for the first API design. It must not change data sources, persistence, ranking, or filtering until a later design explicitly accepts that behavior. |

Rejected query/body inputs:

- `path`, `projectPath`, `workspacePath`, `rootPath`, `scanPath`, `file`, `files`, `glob`, `include`, `exclude`, `projectId`, and arbitrary selectors.
- Request body input. The endpoint is a `GET` report retrieval surface; it should not use a request body.
- Any command, action, agent, task, calendar, notification, remote provider, auth, or model parameter.

Unknown query parameters should return `400` with a clear error listing allowed parameters. This is intentionally stricter than silent ignore so path-like integration mistakes are visible during testing.

HTTP behavior:

| Condition | Status | Response |
|---|---|---|
| Generated scan data exists and request parameters are valid | `200` | `project-brief-report` JSON. |
| `app-data/projects.generated.json` is missing or invalid | `404` | Structured error with a stable `missing-generated-scan-data` code; it must not scan request-provided paths as a fallback. |
| `since` is present but invalid | `400` | Error response stating that `since` must be a valid ISO timestamp. |
| Unsupported `mode` value | `400` | Error response stating that `mode` must be `daily` or `weekly`. |
| Unknown query parameter is present | `400` | Error response stating the allowed parameters. |
| Previous AI context snapshot is missing | `200` | Report JSON with `missing-previous-baseline` safe state when `since` is valid, and current signals can still appear. |
| Findings store is missing but generated scan data exists | `200` | Report JSON with `missing-findings-store` or `empty-findings` safe state; ordinary report retrieval should not generate and persist findings. |

Route orchestration responsibilities:

1. Validate that only `since` and `mode` query parameters are present.
2. Validate `since` and `mode`.
3. Read generated scan data through existing app-data config-path helpers.
4. Read saved project config.
5. Read previous AI context snapshot before composition.
6. Read current findings review state without generating or persisting new findings.
7. Compute AI context changes only when `since` is valid and present.
8. Call `buildProjectBriefReport(...)`.
9. Serialize domain errors to HTTP errors.

Snapshot behavior remains intentionally unresolved until work item 2.4. For work item 2.3, ordinary report retrieval must not introduce a new persistence source or report-history store, and it must not update the AI context snapshot unless work item 2.4 explicitly accepts that side effect. It also must not write `app-data/ai.findings.generated.json`; if fresh findings generation becomes necessary for report freshness, that requires an explicit later design decision because it makes a `GET` report retrieval mutate local runtime data.

### Rank attention without claiming authority

The report may rank or group items by attention reason, such as unresolved findings, blockers, approval gates, or changed next actions. It must phrase outcomes as recommendations for human review, not actions taken or verified truth.

Alternative considered: mark the highest-ranked item as the next mandatory task. Rejected because findings and summaries are derived evidence and can be wrong.

#### Ranking, empty-state, and baseline rules

Inclusion rules:

A project appears in `items` when at least one inclusion reason exists:

| Inclusion reason | Source | Attention reason kind |
|---|---|---|
| At least one unresolved finding with `reviewState: "new"` | Findings review state | `unresolved-finding` |
| At least one real blocker | `signalGroups.realBlockers` or compact AI context constraints | `blocker` |
| At least one approval gate | `signalGroups.approvalGates` or compact AI context constraints | `approval-gate` |
| At least one needs-review signal | `signalGroups.needsReview` or compact AI context constraints | `needs-review` |
| `changes.changedCategories` includes `nextAction` | AI context changes | `changed-next-action` |
| `changes.changedCategories` includes `status` or `statusReason` | AI context changes | `changed-status` |
| `changes.changedCategories` includes `riskSummary` | AI context changes | `changed-risk` |
| Current generated data has documentation gaps | Generated scan data / compact AI context gaps | `documentation-gap` |
| Valid `since` was requested, previous baseline is missing, and the project has current blockers, gates, review signals, unresolved findings, or gaps | Baseline state plus current generated data | `first-run-current-signal` |

Unresolved finding means `reviewState: "new"` only. `accepted`, `dismissed`, and `stale` findings remain visible in counts where useful, but they do not create an unresolved-finding attention reason.

Priority mapping:

| Priority | Rule |
|---|---|
| `high` | Any `blocker`, `approval-gate`, or `unresolved-finding` reason exists. |
| `medium` | No high reason exists, and any `needs-review`, `changed-next-action`, `changed-status`, `changed-risk`, or `first-run-current-signal` reason exists. |
| `low` | Only documentation gaps or other non-blocking derived signals exist. |

Reason severity defaults:

| Reason kind | Severity |
|---|---|
| `blocker` | `high` |
| `approval-gate` | `high` |
| `unresolved-finding` | `high` |
| `needs-review` | `medium` |
| `changed-next-action` | `medium` |
| `changed-status` | `medium` |
| `changed-risk` | `medium` |
| `first-run-current-signal` | `medium` |
| `documentation-gap` | `low` |

Deterministic ordering:

1. Priority order: `high`, then `medium`, then `low`.
2. Highest reason severity within the item.
3. Reason kind order: `blocker`, `approval-gate`, `unresolved-finding`, `needs-review`, `changed-next-action`, `changed-status`, `changed-risk`, `first-run-current-signal`, `documentation-gap`.
4. More unresolved findings first.
5. More source-backed blocker, approval-gate, and needs-review signal objects first, counted by distinct signal object rather than by evidence item count.
6. Earlier project name using locale-insensitive lowercase string comparison.
7. Earlier project path using lowercase string comparison.

Ranking guardrails:

- `rank` is review order only. It is not a task order, implementation order, accepted decision, SLA, or command.
- `priority` means attention/review priority only. It must not be labeled as project priority, task priority, or implementation priority.
- Recommendation text must use advisory language such as "review", "decide", "inspect", "confirm", or "choose"; it must not say that the system already resolved, accepted, executed, assigned, or scheduled anything.
- `recommendedHumanDecision.actionTaken` and `recommendedHumanDecision.acceptedDecision` remain `false` for every item, including rank 1 and high-priority items.
- Health score, status, gaps, and summaries remain derived dashboard interpretations unless source evidence says otherwise.
- No-attention states should be expressed through top-level `noAttentionMessage` and `no-attention-items`, not through an item-level recommendation that claims no action is needed.
- First-run baseline items must use "current signal" or "baseline unavailable" language. They must not claim a project "changed", is "new since last report", or is "new since baseline" when no previous baseline exists.
- `first-run-current-signal` is an additional reason when the baseline is unavailable and current signals exist; it does not replace blocker, approval-gate, needs-review, unresolved-finding, or documentation-gap reasons.

Empty-state rules:

| State | Response behavior |
|---|---|
| Generated scan data missing or invalid | API returns `404` with `missing-generated-scan-data`; composition is blocked. |
| Generated scan data exists but contains zero projects | Report returns `200`, `items: []`, `summary.projectCount: 0`, `safeStates` includes `no-attention-items`, and `noAttentionMessage` explains that no tracked generated projects were available for attention ranking. |
| Generated scan data exists and projects exist, but no inclusion reasons are found | Report returns `200`, `items: []`, `safeStates` includes `no-attention-items`, and `noAttentionMessage` states that no changed projects, unresolved findings, blockers, approval gates, review signals, or relevant gaps were found. |
| Findings store missing or unreadable but scan data exists | Report returns `200` with `missing-findings-store` safe state. It may still rank current blockers, gates, changes, and gaps. |
| Findings data exists but has no unresolved findings | Report returns `200` with `empty-findings` safe state only when there are no finding records or no unresolved `reviewState: "new"` finding records to summarize; this does not block blockers/gates/change items. |

Safe-state combinations:

- `missing-findings-store` or `empty-findings` may appear with ranked items from blockers, gates, review signals, changes, or documentation gaps.
- `no-attention-items` appears only when `items` is empty.
- `missing-previous-baseline` may appear with ranked current-signal items and must have `blocksReport: false`.
- `missing-generated-scan-data` blocks report composition and is handled as the API `404` case.

Documentation gap inclusion:

- Include gaps that map to missing specs/design, missing audit/review/verification evidence, stale handoff pointers, or other review-relevant dashboard gaps.
- Do not include purely informational coverage notes as attention items unless Phase 3 implementation proves they are used as current dashboard gaps.

Baseline and snapshot rules:

| Case | Behavior |
|---|---|
| `since` omitted | Report uses current signals only; `baseline.requestedSince` is `null`, `comparisonAvailable` is `false`, and no missing-baseline warning is required. |
| `since` valid and previous snapshot exists | Report can include changed categories from snapshot comparison; `comparisonAvailable` is `true`. |
| `since` valid and previous snapshot missing | Report returns `200` if generated scan data exists; `safeStates` includes non-blocking `missing-previous-baseline`; current blockers, gates, unresolved findings, and gaps can still produce items. |
| `since` valid and previous snapshot is unreadable/corrupt | Treat as baseline unavailable for the first implementation: return `200` with non-blocking `missing-previous-baseline` when generated scan data exists, and do not overwrite the snapshot from report retrieval. |
| `since` invalid | API returns `400` before composition. |
| Snapshot write | Not performed by `GET /api/project-brief-report`. Report retrieval is read-only with respect to `app-data/ai.context.snapshot.json`. A future explicit "mark baseline seen" behavior would require a separate design decision and endpoint/action. |

No report history store is introduced in this change. Current reports are regenerated from saved config, generated scan data, existing findings review state, and existing baseline state.

Rejected labels and automations:

- Do not use labels such as "next mandatory task", "accepted recommendation", "source of truth", "resolved", "approved", "assigned", "scheduled", "implemented", or "all clear" for report output.
- Do not trigger rank-based automation such as starting rank 1, creating tasks for high-priority items, accepting blockers, or marking findings handled.

### Reuse existing local runtime files

The report should not introduce a new persistent store in the first slice. It can read the generated scan output, findings store, and AI context snapshot behavior already used by changes-since. If a future implementation needs report history, that requires a separate design decision.

Alternative considered: persist every generated report. Deferred because current Phase 1 value is a current brief, not audit-grade report history.

## Risks / Trade-offs

- Report recommendations could look authoritative -> Mitigation: every recommendation must be labeled as a recommended human decision and preserve evidence where available.
- Missing previous snapshot could make first-run output noisy -> Mitigation: return a clear first-run or missing-baseline warning and still provide current attention items.
- Report logic could duplicate AI context logic -> Mitigation: compose existing context/findings helpers and keep only report-specific ranking and shaping in the new module.
- A JSON-only first slice is less visible than a dashboard UI -> Mitigation: JSON gives a testable contract first; UI can follow once the content proves useful.
