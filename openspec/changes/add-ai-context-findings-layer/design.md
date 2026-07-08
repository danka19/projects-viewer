## Context

Projects Viewer is a local-only, read-only dashboard over documentation in configured local projects. The scanner already generates `ScanOutput` with project summaries, status reasons, work constraints, risks, decisions, specs, audits, documentation gaps, file inventories, and source evidence.

The proposed AI layer should not introduce a second source of project truth. It should expose compact context derived from existing scan output and optionally store review-required findings as dashboard runtime data. Scanned project folders remain read-only inputs; writes stay inside this repository's `app-data/` folder.

The main stakeholders are:

- the human owner, who needs understandable project triage and review gates;
- local AI agents, which need a compact preflight context before reading or changing a project;
- future reviewer/checker subagents, which need evidence-linked signals rather than raw full-document dumps.

## Goals / Non-Goals

**Goals:**

- Provide stable local AI context contracts over enabled tracked projects.
- Keep AI context compact, evidence-preserving, and derived from the current generated scan output.
- Support project-level and all-project AI preflight views.
- Support a changes-since view for project-state monitoring.
- Define a local AI findings model with review state and source evidence.
- Preserve the boundary between raw documentation, derived dashboard interpretation, AI proposals, and accepted human decisions.

**Non-Goals:**

- No remote LLM calls, cloud sync, external API keys, or model-provider integration.
- No agent control, arbitrary shell commands, or automatic implementation actions.
- No write-back to scanned project files.
- No whole-disk scanning or arbitrary browser-provided scan paths.
- No claim that AI findings are accepted decisions or verified requirements.
- No requirement to build the final UI in the first implementation if API and contract verification are enough for the first slice.

## Decisions

### Derive AI context from generated scan output

The AI context layer will read the same generated project scan data used by the dashboard, not rescan arbitrary paths and not parse project files independently through request parameters.

Rationale: this preserves the existing saved-config scan boundary and avoids a second, inconsistent scanner path.

Alternatives considered:

- Direct file reading from AI endpoints: rejected because browser/API requests must not provide arbitrary paths and because it would duplicate scan rules.
- Embedding full raw markdown in AI context: rejected because it is too large and weakens the evidence-preserving summary model.

### Use compact context views instead of full ProjectData dumps by default

Default AI context responses will include only the fields useful for agent preflight: project identity, status, status reason, health score, current phase, next action, main blocker, main risk, recent decision, gaps, selected constraints, selected risks, selected decisions, selected specs, selected audits, and source references.

Rationale: agents need a reliable map first, not every heading and doc inventory row.

Alternatives considered:

- Return `ProjectData` unchanged: useful for debugging, but noisy and expensive for AI consumption.
- Make an LLM-generated summary the only context: rejected because deterministic scan evidence should remain the primary contract.

### Keep findings separate from accepted decisions

AI findings will be stored as derived dashboard runtime records with review state such as `new`, `accepted`, `dismissed`, and `stale`. Accepting a finding accepts it only as a dashboard finding, not as a project decision unless a future explicit workflow writes a reviewed decision elsewhere.

Rationale: project rules already state that LLM or heuristic output is proposal evidence only. Findings must not silently become requirements or roadmap truth.

Alternatives considered:

- Write findings into scanned project docs: rejected because scanned projects are read-only inputs.
- Treat findings as blockers automatically: rejected because AI/heuristic output may be wrong and must be reviewable.

### Store AI runtime data inside app-data

Finding runtime data will live under `app-data/`, for example `app-data/ai.findings.generated.json` or a similarly named local file. It remains ignored local runtime data.

Rationale: this matches existing config/generated-data boundaries and keeps private project observations out of git by default.

Alternatives considered:

- Store findings in `src/data/`: rejected because static fallback artifacts are versioned application assets, not local runtime review state.
- Store findings in scanned project folders: rejected by the read-only scanned project rule.

### Prefer deterministic findings first

The first implementation should support rule-based findings from existing scan signals before optional LLM analysis is considered. Examples include stale audit, unresolved human gate, stale active handoff pointer, missing specs, missing verification evidence, and status contradictions already suspected by the parser.

Rationale: deterministic findings are testable, local, and fit the current project without model-provider choices.

Alternatives considered:

- Add an LLM provider immediately: rejected because provider choice, privacy review, prompt storage, and acceptance workflow need separate design.

## Risks / Trade-offs

- AI context can be too verbose -> Mitigation: define a compact default response and reserve full scan data for existing dashboard/debug paths.
- Findings may look more authoritative than they are -> Mitigation: every finding carries `source`, `confidence`, and `reviewState`, and UI/API labels use review-required language.
- Review-state updates can be mistaken for project writes -> Mitigation: only write inside `app-data/`; never write to tracked project paths.
- Changes-since can miss semantic changes if it compares only timestamps -> Mitigation: compare stable derived fields such as status, status reason, current phase, next action, blockers, risks, gaps, and finding IDs.
- Future LLM integration could weaken privacy boundaries -> Mitigation: keep model-provider integration out of this change and require a separate design decision before any remote or local model provider is added.

## Migration Plan

1. Add type definitions for AI context and findings derived from existing `ScanOutput`.
2. Add local API endpoints that read existing generated scan output and return compact AI context.
3. Add deterministic finding generation and local finding storage under `app-data/`.
4. Add tests for context shape, evidence preservation, no arbitrary path input, no scanned-project writes, and finding review-state persistence if review updates are implemented.
5. Optionally add dashboard display after API contracts are verified.

Rollback is straightforward: remove the new endpoints and ignored runtime findings file. Existing scan output, dashboard behavior, and tracked project config remain valid.

## Open Questions

- Should the first UI slice include a visible findings panel, or should the first implementation stop at API/data contracts plus tests?
- Should accepted/dismissed finding review state be persisted separately from generated findings so regenerated findings can retain human review decisions?
- Should changes-since compare against a caller-provided timestamp only, or also support a persisted last-seen snapshot for the dashboard?
