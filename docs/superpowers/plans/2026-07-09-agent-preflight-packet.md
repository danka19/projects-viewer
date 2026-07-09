# Agent Preflight Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `agent-preflight-packet` OpenSpec change as a local, read-only JSON packet that prepares AI agents for implementation, review, verification, and handoff work.

**Architecture:** Add a shared TypeScript contract in `src/types.ts`, a pure server composition module in `server/agent-preflight-packet.mjs`, and a dedicated local endpoint in `server.mjs`. Keep packet output separate from `project-brief-report`: shared evidence normalization is allowed, but report cadence fields and human decision fields must not enter the packet contract.

**Tech Stack:** Node.js ESM, Express 5, TypeScript contract types, `node:test`, OpenSpec CLI.

## Global Constraints

- The packet uses only saved local project config, generated scan data, accepted AI context, AI findings review state, local OpenSpec artifacts, and local project documentation signals.
- Scanned project paths are read-only inputs; no packet code may modify, move, delete, format, or create files inside scanned project folders.
- The API accepts only `projectId`, optional `changeId`, and optional `agentRole`.
- `agentRole` is one of `implementation`, `reviewer`, `verification`, or `handoff`; it is a metadata and sorting hint only.
- The endpoint must reject arbitrary paths, selectors, commands, actions, commits, task/calendar parameters, notification parameters, remote provider parameters, auth/model parameters, and agent-control parameters.
- Packet retrieval must not run commands, create commits, create tasks/calendar records, call remote services, write AI context snapshots, update findings review state, write report history, trigger scans, or start agent work.
- Unknown `changeId` is non-blocking and must produce an `unknown-change` safe state without fabricated requirements.
- Missing generated scan data blocks packet generation with `missing-generated-scan-data`.
- Optional missing findings, audit, phase, checklist, or OpenSpec signals degrade through safe states.
- Proposed OpenSpec change items must be labeled `proposed`, never `accepted`.

---

## File Structure

- Modify `src/types.ts`: add `AgentPreflightPacket` types after project brief/report types and before config types.
- Create `server/agent-preflight-packet.mjs`: pure packet composer over prepared inputs; no Express, no direct filesystem writes, no scanner, no watcher, no findings/state mutation.
- Modify `server.mjs`: import the composer, add query parsing, read optional local docs/OpenSpec artifacts, read findings store without generation, and expose `GET /api/agent-preflight-packet`.
- Create `tests/agent-preflight-packet.test.mjs`: pure composition tests plus API validation and side-effect tests.
- Create `tests/agent-preflight-packet-types.ts`: type-level contract sample included by `npm run build`.
- Modify `README.md` and `docs/README.md`: document endpoint, parameters, packet boundaries, and relationship to AI context, AI findings, and project brief reports.
- Modify `docs/00_FILE_STRUCTURE.md`: add the new module and tests.
- Modify `docs/CONTEXT.md`: keep the current proposed term until implementation is ready for acceptance; then update wording from proposed to implemented/proposed-for-acceptance.
- Modify `docs/CURRENT_PROJECT_AUDIT.md`: record implementation evidence, remaining risks, and readiness for human acceptance.
- Modify `openspec/changes/agent-preflight-packet/tasks.md`: mark tasks complete only after implementation and verification evidence exists.

## Task 1: Shared Packet Contract

**Files:**
- Modify: `src/types.ts`
- Create: `tests/agent-preflight-packet-types.ts`

**Interfaces:**
- Produces: `AgentPreflightPacket`, `AgentPreflightAgentRole`, `AgentPreflightSafeStateCode`, `AgentPreflightAcceptanceSource`, `AgentPreflightAcceptanceStatus`, `AgentPreflightAttentionSignalKind`, `AgentPreflightVerificationExpectation`, and related object interfaces.
- Consumes: existing `AiEvidenceItem`, `ProjectStatus`, `AiFindingType`, `Confidence`, and tracked project config concepts from `src/types.ts`.

- [ ] Step 1. Add a failing type contract sample in `tests/agent-preflight-packet-types.ts`.

```ts
import type { AgentPreflightAgentRole, AgentPreflightPacket } from '../src/types';

const role: AgentPreflightAgentRole = 'implementation';

export const packetContractSample: AgentPreflightPacket = {
  kind: 'agent-preflight-packet',
  schemaVersion: 1,
  generatedAt: '2026-07-09T00:00:00.000Z',
  project: {
    id: 'sample',
    name: 'Sample',
    path: 'C:/projects/sample',
    enabled: true,
    generatedScanName: 'Sample',
  },
  agentRole: role,
  change: {
    id: 'agent-preflight-packet',
    status: 'proposed',
    requirementCount: 1,
    scenarioCount: 1,
    taskCount: 1,
    openTaskCount: 1,
    artifacts: ['openspec/changes/agent-preflight-packet/proposal.md'],
  },
  generatedFrom: {
    projectConfig: 'app-data/projects.config.json',
    scanData: 'app-data/projects.generated.json',
    aiContext: 'derived',
    aiFindings: 'app-data/ai.findings.generated.json',
    openspec: 'local-artifacts',
    projectDocs: 'local-docs',
    remoteServicesUsed: false,
  },
  inputState: {
    generatedScanAvailable: true,
    trackedProjectAvailable: true,
    projectEnabled: true,
    aiContextAvailable: true,
    findingsAvailable: true,
    openspecAvailable: true,
    phaseDocsAvailable: true,
    auditDocsAvailable: true,
    checklistDocsAvailable: true,
  },
  safeStates: [],
  requiredReading: [
    {
      order: 1,
      kind: 'project-rule',
      title: 'Agent operating guide',
      path: 'AGENTS.md',
      status: 'available',
      reason: 'Canonical project instructions.',
      evidence: [{ kind: 'source', file: 'AGENTS.md', line: 1, text: 'Agent Operating Guide' }],
    },
  ],
  projectState: {
    status: 'active',
    healthScore: 80,
    currentPhase: null,
    nextAction: 'Implement agent preflight packet.',
    mainBlocker: null,
    mainRisk: 'Packet must stay separate from human brief reports.',
    recentDecision: null,
  },
  acceptanceMap: [
    {
      source: 'proposed-change',
      id: 'agent-preflight-packet:Packet identifies its own kind',
      title: 'Packet identifies its own kind',
      status: 'proposed',
      evidenceTarget: 'tests/agent-preflight-packet.test.mjs verifies kind and absent brief fields.',
      evidence: [{ kind: 'source', file: 'openspec/changes/agent-preflight-packet/specs/agent-preflight-packet/spec.md' }],
    },
  ],
  attentionSignals: [
    {
      kind: 'risk',
      severity: 'medium',
      title: 'Separate contract risk',
      source: 'proposed-change',
      status: 'advisory',
      evidence: [{ kind: 'derived-summary', text: 'Packet could drift into brief semantics.' }],
    },
  ],
  verificationPlan: [
    {
      kind: 'command',
      command: 'npm test -- tests/agent-preflight-packet.test.mjs',
      reason: 'Verify packet composition and API behavior.',
      expectedEvidence: 'All agent preflight packet tests pass.',
      advisoryOnly: true,
    },
  ],
  workBoundaries: {
    localOnly: true,
    derivedFromGeneratedScan: true,
    scannedProjectsReadOnly: true,
    noModelProviderRequired: true,
    reviewRequiredFindingsOnly: true,
    noAutomaticAction: true,
    noCommandsExecuted: true,
    noCommitsCreated: true,
    noTaskOrCalendarWrites: true,
    noRemoteCalls: true,
    proposedChangesAreNotAccepted: true,
  },
  evidence: [{ kind: 'derived-summary', text: 'Sample packet.' }],
  derivedLabels: [{ field: 'projectState.status', reason: 'derived-status', evidenceKind: 'derived-summary' }],
};
```

- [ ] Step 2. Run `npm run build` and confirm it fails because `AgentPreflightPacket` is not exported.

Expected: TypeScript error like `Module "../src/types" has no exported member`.

- [ ] Step 3. Add minimal exported types in `src/types.ts` matching the sample. Use string literal unions for all spec-defined roles, sources, statuses, safe states, and boundaries.

- [ ] Step 4. Run `npm run build`.

Expected: build exits 0.

- [ ] Step 5. Mark OpenSpec task 1.1 complete only after the build passes.

## Task 2: Pure Composition Module Core

**Files:**
- Create: `server/agent-preflight-packet.mjs`
- Create/modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Consumes: `buildAgentPreflightPacket({ scanOutput, config, projectId, agentRole, changeId, aiContext, findings, openspecState, phaseSignals, auditSignals, checklistSignals, now })`.
- Produces: packet object with `kind: 'agent-preflight-packet'` or throws domain errors with stable `code` and `statusCode`.

- [ ] Step 1. Add fixture helpers in `tests/agent-preflight-packet.test.mjs`: `minimalProject`, `scanWith`, `configFor`, `signal`, and `changeState`. Mirror the style of `tests/project-brief-report.test.mjs`.

- [ ] Step 2. Write a failing test named `buildAgentPreflightPacket returns agent packet shape, role, project identity, source list, and work boundaries`.

Assertions:
- `packet.kind === 'agent-preflight-packet'`
- `packet.schemaVersion === 1`
- `packet.agentRole === 'implementation'`
- `packet.project.id === 'project-1'`
- `packet.generatedFrom.remoteServicesUsed === false`
- all `workBoundaries` no-action flags are `true`
- packet does not have `mode`, `recommendedHumanDecision`, or `noAttentionMessage`

- [ ] Step 3. Run `npm test -- tests/agent-preflight-packet.test.mjs`.

Expected: FAIL because the module does not exist.

- [ ] Step 4. Implement `server/agent-preflight-packet.mjs` with exported `buildAgentPreflightPacket`.

Implementation rules:
- Validate scan output shape up front; throw `{ code: 'missing-generated-scan-data', statusCode: 404 }` for missing/invalid scan.
- Find the requested config project by `id`.
- Reject missing, unknown, or disabled project ids with stable domain errors.
- Match generated project by normalized saved config path.
- Return packet metadata, generated source names, input state, project state, evidence, derived labels, and work boundaries.
- Do not import `node:fs`, `express`, `runScan`, `generateFindings`, `writeAiContextSnapshot`, or `updateFindingReviewState`.

- [ ] Step 5. Re-run `npm test -- tests/agent-preflight-packet.test.mjs`.

Expected: the core shape test passes.

- [ ] Step 6. Add and pass a purity test that reads `server/agent-preflight-packet.mjs` and asserts forbidden imports/calls are absent.

- [ ] Step 7. Mark OpenSpec tasks 1.2 and the relevant part of 3.1 complete only after tests pass.

## Task 3: Required Reading and Safe Optional Inputs

**Files:**
- Modify: `server/agent-preflight-packet.mjs`
- Modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Consumes: `openspecState.artifacts`, `phaseSignals.requiredReading`, `auditSignals.requiredReading`, `checklistSignals.requiredReading`.
- Produces: ordered `requiredReading[]` with `order`, `kind`, `title`, `path`, `status`, `reason`, and `evidence`.

- [ ] Step 1. Add a failing test named `buildAgentPreflightPacket composes ordered required reading and non-blocking safe states`.

Minimum expected reading order:
1. `AGENTS.md`
2. `docs/README.md`
3. `docs/00_FILE_STRUCTURE.md`
4. `docs/ROADMAP.md`
5. relevant phase docs if provided
6. active OpenSpec proposal/design/spec/tasks if provided
7. `docs/CURRENT_PROJECT_AUDIT.md`
8. `docs/AI_STEP_VERIFICATION_CHECKLIST.md`

Expected safe states:
- missing findings input -> `missing-findings-store`
- missing phase signals -> `missing-phase-signals`
- missing audit signals -> `missing-audit-signals`
- missing checklist signals -> `missing-checklist-signals`

- [ ] Step 2. Run `npm test -- tests/agent-preflight-packet.test.mjs`.

Expected: FAIL on missing required reading/safe states.

- [ ] Step 3. Implement `buildRequiredReading()` and `buildSafeStates()` in the pure module. Use compact references only; do not copy full markdown content.

- [ ] Step 4. Re-run the focused test.

Expected: PASS.

- [ ] Step 5. Mark OpenSpec tasks 1.3 and the safe optional-input part of 1.6 complete.

## Task 4: Acceptance Map, Attention Signals, and Verification Plan

**Files:**
- Modify: `server/agent-preflight-packet.mjs`
- Modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Consumes: `openspecState.acceptedSpecs`, `openspecState.change`, `openspecState.tasks`, `phaseSignals.expectations`, `checklistSignals.expectations`, project signals, findings.
- Produces: `acceptanceMap[]`, `attentionSignals[]`, and `verificationPlan[]`.

- [ ] Step 1. Add a failing test named `buildAgentPreflightPacket labels proposed change requirements and tasks without treating them as accepted`.

Assertions:
- proposed change requirements use `source: 'proposed-change'`
- proposed change items use `status: 'proposed'`
- accepted specs, when supplied, use `source: 'accepted-spec'` and `status: 'accepted'`
- task references include evidence targets but not full task bodies

- [ ] Step 2. Add a failing test named `buildAgentPreflightPacket ranks attention and verification first for verification role`.

Assertions:
- blocker, approval gate, unresolved finding, stale docs, missing verification, risk, and documentation gap signals are present when supplied.
- `agentRole: 'verification'` keeps the same data sources and work boundaries but orders verification expectations before implementation task expectations.

- [ ] Step 3. Run focused tests and confirm failure.

- [ ] Step 4. Implement helpers:
- `buildAcceptanceMap({ openspecState, phaseSignals, checklistSignals })`
- `buildAttentionSignals({ project, findings, auditSignals, checklistSignals })`
- `buildVerificationPlan({ openspecState, phaseSignals, checklistSignals, agentRole })`

- [ ] Step 5. Re-run `npm test -- tests/agent-preflight-packet.test.mjs`.

Expected: PASS.

- [ ] Step 6. Mark OpenSpec tasks 1.4, 1.5, and the remaining part of 3.1 complete.

## Task 5: Unknown Change and Blocking Safe States

**Files:**
- Modify: `server/agent-preflight-packet.mjs`
- Modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Consumes: `changeId` and optional `openspecState`.
- Produces: safe states for `unknown-change` and domain errors for missing scan/project states.

- [ ] Step 1. Add failing tests for:
- missing generated scan data throws `missing-generated-scan-data` with `statusCode: 404`
- missing `projectId` throws `missing-project-id` with `statusCode: 400`
- unknown config project throws `project-not-found` with `statusCode: 404`
- disabled config project throws `project-not-found` with `statusCode: 404`
- generated scan missing the saved project path throws `project-not-found` with `statusCode: 404`
- unknown `changeId` returns a packet with safe state `unknown-change`

- [ ] Step 2. Implement stable domain error helpers.

- [ ] Step 3. Run focused tests.

Expected: PASS.

- [ ] Step 4. Mark OpenSpec tasks 1.6 and the pure-module safe-state coverage in 3.1 complete.

## Task 6: Local API Endpoint

**Files:**
- Modify: `server.mjs`
- Modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Adds: `GET /api/agent-preflight-packet?projectId=<saved-id>&changeId=<optional>&agentRole=<optional>`.
- Consumes: existing `readGeneratedScan()`, `readProjectConfig()`, `readFindingsStore()`, and new local doc/OpenSpec metadata readers.

- [ ] Step 1. Write a failing API test named `agent preflight packet API returns valid packet for saved project without unauthorized side effects`.

Fixture:
- temp `app-data/projects.config.json`
- temp `app-data/projects.generated.json`
- temp `app-data/ai.findings.generated.json`
- sentinel file inside the tracked scanned project folder

Assertions:
- response status `200`
- response `kind === 'agent-preflight-packet'`
- response `project.id === 'project-1'`
- response has no `mode`, `recommendedHumanDecision`, or `noAttentionMessage`
- findings store content is unchanged
- no `ai.context.snapshot.json`
- no `report-history.json`
- sentinel file is unchanged

- [ ] Step 2. Implement endpoint import and route in `server.mjs`.

Route behavior:
- parse and validate query before reading data
- read generated scan
- read config
- read findings store through a non-generating helper; if absent, pass `null`
- gather local OpenSpec/doc signal metadata from the dashboard repo only
- call `buildAgentPreflightPacket`
- serialize domain errors with stable `code`

- [ ] Step 3. Run focused API test.

Expected: PASS.

- [ ] Step 4. Mark OpenSpec tasks 2.1, 2.3, and part of 3.4 complete.

## Task 7: API Query Validation and Error States

**Files:**
- Modify: `server.mjs`
- Modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Adds: `parseAgentPreflightPacketQuery(req)` inside `createApp()`.

- [ ] Step 1. Add a failing API test named `agent preflight packet API rejects unsafe or invalid query parameters`.

Queries that must return `400`:
- empty query
- `agentRole=builder`
- repeated `projectId`
- repeated `changeId`
- repeated `agentRole`
- `path=C:/projects/example`
- `projectPath=C:/projects/example`
- `workspacePath=C:/projects`
- `rootPath=C:/projects`
- `scanPath=C:/projects`
- `file=README.md`
- `files=README.md`
- `glob=**/*.md`
- `include=docs`
- `exclude=node_modules`
- `command=npm test`
- `action=commit`
- `commit=true`
- `task=follow-up`
- `calendar=slot`
- `notification=send`
- `remoteProvider=openai`
- `auth=token`
- `model=gpt`
- `agent=run`
- `unknown=value`

- [ ] Step 2. Add API tests for:
- unknown project id -> `404` and `project-not-found`
- disabled project id -> `404` and `project-not-found`
- missing generated scan data -> `404` and `missing-generated-scan-data`
- corrupt generated scan JSON -> `404` and `missing-generated-scan-data`
- unknown local `changeId` -> `200` with safe state `unknown-change`

- [ ] Step 3. Implement strict query parsing:
- allowed keys are exactly `projectId`, `changeId`, `agentRole`
- scalar keys may appear at most once
- `projectId` is required and non-empty
- `agentRole` defaults to `implementation`
- unsupported keys return an error listing allowed parameters

- [ ] Step 4. Run focused API tests.

Expected: PASS.

- [ ] Step 5. Mark OpenSpec tasks 2.2, 2.4, 3.3, and the remaining API part of 3.4 complete.

## Task 8: Contract Separation Regression Tests

**Files:**
- Modify: `tests/agent-preflight-packet.test.mjs`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Consumes: `buildAgentPreflightPacket` and `buildProjectBriefReport`.
- Produces: regression evidence that packet and report contracts stay separate.

- [ ] Step 1. Add a test named `agent preflight packet stays separate from project brief report output`.

Assertions:
- packet `kind` is `agent-preflight-packet`
- report `kind` is `project-brief-report`
- packet has `agentRole`, `requiredReading`, `acceptanceMap`, `verificationPlan`
- report has `mode`, `recommendedHumanDecision`, `noAttentionMessage`
- packet does not have report-only fields
- report does not have packet-only fields at top level

- [ ] Step 2. Run `npm test -- tests/agent-preflight-packet.test.mjs`.

Expected: PASS.

- [ ] Step 3. Mark OpenSpec task 3.2 complete.

## Task 9: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/00_FILE_STRUCTURE.md`
- Modify: `docs/CONTEXT.md`
- Modify: `docs/CURRENT_PROJECT_AUDIT.md`
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`

**Interfaces:**
- Produces: durable docs matching implemented behavior and verification evidence.

- [ ] Step 1. Update `README.md` and `docs/README.md` with:
- endpoint `GET /api/agent-preflight-packet`
- required `projectId`
- optional `changeId`
- optional `agentRole`
- local-only/read-only/no-action boundaries
- difference from AI context, AI findings, and project brief report

- [ ] Step 2. Update `docs/00_FILE_STRUCTURE.md` with:
- `server/agent-preflight-packet.mjs`
- `tests/agent-preflight-packet.test.mjs`
- `tests/agent-preflight-packet-types.ts`

- [ ] Step 3. Update `docs/CONTEXT.md` term `Agent preflight packet` from proposed-only wording to implemented/ready-for-acceptance wording.

- [ ] Step 4. Update `docs/CURRENT_PROJECT_AUDIT.md` with:
- implementation evidence
- remaining risks
- whether the OpenSpec change is ready for human acceptance

- [ ] Step 5. Mark OpenSpec tasks 4.1 through 4.4 complete after docs match the code.

## Task 10: Final Verification and Commit

**Files:**
- Modify: `openspec/changes/agent-preflight-packet/tasks.md`
- No implementation files unless verification reveals a fix.

**Interfaces:**
- Produces: final evidence for OpenSpec task 3.5 and project completion report.

- [ ] Step 1. Run focused tests.

Command:

```bash
npm test -- tests/agent-preflight-packet.test.mjs
```

Expected: all agent preflight packet tests pass.

- [ ] Step 2. Run full tests.

Command:

```bash
npm test
```

Expected: all Node tests pass.

- [ ] Step 3. Run build.

Command:

```bash
npm run build
```

Expected: TypeScript and Vite build exit 0.

- [ ] Step 4. Run OpenSpec checks.

Commands:

```bash
openspec list
openspec list --specs
openspec validate --all --strict
```

Expected: active changes/specs list successfully and strict validation exits 0.

- [ ] Step 5. Run whitespace check.

Command:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] Step 6. Mark OpenSpec task 3.5 complete only after all verification commands pass.

- [ ] Step 7. Commit intentional changes.

```bash
git add src/types.ts server.mjs server/agent-preflight-packet.mjs tests/agent-preflight-packet.test.mjs tests/agent-preflight-packet-types.ts README.md docs/README.md docs/00_FILE_STRUCTURE.md docs/CONTEXT.md docs/CURRENT_PROJECT_AUDIT.md openspec/changes/agent-preflight-packet/tasks.md
git commit -m "feat: add agent preflight packet"
```

## Self-Review

- Spec coverage: tasks cover all OpenSpec tasks 1.1 through 4.4, including distinct contract, safe local inputs, required reading, acceptance map, attention signals, safe states, endpoint validation, no-action side effects, docs, and final verification.
- Placeholder scan: no banned placeholder phrases from the planning skill remain in this plan.
- Type consistency: plan uses `AgentPreflightPacket`, `AgentPreflightAgentRole`, `buildAgentPreflightPacket`, `requiredReading`, `acceptanceMap`, `attentionSignals`, `verificationPlan`, `safeStates`, and `workBoundaries` consistently across tasks.

## Recommended Execution

Use subagent-driven development for Tasks 1 through 8 because the contract, pure composer, API validation, and separation tests are independently reviewable. Keep Tasks 9 and 10 local or reviewer-gated, because documentation updates and final verification need one coherent final pass over repository state.
