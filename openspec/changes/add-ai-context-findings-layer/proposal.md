## Why

Projects Viewer already turns local project documentation into a structured, evidence-preserving project radar for a human. The same derived scan data can help AI agents understand project state, blockers, stale documentation, review gates, and likely next actions before they read an entire repository or start implementation work.

This change defines a safe AI-facing context and findings layer without giving AI control over scanned projects. The goal is to make Projects Viewer useful as local context infrastructure for AI-assisted project monitoring, triage, and agent preflight while preserving the existing read-only and local-only boundaries.

## What Changes

- Add an AI context contract that exposes compact, evidence-preserving scan summaries for all enabled projects and for a selected project.
- Add a changes-since style context view so an AI assistant can identify meaningful project-state changes between scans without reading the full generated data file.
- Add an AI findings model for review-required insights such as suspected contradictions, missing verification evidence, stale audits, unclear next actions, stale handoff pointers, and unresolved human gates.
- Store AI findings as derived dashboard runtime data under `app-data/`, separate from scanned project files and separate from accepted project decisions.
- Keep all AI output advisory: findings are proposals for review, not accepted decisions, requirements, or project truth.
- Preserve evidence references for every context item and finding, using project-relative file paths and line numbers where available.
- Do not add cloud sync, remote LLM calls, API keys, agent control, arbitrary shell commands, write-back to scanned projects, or whole-disk scanning as part of this change.

## Capabilities

### New Capabilities

- `ai-context`: AI-readable context endpoints and data contracts over existing scan output, including project summaries, work constraints, risks, decisions, gaps, and source evidence.
- `ai-findings`: Reviewable AI/heuristic finding records generated from scan data, stored locally as derived runtime data and clearly separated from accepted decisions.

### Modified Capabilities

- None. No accepted main specs exist yet; this change introduces proposed capabilities only.

## Impact

- Scanner/data contracts: define compact AI context and finding shapes derived from `ScanOutput` and `ProjectData`.
- Server/API: add local-only read endpoints for AI context and findings, plus local-only finding review state updates if implementation includes human review.
- Runtime data: add generated or persisted `app-data/ai.findings.generated.json` or equivalent local file.
- Frontend: optionally expose findings in the dashboard as review-required items after the API/data contract is implemented.
- Safety: maintain local-only operation, saved-config scan boundaries, read-only scanned projects, no arbitrary request paths, and no AI write-back to project documentation.
