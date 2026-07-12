# Agents Usage

This document is the project-local runbook for Codex and other agents working with Projects Viewer.
Keep it current whenever agent workflow, local API usage, MCP configuration, verification commands, or safety boundaries change.

## Purpose

Projects Viewer is a local-only, read-only dashboard over configured project documentation. Agents should use this project as a source of structured local context, not as an action runner.

The preferred context source is the agent preflight packet API, after discovering a saved project id from the compact configured-project list:

```text
GET /api/agent-preflight-packet?projectId=<id>&changeId=<change-id>&agentRole=<role>
```

The packet gives an agent required reading, project state, acceptance mapping, attention signals, verification expectations, and work boundaries from saved local data.

## Start The Local API

Run the dashboard server from the repository root:

```powershell
npm run dev
```

Default URL:

```text
http://127.0.0.1:5173
```

Production-like local mode:

```powershell
npm run build
npm run server
```

One-shot scan:

```powershell
npm run scan
```

## Get Project Context

Project ids come from saved Projects Viewer config, not from inferred project names or legacy config files. The only runtime tracked-project config source is `app-data/projects.config.json`; root `projects.config.json` is ignored. Prefer the compact configured-project list before requesting an agent preflight packet.

List compact configured project ids from the local API:

```powershell
Invoke-RestMethod "http://127.0.0.1:5173/api/configured-projects"
```

List currently scanned dashboard projects:

```powershell
Invoke-RestMethod "http://127.0.0.1:5173/api/projects"
```

Fetch an agent preflight packet for implementation work:

```powershell
Invoke-RestMethod "http://127.0.0.1:5173/api/agent-preflight-packet?projectId=<id>&agentRole=implementation"
```

Fetch a packet for a specific OpenSpec change:

```powershell
Invoke-RestMethod "http://127.0.0.1:5173/api/agent-preflight-packet?projectId=<id>&changeId=<change-id>&agentRole=reviewer"
```

Supported `agentRole` values:

- `implementation`
- `reviewer`
- `verification`
- `handoff`

If the local API is unavailable, use the project documentation and OpenSpec fallback:

1. Read `AGENTS.md`.
2. Read `docs/README.md`, `docs/00_FILE_STRUCTURE.md`, and `docs/ROADMAP.md`.
3. Read relevant `docs/phases/PHASE_*.md`.
4. Read relevant `openspec/changes/<change-id>/` artifacts.
5. Read `docs/CURRENT_PROJECT_AUDIT.md` and `docs/AI_STEP_VERIFICATION_CHECKLIST.md`.
6. State in the user-facing report that the API packet was unavailable and list the fallback evidence used.

## Read-Only MCP Adapter

This repository includes a project-scoped Codex MCP configuration at `.codex/config.toml`.

The MCP server is:

```text
server/projects-viewer-mcp.mjs
```

It exposes only read-only context tools:

- `list_projects`
- `list_configured_projects`
- `get_agent_preflight_packet`
- `get_project_brief_report`
- `get_ai_context`
- `get_ai_findings`

Preferred MCP preflight flow:

1. Call `list_configured_projects` to get saved `projectId` values from the compact config-focused payload.
2. Call `get_agent_preflight_packet` with one of those ids.
3. Use `list_projects` only when you need the fuller dashboard scan payload from `/api/projects`.

The adapter calls the local Projects Viewer HTTP API. By default it uses:

```text
http://127.0.0.1:5173
```

Override for tests or alternate local ports:

```powershell
$env:PROJECTS_VIEWER_API_BASE_URL = "http://127.0.0.1:<port>"
```

The MCP adapter does not start the dashboard server. If a tool returns an API unavailable error, start `npm run dev` and retry.

MCP tools reject non-JSON responses, malformed JSON, wrong response shapes, and `get_agent_preflight_packet` responses whose `kind` is not `agent-preflight-packet`. Errors include response evidence such as status, content type, API path, and a short body preview so stale-server or routing failures do not masquerade as valid context.

## Safety Boundaries

Agents must not use Projects Viewer APIs or MCP tools to:

- provide arbitrary filesystem paths for scan/read operations;
- run shell commands;
- create commits;
- create or update tasks;
- create or update calendar events;
- call remote model providers;
- pass auth tokens or API keys;
- start agent work automatically;
- modify scanned project folders.

Scanned projects are read-only inputs. `app-data/projects.config.json` is the only source of tracked project paths.

The root `projects.config.json` is not a runtime source, fallback, or migration input. A fresh setup contains no default tracked projects; empty config/no projects scan is valid and should not crash. The versioned `projects.config.example.json` file is an empty schema reference only.

## Diagnostics

For ordinary JSON API calls, prefer `Invoke-RestMethod`:

```powershell
Invoke-RestMethod "http://127.0.0.1:5173/api/projects"
```

For response status, headers, content type, or suspicious non-JSON bodies, prefer `curl.exe`:

```powershell
curl.exe -i --max-time 10 "http://127.0.0.1:5173/api/agent-preflight-packet?projectId=<id>&agentRole=implementation"
```

If PowerShell web cmdlets return a low-value error such as `Object reference not set to an instance of an object.`, retry the same read-only local URL with `curl.exe -i --max-time 10` and report the status, `Content-Type`, and first body lines.

## Verification Commands

For code, contract, API, MCP, or documentation workflow changes, run the narrowest focused check first, then the broader checks:

```powershell
npm test -- tests/projects-viewer-mcp.test.mjs
npm test -- tests/agent-preflight-packet.test.mjs
npm test -- tests/project-config.test.mjs tests/run-scan.test.mjs tests/spec-work-scan.test.mjs
npx vitest run tests/components/spec-model.test.tsx tests/components/spec-geometry.test.tsx tests/components/specs-canvas.test.tsx
npm test
npm run build
openspec list
openspec list --specs
openspec validate --all --strict
git diff --check
```

For primary-work/Specs Canvas changes, also inspect dark and light at 1280×720, 1024×768, and 390×844. Verify view fallback/persistence, card expansion, explicit dependency text and geometry, Fit all/Center active, keyboard navigation, drawer focus return, mobile vertical layout, zero page-level horizontal overflow, and an empty console.

Saved `defaultView` and `documentationViews.<roadmap|specs>.roots` are optional tracked-project config. Roots must be project-relative directories validated by `PATCH /api/projects/:id`; never pass ad hoc roots to scan/rescan APIs or MCP tools.

If a command cannot run, record the exact command, blocker, and remaining risk in the final report.

## Maintenance Rule

Update this file whenever any of these change:

- local startup commands;
- API endpoint names, parameters, or safety behavior;
- agent preflight packet workflow;
- MCP server path, tools, config, or transport;
- verification commands;
- agent safety boundaries.
