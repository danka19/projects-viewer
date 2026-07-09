# Task 13 Report

- Task: Harden MCP `requestJson()` errors to include status, content type, API path, and a short single-line body preview for non-JSON, malformed JSON, and non-OK API responses.
- Scope: `server/projects-viewer-mcp.mjs`, `tests/projects-viewer-mcp.test.mjs`.
- OpenSpec: `harden-mcp-context-api`, Task 13 only.

## RED

- Command: `node --test tests/projects-viewer-mcp.test.mjs`
- Result: failed as expected with 3 failing tests.
- Failure evidence:
  - HTML error lacked `preview`.
  - Malformed JSON error lacked `content-type`.
  - Non-OK JSON error lacked `content-type` and structured context.

## GREEN

- Command: `node --test tests/projects-viewer-mcp.test.mjs`
- Result: 4 tests passed, 0 failed.
- Command: `git diff --check`
- Result: exited 0 with only line-ending warnings for existing working-copy normalization on `server/projects-viewer-mcp.mjs` and `tests/projects-viewer-mcp.test.mjs`.

## Implementation Notes

- Added a shared API error context formatter in the MCP adapter.
- Added a short body preview helper that collapses newlines/tabs into spaces and truncates the preview for single-line MCP tool readability.
- Applied the enriched context to:
  - non-JSON responses,
  - malformed JSON responses,
  - non-OK HTTP responses.
- Did not add response shape validation; left to Task 14 per brief.

## Concerns

- Body preview is intentionally capped at 160 characters; if downstream consumers need a different limit, align that in a follow-up rather than expanding this task.
