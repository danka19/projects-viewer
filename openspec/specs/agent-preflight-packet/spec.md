## Purpose
Define validated JSON retrieval boundaries for local agent preflight packets.

## Roadmap

- Roadmap phase: P4
- Related phases: P3

## Requirements

### Requirement: Agent preflight retrieval is validated as packet JSON

Projects Viewer SHALL require agent preflight retrieval through MCP to return packet JSON with `kind: "agent-preflight-packet"`.

#### Scenario: MCP receives valid packet JSON

- **WHEN** `get_agent_preflight_packet` receives JSON with `kind: "agent-preflight-packet"` for a saved project id
- **THEN** the MCP tool returns the packet as valid read-only context
- **AND** packet retrieval does not trigger commands, commits, task/calendar records, remote calls, or scanned-project writes

#### Scenario: MCP receives non-packet JSON

- **WHEN** `get_agent_preflight_packet` receives JSON without `kind: "agent-preflight-packet"`
- **THEN** the MCP tool returns an explicit wrong-contract error
- **AND** it does not treat the response as an agent preflight packet

### Requirement: Agent preflight API cannot fall through to frontend HTML

Projects Viewer SHALL protect `GET /api/agent-preflight-packet` from returning frontend HTML for API requests.

#### Scenario: Agent preflight route is mounted

- **WHEN** the local server receives `GET /api/agent-preflight-packet?projectId=<saved-id>&agentRole=implementation`
- **THEN** it returns `Content-Type: application/json` for either packet success or a structured API error
- **AND** it does not return `Content-Type: text/html`

#### Scenario: Stale or wrong server response is detected by MCP

- **WHEN** the MCP adapter receives the frontend HTML shell while requesting an agent preflight packet
- **THEN** the MCP adapter reports an API routing or stale-server error
- **AND** it includes enough response evidence for the user to restart or inspect the local dashboard server
