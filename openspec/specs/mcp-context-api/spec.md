## Purpose
Define compact agent context discovery, JSON-only API behavior, MCP response validation, and read-only diagnostics.

## Roadmap

- Roadmap phase: P4
- Related phases: P0

## Requirements

### Requirement: Saved project ids are listed compactly for agents

Projects Viewer SHALL expose a compact local API and MCP tool for saved configured project identity.

#### Scenario: Configured projects endpoint returns saved ids

- **WHEN** a client requests the configured project identity list
- **THEN** the response includes each saved project's `id`, `name`, `path`, `enabled`, and `tags`
- **AND** the response does not require parsing the full dashboard scan payload from `/api/projects`

#### Scenario: MCP exposes configured project ids

- **WHEN** an agent needs a `projectId` for an agent preflight packet
- **THEN** the Projects Viewer MCP adapter provides a read-only tool that returns saved configured project ids
- **AND** the tool does not accept arbitrary filesystem paths

### Requirement: API routes return JSON or JSON errors

Projects Viewer SHALL ensure requests under `/api/*` return JSON success responses or JSON error responses.

#### Scenario: Unknown API route

- **WHEN** a client requests an unknown `/api/*` route
- **THEN** the server returns a JSON error with HTTP `404`
- **AND** it does not return the Vite frontend HTML shell

#### Scenario: Known API route is unavailable or invalid

- **WHEN** a known API route cannot satisfy a request because data is missing or input is invalid
- **THEN** the server returns a JSON domain error with a stable code where available
- **AND** it does not return a successful HTML fallback body

### Requirement: MCP adapter rejects non-JSON and wrong-shape responses

Projects Viewer MCP tools SHALL treat non-JSON HTTP responses, malformed JSON, and wrong response shapes as tool errors.

#### Scenario: Local API returns HTML

- **WHEN** a Projects Viewer MCP tool receives HTTP 200 with `Content-Type: text/html`
- **THEN** the MCP response is an error
- **AND** the error includes the status, content type, requested API path, and a short body preview
- **AND** the tool does not return `{ "raw": "<!doctype html>..." }` as valid context

#### Scenario: JSON response has wrong shape

- **WHEN** a Projects Viewer MCP tool receives parseable JSON that lacks the minimum expected fields for that tool
- **THEN** the MCP response is an error that names the expected contract
- **AND** no side effects occur

### Requirement: Local diagnostics are explicit and read-only

Projects Viewer documentation SHALL describe reliable read-only diagnostics for local API response status, headers, content type, and body preview.

#### Scenario: PowerShell web command is unhelpful

- **WHEN** a PowerShell web cmdlet returns a low-value error for a local API request
- **THEN** the documented fallback uses `curl.exe -i --max-time 10` against the same `127.0.0.1` URL
- **AND** the diagnostic instructions ask agents to report status, `Content-Type`, and first body lines
