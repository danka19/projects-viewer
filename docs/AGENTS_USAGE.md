# Agents Usage

This document is the project-local runbook for Codex and other agents working with Projects Viewer.
Keep it current whenever agent workflow, local API usage, MCP configuration, verification commands, or safety boundaries change.

## Purpose

Projects Viewer is a local-only, read-only dashboard over configured project documentation. Agents should use this project as a source of structured local context, not as an action runner.

The preferred context source is the agent preflight packet API:

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
- `get_agent_preflight_packet`
- `get_project_brief_report`
- `get_ai_context`
- `get_ai_findings`

The adapter calls the local Projects Viewer HTTP API. By default it uses:

```text
http://127.0.0.1:5173
```

Override for tests or alternate local ports:

```powershell
$env:PROJECTS_VIEWER_API_BASE_URL = "http://127.0.0.1:<port>"
```

The MCP adapter does not start the dashboard server. If a tool returns an API unavailable error, start `npm run dev` and retry.

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

Scanned projects are read-only inputs. `app-data/projects.config.json` is the source of tracked project paths.

## Verification Commands

For code, contract, API, MCP, or documentation workflow changes, run the narrowest focused check first, then the broader checks:

```powershell
npm test -- tests/projects-viewer-mcp.test.mjs
npm test -- tests/agent-preflight-packet.test.mjs
npm test
npm run build
openspec list
openspec list --specs
openspec validate --all --strict
git diff --check
```

If a command cannot run, record the exact command, blocker, and remaining risk in the final report.

## Maintenance Rule

Update this file whenever any of these change:

- local startup commands;
- API endpoint names, parameters, or safety behavior;
- agent preflight packet workflow;
- MCP server path, tools, config, or transport;
- verification commands;
- agent safety boundaries.
