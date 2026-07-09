Status: DONE

Task: OpenSpec `harden-mcp-context-api` Task 4 (`1.4 Update empty-state UI text and docs so users add projects through Manage Projects or app-data/projects.config.json`).

What changed:
- Updated current user-facing setup/config docs in `README.md`, `docs/README.md`, `docs/00_FILE_STRUCTURE.md`, and `docs/CONTEXT.md` to describe fresh setup as empty-by-default, direct users to **Manage Projects** or `app-data/projects.config.json`, and point to `projects.config.example.json` as the schema reference.
- Updated the empty-state copy in `src/App.tsx` so the first-run UI points to **Manage Projects** or direct local config editing instead of implying a legacy/root config flow.
- Removed the `Example Project` entry from the `README.md` config sample and added the versioned example config file to the documented file map.

TDD / RED -> GREEN evidence:
- RED: `rg -n "migrat|legacy root|Example Project|root \`?projects\.config\.json|projects\.config\.json\` is" README.md docs src`
  - Before edits, current docs/UI still hit in `README.md`, `docs/README.md`, `docs/00_FILE_STRUCTURE.md`, `docs/CONTEXT.md`, and `src/App.tsx`.
- GREEN: same `rg` command after edits
  - Remaining hits are limited to historical docs (`docs/superpowers/*`, `docs/planning/*`, phase history), audit context, `docs/02-dashboard-data-model.md`, and generated/static data in `src/data/projects.json`; the current setup/config guidance files owned by Task 4 are clean.

Verification:
- `rg -n "migrat|legacy root|Example Project|root \`?projects\.config\.json|projects\.config\.json\` is" README.md docs src`
- `npm run build` -> failed in `prebuild` with `Scan failed: projects.config.json must contain a non-empty "projects" array.`
- `git diff --check` -> passed

Concerns:
- `npm run build` is currently blocked by existing scan validation that still rejects an empty config, which conflicts with the new empty-by-default guidance. I did not change runtime logic in this task.
- `src/data/projects.json` still contains `Example Project`; this appears outside Task 4 ownership and likely belongs to a runtime/data follow-up rather than current docs/UI text.

Next step:
- Task 4 can be reviewed as docs/UI-only complete; a follow-up implementation task should align scan/build behavior and static fallback data with the empty canonical config contract.
