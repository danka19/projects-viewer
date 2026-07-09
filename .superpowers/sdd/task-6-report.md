# Task 6 Report

## Scope

Implemented OpenSpec hardening Task 6 only: add `GET /api/configured-projects` with safe query handling and no arbitrary path input.

## Changes

- Added `GET /api/configured-projects` in `server.mjs`.
- Reused `readProjectConfig(configOptions)` and `getConfiguredProjectIdentities(config)`.
- Returned compact stable JSON shape: `{ "projects": [...] }`.
- Rejected all query parameters with JSON `400` `{ error, code: "invalid-query" }`.

## TDD Evidence

### RED

Command:

```powershell
node --test tests/server-api.test.mjs
```

Result:

- Existing tests passed.
- New `configured projects API returns compact configured project identities` failed with `404 !== 200`.
- New `configured projects API rejects unsupported query parameters including path-like input` failed with `404 !== 400`.

### GREEN

Command:

```powershell
node --test tests/server-api.test.mjs
```

Result:

- `7` tests passed.
- `0` tests failed.

## Additional Verification

Command:

```powershell
git diff --check
```

Result:

- Exit code `0`.
- Git reported LF/CRLF warnings only; no diff formatting errors.

## Concerns / Residual Risk

- Endpoint currently exposes configured identities only, without scan-status enrichment; Task 7 can add status joining if needed.
- Query rejection is intentionally strict: any query string returns `400`.

## Next Step

- Task 7 can extend this compact config payload by joining broader case/status data if that behavior is still desired.
