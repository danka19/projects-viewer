## Why

Projects Viewer already exposes compact AI context and is planning a daily/weekly human brief, but AI implementation and reviewer agents need a different pre-work artifact: a concise, evidence-linked packet that helps them orient before changing code or docs. Defining this separately prevents the human brief/report contract from accumulating agent-specific fields, checklists, or execution guidance.

## What Changes

- Add a local read-only agent preflight packet capability for AI implementation, reviewer, checker, and handoff workflows.
- Generate the packet from saved local project config, generated scan data, accepted AI context, AI findings review state, OpenSpec change metadata, phase documentation signals, and current project audit/checklist signals where available.
- Keep daily/weekly human brief output separate: the packet may reference the same underlying evidence, but it uses its own `kind`, schema, endpoint or retrieval surface, ranking rules, and acceptance scenarios.
- Include agent-oriented sections for required read order, active change context, relevant acceptance requirements, likely blockers, verification expectations, recent project state, and safety boundaries.
- Preserve existing safety limits: scanned projects remain read-only inputs, output stays advisory, and packet retrieval does not run commands, create commits, trigger agent work, write task/calendar records, call remote model providers, or mutate scanned project folders.

## Capabilities

### New Capabilities

- `agent-preflight-packet`: Local advisory packet for AI agents before planning, implementing, reviewing, or verifying work in a configured project.

### Modified Capabilities

- None. Existing `ai-context`, `ai-findings`, and proposed `project-brief-report` capabilities are reused or referenced as inputs without changing their accepted requirements.

## Impact

- Server/API: add a dedicated packet composition module and local retrieval surface after the design is accepted.
- Data contracts: introduce a packet shape for agent role, target project/change, required reading, requirement mapping, risk and blocker signals, verification expectations, evidence, and no-action guard fields.
- OpenSpec/docs integration: packet composition must distinguish accepted specs from proposed changes and must not treat phase notes, findings, or brief output as source-of-truth behavior.
- Tests: add contract and negative-side-effect tests proving packet generation uses saved local data, preserves evidence, separates human brief behavior, and accepts no arbitrary project paths or action parameters.
- Documentation: update README/docs once implementation exists; keep this proposal as the source of proposed behavior until accepted.
