## Why

The 2026-07-09 MCP diagnostic showed that agent context workflows can still be confused by legacy config, oversized project listings, and successful-looking HTML fallback responses. This change hardens the local config and MCP/API contracts so agents can reliably find saved project ids, request preflight packets, and recognize API routing failures before implementation work starts.

## What Changes

- Remove the root `projects.config.json` from the runtime config model. A clean setup must start with no tracked projects unless the user explicitly adds them.
- Add a compact saved-project identity listing for agent and MCP workflows instead of requiring agents to parse the full dashboard scan payload from `/api/projects`.
- Harden `/api/*` behavior so API requests return JSON responses or JSON domain errors, not the Vite HTML shell.
- Harden the Projects Viewer MCP adapter so non-JSON HTTP 200 responses and wrong response shapes become explicit tool errors.
- Require `get_agent_preflight_packet` callers to use saved project ids and require the MCP adapter to validate `kind: "agent-preflight-packet"`.
- Document reliable local diagnostics for JSON APIs and response-header checks, including when to prefer `curl.exe -i --max-time 10` over PowerShell web cmdlets.
- **BREAKING**: root `projects.config.json` will no longer seed or migrate tracked projects at startup. Existing users must keep tracked projects in `app-data/projects.config.json` or add them through Manage Projects.

## Capabilities

### New Capabilities

- `local-project-config`: Canonical local project/workspace config behavior, including no default projects and no legacy root config fallback.
- `mcp-context-api`: Agent-facing project identity listing, JSON-only local API behavior for `/api/*`, MCP response validation, and local diagnostics.

### Modified Capabilities

- `agent-preflight-packet`: Preflight retrieval must be protected from HTML fallback responses and must be validated as packet JSON by MCP callers.

## Impact

- Config/runtime: `server/project-config.mjs`, startup config initialization, tests, root config/example files, and docs that still mention legacy migration.
- API: Express route ordering and JSON error handling for `/api/*`, plus a compact configured-projects endpoint.
- MCP: `server/projects-viewer-mcp.mjs` tool list, response parsing, shape validation, and error messages.
- Tests: config default/no-legacy tests, API route/fallback tests, configured-project listing tests, MCP non-JSON/wrong-shape tests, and preflight packet shape validation tests.
- Documentation: `docs/planning/MCP_CONTEXT_API_HARDENING_PLAN.md`, `docs/AGENTS_USAGE.md`, `docs/00_FILE_STRUCTURE.md`, `docs/README.md`, `README.md`, and `docs/CURRENT_PROJECT_AUDIT.md`.
