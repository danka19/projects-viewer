## 1. Contract And Composition

- [x] 1.1 Define shared agent preflight packet types for metadata, project identity, agent role, change context, generated sources, input state, safe states, required reading, acceptance mapping, attention signals, verification expectations, evidence, derived labels, and work boundaries.
- [x] 1.2 Add a focused pure server composition module for `agent-preflight-packet` that accepts prepared local inputs and does not read arbitrary request paths.
- [ ] 1.3 Compose required-reading references from project rules, documentation map, relevant phase docs, OpenSpec artifacts, audit docs, and verification checklist signals where available.
- [ ] 1.4 Compose acceptance mapping from accepted specs, proposed change deltas, change tasks, phase-plan expectations, and checklist evidence targets without treating proposed changes as accepted behavior.
- [ ] 1.5 Compose attention signals from current project state, blockers, gates, unresolved findings, stale docs, missing verification, risk signals, and documentation gaps.
- [ ] 1.6 Implement safe states for missing generated scan data, missing optional findings/audit/phase/checklist signals, and unknown change ids.

## 2. Local Retrieval Surface

- [ ] 2.1 Add local read-only `GET /api/agent-preflight-packet`.
- [ ] 2.2 Validate that the endpoint requires a saved `projectId`, accepts only optional `changeId` and `agentRole`, rejects unknown or repeated scalar parameters, and never accepts arbitrary paths or selectors.
- [ ] 2.3 Ensure packet retrieval reads generated scan data, saved config, existing AI context/findings state, OpenSpec metadata, and local project docs without writing snapshots, findings review state, report history, scanned project files, tasks/calendar records, commits, shell commands, remote calls, or agent work.
- [ ] 2.4 Return structured errors or safe states for missing generated scan data, unknown project ids, disabled projects, unknown change ids, and missing optional docs/signals.

## 3. Verification

- [ ] 3.1 Add pure composition tests for packet shape, `kind: "agent-preflight-packet"`, agent roles, required reading, project state, acceptance mapping, attention signals, verification expectations, evidence, derived labels, and work boundaries.
  - Task 2 core coverage completed: packet shape, agent role, project identity, missing/invalid generated scan handling, disabled/unknown project handling, normalized config-path matching, and purity guards are now covered in `tests/agent-preflight-packet.test.mjs`.
- [ ] 3.2 Add tests proving packet generation stays separate from `project-brief-report` output and does not include daily/weekly human brief fields.
- [ ] 3.3 Add API tests for valid packet retrieval, missing `projectId`, unknown or disabled projects, unknown change ids, invalid `agentRole`, repeated scalar parameters, unknown parameters, path-like parameters, and missing generated scan data.
- [ ] 3.4 Add negative side-effect tests proving retrieval does not write AI context snapshots, findings stores, report history, scanned project files, task/calendar records, commits, shell commands, remote calls, or agent work.
- [ ] 3.5 Run focused tests, `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.

## 4. Documentation And Follow-Through

- [ ] 4.1 Update README/docs to describe the agent preflight packet behavior, endpoint, safe query parameters, output boundaries, and relationship to AI context, AI findings, and human project brief reports.
- [ ] 4.2 Update `docs/00_FILE_STRUCTURE.md` if new modules, tests, or docs are added.
- [ ] 4.3 Update `docs/CONTEXT.md` with the accepted packet terminology once implementation is ready for acceptance.
- [ ] 4.4 Update `docs/CURRENT_PROJECT_AUDIT.md` and relevant phase/roadmap docs with implementation evidence, remaining risks, and whether the change is ready for human acceptance.
