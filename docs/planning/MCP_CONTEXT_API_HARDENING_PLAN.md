# MCP Context API Hardening Plan

Status: planned.

Decision date: 2026-07-09.

## Purpose

This plan records the follow-up work from the 2026-07-09 MCP/API diagnostic session. The goal is to make Projects Viewer safer and easier for Codex agents to use by removing legacy config ambiguity, returning explicit project ids for agent workflows, and making API/MCP failures visible as failures instead of successful-looking HTML responses.

## Accepted Decisions

- `app-data/projects.config.json` is the only runtime source of configured projects and workspaces.
- The root `projects.config.json` must be removed from the runtime model. It should not seed default projects, migrate automatically, or suggest an `Example Project`.
- If an example config is useful, keep only a versioned empty example file such as `projects.config.example.json` with no tracked projects.
- A fresh Projects Viewer setup should start with no configured projects by default.
- MCP/project context tools should expose saved project ids directly; agents must not infer ids from project names or legacy files.
- `get_agent_preflight_packet` must fail clearly when the local API returns the Vite HTML shell instead of packet JSON.

## Current Failure Evidence

During the diagnostic session:

- `mcp__projects_viewer.list_projects` returned a large dashboard scan payload that was useful for status review but awkward for selecting a `projectId`.
- The legacy root `projects.config.json` could suggest a wrong id such as `example-project`.
- The canonical local config under `app-data/projects.config.json` contained the correct saved project id `projects-viewer`.
- `mcp__projects_viewer.get_agent_preflight_packet` called with `projectId=projects-viewer` returned HTTP 200 with the Vite HTML index shell instead of an `agent-preflight-packet` JSON document.
- Direct HTTP checks showed `/api/projects` returned JSON, while `/api/agent-preflight-packet?projectId=projects-viewer&agentRole=implementation` returned `Content-Type: text/html`.
- `Invoke-WebRequest` produced a low-value `Object reference not set to an instance of an object.` diagnostic, while `curl.exe -i --max-time 10 ...` showed the actual response status, headers, and content type.

## Planned Work

### 1. Remove Legacy Config Ambiguity

- Delete the root `projects.config.json` runtime fallback.
- Stop reading or migrating legacy root config from `server/project-config.mjs`.
- When canonical config is absent, create an empty current config with no projects and no workspaces unless the user explicitly adds them.
- Add or update tests so a clean repository startup does not create `Example Project`.
- If needed, add `projects.config.example.json` with an empty modern schema and placeholder comments outside JSON only if the file format supports them. Do not include real project paths.
- Update docs that still describe root `projects.config.json` as a seed, example, or migration source.

### 2. Add A Compact Project Id Listing

- Keep `/api/projects` focused on dashboard scan data.
- Add a compact config-focused API endpoint, for example `GET /api/configured-projects`, that returns saved project identity data:
  - `id`
  - `name`
  - `path`
  - `enabled`
  - `tags`
  - optional scan summary fields only when already available, such as `status`, `lastModified`, or `lastScanError`
- Add an MCP tool such as `list_configured_projects`.
- Document that agents should call `list_configured_projects` before `get_agent_preflight_packet`.
- Consider adding `id` to `/api/projects` when a scanned project can be matched to saved config, but do not make agents depend on fuzzy matching.

### 3. Harden Agent Preflight API Routing

- Verify why `/api/agent-preflight-packet` can fall through to the Vite frontend shell while `/api/projects` works.
- Ensure the route is mounted before Vite middleware and before any frontend fallback.
- Add API regression coverage that the running Express server returns JSON for `GET /api/agent-preflight-packet?projectId=<saved-id>&agentRole=implementation`.
- Return JSON domain errors for API paths that cannot be served; do not allow unknown `/api/*` routes to return the frontend HTML shell.
- Preserve the existing safety boundary: the endpoint remains read-only and accepts only saved `projectId`, optional `changeId`, and optional `agentRole`.

### 4. Harden The MCP Adapter

- Update `server/projects-viewer-mcp.mjs` so `requestJson()` treats non-JSON responses as errors even when HTTP status is 200.
- Include response status, content type, and a short body preview in the MCP error message.
- For `get_agent_preflight_packet`, validate that the parsed JSON has `kind: "agent-preflight-packet"`.
- For `list_projects` and the new compact project list, validate the minimum expected response shape.
- Add MCP tests for an HTML fallback response so the tool reports a clear error instead of returning `{ "raw": "<!doctype html>..." }`.

### 5. Improve Local HTTP Diagnostics

- Prefer `Invoke-RestMethod` for normal JSON examples in documentation.
- Add `curl.exe -i --max-time 10` examples for response-header diagnostics.
- Document that PowerShell web cmdlets can produce low-value errors in some response states, and agents should fall back to `curl.exe -i` when they need exact status, `Content-Type`, and body preview evidence.
- Keep diagnostic commands read-only and scoped to `127.0.0.1`.

## Verification Strategy

Focused checks for implementation:

```powershell
npm test -- tests/project-config.test.mjs
npm test -- tests/server-api.test.mjs
npm test -- tests/projects-viewer-mcp.test.mjs
npm test -- tests/agent-preflight-packet.test.mjs
npm test
npm run build
git diff --check
```

Manual/local API checks after implementation:

```powershell
curl.exe -i --max-time 10 "http://127.0.0.1:5173/api/configured-projects"
curl.exe -i --max-time 10 "http://127.0.0.1:5173/api/agent-preflight-packet?projectId=projects-viewer&agentRole=implementation"
```

Expected evidence:

- Fresh default config has no tracked projects.
- No runtime path reads root `projects.config.json`.
- Agent-facing project list exposes saved ids without requiring scan payload parsing.
- Agent preflight packet returns JSON with `kind: "agent-preflight-packet"`.
- HTML fallback responses become explicit MCP errors.

## Documentation Updates Required During Implementation

- `docs/AGENTS_USAGE.md`: agent workflow, MCP tool list, diagnostics, and canonical config rules.
- `docs/00_FILE_STRUCTURE.md`: remove root legacy config as runtime source and add any `.example` file if introduced.
- `docs/README.md`: current state, operations summary, and safety summary.
- `docs/CURRENT_PROJECT_AUDIT.md`: close or revise the related risk once verified.
- OpenSpec artifacts if the implementation changes accepted API behavior or creates a new agent-facing contract.
