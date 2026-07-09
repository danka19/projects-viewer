## Context

Projects Viewer currently has working local project management, AI context, project brief reports, and agent preflight packets. However, the diagnostic session found several friction points in the agent-facing workflow:

- The root `projects.config.json` can still act as legacy seed data and suggest stale project identity such as `Example Project`.
- The canonical saved ids live in `app-data/projects.config.json`, but the MCP `list_projects` tool returns the large dashboard scan payload rather than a compact id list.
- `get_agent_preflight_packet` can receive HTTP 200 with the Vite HTML shell when the API route falls through, and the MCP adapter currently wraps that body as `{ raw: "<!doctype html>..." }`.
- PowerShell web cmdlets can hide the useful status/content-type evidence that `curl.exe -i` shows directly.

This change is a contract-hardening layer over existing capabilities. It intentionally supersedes the old legacy migration behavior recorded in the completed `add-persistent-project-management` change rather than editing that historical artifact as if the original implementation had made this decision.

## Goals / Non-Goals

**Goals:**

- Make `app-data/projects.config.json` the only runtime source of tracked project/workspace config.
- Ensure a fresh setup starts empty and never imports an `Example Project` unless the user explicitly adds it.
- Provide a compact saved-project identity endpoint and MCP tool for agent workflows.
- Ensure API requests under `/api/*` return JSON or JSON errors instead of frontend HTML.
- Ensure MCP tools fail clearly on non-JSON, malformed JSON, or wrong contract shape.
- Keep Projects Viewer local-only and read-only with respect to scanned projects.
- Record why the OpenSpec change was not created during the first planning session.

**Non-Goals:**

- No dashboard redesign beyond labels needed to remove legacy config guidance.
- No deletion of user runtime data under ignored `app-data/`.
- No cloud sync, auth, remote model, task/calendar, shell command, or agent-control behavior.
- No automatic rescan, project discovery, or project tracking from MCP calls.
- No implementation of the hardening tasks in this proposal step.

## Decisions

### Use canonical config only

Runtime config initialization should create or read only `app-data/projects.config.json`. The legacy root config fallback should be removed from `server/project-config.mjs`, tests, and docs. If an example is useful, it should be a versioned empty example file with no real paths and no tracked projects.

Alternative considered: keep legacy migration but rename the example. Rejected because agents and users would still have two apparent sources of truth, which is exactly the failure mode this change addresses.

### Add a compact configured-project listing

Add a dedicated `GET /api/configured-projects` endpoint, and expose it through an MCP tool such as `list_configured_projects`. The endpoint should return saved ids and config identity fields directly. It may join already-available generated scan status when safe, but agents must not depend on fuzzy path/name matching in `/api/projects`.

Alternative considered: modify `list_projects` only. Rejected as the sole fix because dashboard scan data is intentionally large and status-rich, while agent preflight needs a small identity lookup.

### Treat `/api/*` HTML as a server bug

Express should mount API routes and a final `/api/*` JSON error handler before Vite middleware/frontend fallback. Unknown API routes should return JSON `404` with a stable code. Known API routes should return JSON success or JSON domain errors. Returning the Vite shell for an API URL should be tested as a regression.

Alternative considered: let clients detect HTML while the server keeps fallback behavior. Rejected because API correctness should be enforced at the source and because MCP/client hardening is only a second line of defense.

### Validate MCP response content and shape

The MCP adapter should check HTTP status, `Content-Type`, JSON parse success, and minimum expected shape per tool. `get_agent_preflight_packet` must validate `kind: "agent-preflight-packet"`. When validation fails, the MCP error should include status, content type, target path, and a short body preview.

Alternative considered: keep returning `{ raw: ... }` for non-JSON responses. Rejected because it makes routing failures look like successful tool output.

### Keep diagnostics explicit and read-only

Docs should keep `Invoke-RestMethod` examples for ordinary JSON use and add `curl.exe -i --max-time 10` for headers/content-type evidence. The diagnostic commands should be scoped to `127.0.0.1` and should not mutate state.

## Risks / Trade-offs

- Removing legacy fallback could surprise a user who only has root `projects.config.json` -> Mitigation: document the breaking change, prefer Manage Projects, and optionally provide an empty example config.
- A new compact endpoint overlaps with `/api/projects` -> Mitigation: document separate purposes: saved identity lookup vs dashboard scan payload.
- MCP shape validation could reject future compatible fields if too strict -> Mitigation: validate minimum required fields, not exact object equality.
- API route hardening may expose stale dev servers more loudly -> Mitigation: errors should include action-oriented messages and diagnostics.
- Existing completed OpenSpec artifacts mention legacy migration -> Mitigation: this change explicitly supersedes that behavior and docs must name the historical reason instead of silently rewriting it.

## Migration Plan

1. Implement tests that show a clean setup creates empty canonical config and does not read root `projects.config.json`.
2. Remove legacy runtime fallback and update docs/examples.
3. Add compact project identity endpoint/tool and MCP tests.
4. Add `/api/*` JSON fallback/error route tests and implementation.
5. Harden MCP response parsing and packet shape validation.
6. Update documentation and audit entries.
7. Run focused tests, full tests, build, OpenSpec strict validation, and whitespace checks.

Rollback strategy: restore the previous commit if the hardening breaks local startup. Because this change must not delete ignored runtime config, rollback should not require restoring scanned project folders.

## Open Questions

- Whether to introduce `projects.config.example.json` immediately or wait until a user-facing setup flow needs a versioned example file.
- Whether `list_projects` should keep its current name and payload while adding `list_configured_projects`, or whether `list_projects` should later be renamed/deprecated for MCP callers.
