## Context

Projects Viewer has accepted `ai-context` and `ai-findings` specs, plus an active `add-project-brief-report` proposal for a daily/weekly human decision aid. The human brief/report is meant to help the human owner choose what needs attention. Agent preflight is adjacent but different: it should prepare an AI implementation, reviewer, checker, or handoff agent to start work safely by showing the project state, relevant requirements, required reading, evidence, verification expectations, and boundaries.

The packet must remain local-only and advisory. It is a composition layer over saved config, generated scan data, accepted AI context, AI findings review state, OpenSpec artifacts, phase/audit/checklist signals, and current change metadata. It is not a command channel and not an accepted-decision store.

## Goals / Non-Goals

**Goals:**

- Produce a structured `agent-preflight-packet` JSON object for a configured tracked project before agent work begins.
- Keep the packet distinct from the daily/weekly `project-brief-report` contract.
- Orient agents around active change context, relevant OpenSpec requirements, required read order, likely blockers, review-required findings, and verification expectations.
- Preserve source evidence where available and label derived interpretations.
- Provide safe missing-data behavior when generated scan data, findings, OpenSpec metadata, or phase/audit signals are unavailable.
- Preserve local-only, read-only, no-action boundaries.

**Non-Goals:**

- No replacement for `AGENTS.md`, OpenSpec specs, phase plans, audits, or source files.
- No dashboard UI, Markdown rendering, scheduling, reminders, Trello/calendar integration, or notification workflow in the first slice.
- No remote LLM provider, cloud sync, auth, API keys, external issue tracker, arbitrary shell command, agent execution, or write-back to scanned projects.
- No automatic selection of a project from arbitrary request paths.
- No change to accepted `ai-context`, `ai-findings`, or proposed `project-brief-report` requirements.

## Decisions

### Add a dedicated agent preflight composition module

The implementation should add a focused pure module, for example `server/agent-preflight-packet.mjs`, instead of extending `server/project-brief-report.mjs` or `server/ai-context.mjs`.

Proposed primary export:

```js
buildAgentPreflightPacket({
  scanOutput,
  config,
  projectId,
  agentRole,
  changeId,
  aiContext,
  findings,
  openspecState,
  phaseSignals,
  auditSignals,
  checklistSignals,
  now,
})
```

The module should return either an `agent-preflight-packet` object or a small domain error with a stable code. It should not know how that error is serialized over HTTP.

Allowed responsibilities:

- Match a requested project id to saved config and generated scan data.
- Shape compact project state and active change context for agent consumption.
- Include relevant OpenSpec requirements and proposed change tasks as references, not as copied source-of-truth replacements.
- Summarize required read order and verification expectations from project docs/checklists when available.
- Group blockers, gates, unresolved findings, stale docs, risks, and missing verification signals.
- Attach source evidence and derived labels.
- Produce safe-state warnings for missing optional inputs.

Forbidden responsibilities and side effects:

- No Express `req`/`res`, HTTP status handling, or query parsing.
- No direct filesystem writes.
- No scanned-project file writes, moves, deletes, formatting, or generated task creation.
- No direct calls to scanner, watcher, rescan controller, shell commands, Git, task/calendar systems, notification systems, remote models, auth, or cloud services.
- No direct calls that persist findings review state or AI context snapshots.
- No arbitrary request path handling, globbing, raw markdown body loading, or whole-disk scanning.

Alternative considered: add an `agent` mode to `project-brief-report`. Rejected because daily/weekly human brief output and agent preflight output optimize for different consumers, language, sections, and acceptance checks. Sharing a `mode` would invite fields that are confusing for both.

### Make JSON the primary packet contract

The first retrieval surface should return structured JSON, not prose. A future UI or Markdown rendering can be generated from the JSON after the contract proves useful.

Top-level shape:

| Field | Type | Purpose |
|---|---|---|
| `kind` | `"agent-preflight-packet"` | Distinguishes this response from AI context and human brief output. |
| `schemaVersion` | Number | Starts at `1`. |
| `generatedAt` | ISO timestamp | Records composition time. |
| `project` | Object | Saved tracked project identity and generated scan identity. |
| `agentRole` | `"implementation"`, `"reviewer"`, `"verification"`, or `"handoff"` | Describes the intended agent workflow. |
| `change` | Object or `null` | Active OpenSpec change id, status, requirements, and task references when requested or detected. |
| `generatedFrom` | Object | Lists local sources used and confirms no remote services. |
| `inputState` | Object | Availability of generated scan data, AI context, findings, OpenSpec, phase docs, audit docs, and checklist docs. |
| `safeStates` | Array | Missing-data or boundary warnings. |
| `requiredReading` | Array | Ordered project docs and change artifacts an agent should read before work. |
| `projectState` | Object | Compact current project status, phase, next action, blocker, risk, and recent decision. |
| `acceptanceMap` | Array | Requirement/task references and suggested evidence targets. |
| `attentionSignals` | Array | Blockers, gates, unresolved findings, stale docs, missing verification, or risks. |
| `verificationPlan` | Array | Commands or manual checks to consider; advisory only and not executed by packet retrieval. |
| `workBoundaries` | Object | Machine-readable no-action and read-only guard fields. |
| `evidence` | Array | Source or derived-summary evidence used by the packet. |
| `derivedLabels` | Array | Labels for fields derived without direct source evidence. |

`agentRole` is a request label that changes section emphasis but must not change data sources, persistence, permissions, or safety boundaries. For example, `verification` may sort verification expectations first, while `implementation` may sort requirements/tasks first.

### Add a local read-only retrieval surface

The first endpoint should be `GET /api/agent-preflight-packet`.

Allowed query parameters:

| Parameter | Type | Default | Behavior |
|---|---|---|---|
| `projectId` | Saved tracked-project id | Required | Selects one configured tracked project. |
| `changeId` | OpenSpec change id | Omitted / `null` | Includes active change context when the change exists locally. |
| `agentRole` | `"implementation"`, `"reviewer"`, `"verification"`, or `"handoff"` | `"implementation"` | Metadata and sorting hint only. |

Rejected inputs:

- Arbitrary paths such as `path`, `projectPath`, `workspacePath`, `rootPath`, `scanPath`, `file`, `files`, `glob`, `include`, and `exclude`.
- Request body input.
- Any command, action, commit, task/calendar, notification, remote provider, auth, model, or agent-control parameter.

Unknown query parameters should return `400` with a clear error listing allowed parameters. This keeps accidental path-based integrations visible.

HTTP behavior:

| Condition | Status | Response |
|---|---|---|
| Generated scan data exists, project id is tracked, and parameters are valid | `200` | `agent-preflight-packet` JSON. |
| `projectId` is missing | `400` | Structured error stating `projectId` is required. |
| `projectId` is unknown or disabled | `404` | Structured error with a stable project-not-found code. |
| Generated scan data is missing or invalid | `404` | Structured error with `missing-generated-scan-data`; no fallback scan from request data. |
| `changeId` is present but no matching local change exists | `200` | Packet includes an `unknown-change` safe state and no fabricated requirements. |
| Optional docs/signals are missing | `200` | Packet includes non-blocking safe states and uses available inputs. |
| Unknown, repeated scalar, or rejected query parameter is present | `400` | Structured validation error. |

### Separate packet semantics from human brief semantics

The packet should not return `kind: "project-brief-report"`, `mode: "daily"`, `mode: "weekly"`, `recommendedHumanDecision`, or `noAttentionMessage`. Conversely, the human brief should not acquire `agentRole`, `requiredReading`, `acceptanceMap`, or `verificationPlan` fields as part of this change.

Shared helpers for evidence normalization, safe-state objects, or OpenSpec metadata parsing are acceptable if they stay consumer-neutral. Shared output contracts are not acceptable in the first slice.

### Treat OpenSpec and docs as references, not replacements

The packet may include references to accepted specs, proposed change deltas, tasks, phase plans, current audit entries, and checklist items. It must not copy full artifacts as a replacement for the agent reading them, and it must label proposed changes as proposed rather than accepted.

Recommended `acceptanceMap` item fields:

| Field | Type | Meaning |
|---|---|---|
| `source` | `"accepted-spec"`, `"proposed-change"`, `"phase-plan"`, or `"checklist"` | Where the expectation comes from. |
| `id` | String | Requirement, scenario, task, or checklist identifier where available. |
| `title` | String | Short label. |
| `status` | `"accepted"`, `"proposed"`, `"planned"`, or `"advisory"` | Prevents proposed work from being mistaken for accepted behavior. |
| `evidenceTarget` | String | Suggested test/check/manual evidence to produce. |

## Risks / Trade-offs

- Packet output could look like permission to act -> Mitigation: machine-readable `workBoundaries`, no-action language, and no commands executed by retrieval.
- Packet could duplicate source docs -> Mitigation: include references, compact summaries, and required reading rather than full source text.
- Missing OpenSpec or phase docs could produce a thin packet -> Mitigation: return safe states and available AI context instead of fabricating requirements.
- Agent and human workflows could drift apart -> Mitigation: separate `kind`, endpoint, schema, and fields; use shared helpers only for neutral evidence handling.
- A JSON-first slice is less friendly for direct human reading -> Mitigation: this artifact targets agents first; human-facing UI or Markdown can be a later change.
