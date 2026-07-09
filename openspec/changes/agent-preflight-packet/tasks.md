## 1. Contract And Composition

- [x] 1.1 Define shared agent preflight packet types for metadata, project identity, agent role, change context, generated sources, input state, safe states, required reading, acceptance mapping, attention signals, verification expectations, evidence, derived labels, and work boundaries.
- [x] 1.2 Add a focused pure server composition module for `agent-preflight-packet` that accepts prepared local inputs and does not read arbitrary request paths.
- [x] 1.3 Compose required-reading references from project rules, documentation map, relevant phase docs, OpenSpec artifacts, audit docs, and verification checklist signals where available.
- [x] 1.4 Compose acceptance mapping from accepted specs, proposed change deltas, change tasks, phase-plan expectations, and checklist evidence targets without treating proposed changes as accepted behavior.
- [x] 1.5 Compose attention signals from current project state, blockers, gates, unresolved findings, stale docs, missing verification, risk signals, and documentation gaps.
- [x] 1.6 Implement the accepted blocking/safe-state contract: missing generated scan data returns blocking `missing-generated-scan-data` domain error with status `404`, while missing optional findings/audit/phase/checklist inputs and unknown change ids remain non-blocking safe states.
  - [x] Focused pure-module tests cover blocking generated-scan error handling plus safe optional-input and unknown-change states.

## 2. Local Retrieval Surface

- [x] 2.1 Add local read-only `GET /api/agent-preflight-packet`.
- [x] 2.2 Validate that the endpoint requires a saved `projectId`, accepts only optional `changeId` and `agentRole`, rejects unknown or repeated scalar parameters, and never accepts arbitrary paths or selectors.
- [x] 2.3 Ensure packet retrieval reads generated scan data, saved config, existing AI context/findings state, OpenSpec metadata, and local project docs without writing snapshots, findings review state, report history, scanned project files, tasks/calendar records, commits, shell commands, remote calls, or agent work.
- [x] 2.4 Return structured errors or safe states for missing generated scan data, unknown project ids, disabled projects, unknown change ids, and missing optional docs/signals.

## 3. Verification

- [x] 3.1 Add pure composition tests for packet shape, `kind: "agent-preflight-packet"`, agent roles, required reading, project state, acceptance mapping, attention signals, verification expectations, evidence, derived labels, and work boundaries.
  - Task 2 core coverage completed: packet shape, agent role, project identity, missing/invalid generated scan handling, missing `projectId`, disabled/unknown project handling, generated-scan saved-path mismatch handling, normalized config-path matching, unknown `changeId` safe state, no fabricated proposed requirements/tasks for unresolved change ids, and purity guards are now covered in `tests/agent-preflight-packet.test.mjs`.
- [ ] 3.2 Add tests proving packet generation stays separate from `project-brief-report` output and does not include daily/weekly human brief fields.
- [x] 3.3 Add API tests for valid packet retrieval, missing `projectId`, unknown or disabled projects, unknown change ids, invalid `agentRole`, repeated scalar parameters, unknown parameters, path-like parameters, and missing generated scan data.
- [ ] 3.4 Add negative side-effect tests proving retrieval does not write AI context snapshots, findings stores, report history, scanned project files, task/calendar records, commits, shell commands, remote calls, or agent work.
  - [x] Task 6 and Task 7 focused coverage proves the API retrieval path stays read-only for local files already exercised here: the findings store, `ai.context.snapshot.json`, `report-history.json`, a tracked-project sentinel file, plus query validation/error-state handling for safe request parsing.
  - [ ] Full negative side-effect verification for task/calendar records, commits, shell commands, remote calls, and agent work remains for final verification or a later explicit test expansion before 3.4 can be marked complete.
- [ ] 3.5 Run focused tests, `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.

## 4. Documentation And Follow-Through

- [ ] 4.1 Update README/docs to describe the agent preflight packet behavior, endpoint, safe query parameters, output boundaries, and relationship to AI context, AI findings, and human project brief reports.
- [ ] 4.2 Update `docs/00_FILE_STRUCTURE.md` if new modules, tests, or docs are added.
- [ ] 4.3 Update `docs/CONTEXT.md` with the accepted packet terminology once implementation is ready for acceptance.
- [ ] 4.4 Update `docs/CURRENT_PROJECT_AUDIT.md` and relevant phase/roadmap docs with implementation evidence, remaining risks, and whether the change is ready for human acceptance.
