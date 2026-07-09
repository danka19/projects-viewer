## 1. Canonical Config Cleanup

- [x] 1.1 Add regression tests proving a clean setup creates no tracked projects and does not read root `projects.config.json`.
- [x] 1.2 Remove root `projects.config.json` fallback and legacy migration from `server/project-config.mjs`.
- [x] 1.3 Delete or stop relying on root `projects.config.json`; add an empty example config only if needed.
- [x] 1.4 Update empty-state UI text and docs so users add projects through Manage Projects or `app-data/projects.config.json`.

## 2. Compact Project Identity API

- [x] 2.1 Add a pure helper that maps saved config projects to compact project identity objects.
- [x] 2.2 Add `GET /api/configured-projects` with safe query handling and no arbitrary path input.
- [x] 2.3 Add tests for enabled/disabled projects, tags, empty config, and optional scan status joining where implemented.
- [x] 2.4 Add MCP tool `list_configured_projects` and document it as the preferred preflight `projectId` lookup.

## 3. API JSON Boundary Hardening

- [x] 3.1 Add regression tests showing unknown `/api/*` routes return JSON `404`, not the Vite HTML shell.
- [x] 3.2 Ensure all API routes and the `/api/*` JSON error handler are mounted before Vite middleware or frontend fallback.
- [x] 3.3 Add focused tests proving `GET /api/agent-preflight-packet` returns JSON content type for success and structured errors.

## 4. MCP Adapter Hardening

- [x] 4.1 Update MCP `requestJson()` to reject non-JSON responses even when HTTP status is 200.
- [x] 4.2 Include status, content type, API path, and a short body preview in MCP errors.
- [x] 4.3 Add minimum response-shape validation for `list_projects`, `list_configured_projects`, `get_ai_context`, `get_ai_findings`, `get_project_brief_report`, and `get_agent_preflight_packet`.
- [x] 4.4 Add MCP tests for HTML fallback, malformed JSON, wrong packet kind, and valid packet JSON.

## 5. Documentation And Verification

- [ ] 5.1 Update `README.md`, `docs/README.md`, `docs/00_FILE_STRUCTURE.md`, `docs/AGENTS_USAGE.md`, and `docs/CURRENT_PROJECT_AUDIT.md`.
- [ ] 5.2 Record the implementation result and close or revise `AUDIT-010`.
- [ ] 5.3 Run `npm test -- tests/project-config.test.mjs`, `npm test -- tests/server-api.test.mjs`, `npm test -- tests/projects-viewer-mcp.test.mjs`, and `npm test -- tests/agent-preflight-packet.test.mjs`.
- [ ] 5.4 Run `npm test`, `npm run build`, `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`.
