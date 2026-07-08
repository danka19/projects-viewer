# Implementation Plan (Short)

Status: proposed, not implemented. No code exists yet.
Last updated: 2026-07-07.

## Shape

Local-only, read-only, two parts:

1. **Scanner** (Node.js, no DB): walks configured project roots, parses docs per profile, runs status rules, writes `data/projects.json`. Excludes `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `vendor`, binaries, files > 1 MB; reads only the documentation whitelist (README/CLAUDE/TODO/ROADMAP/CHANGELOG/AGENTS/CONTEXT, `docs/**/*.md`, `specs/**/*.md`, `.openspec/**`, handoffs, phases, audits). Optional `git log -1` / `git branch --show-current` per repo.
2. **Viewer**: static HTML/JS page (no framework needed at first) served by a tiny local server; renders project cards with status badge, reasons with evidence quotes, phase table, open items, decisions, handoffs. A "Rescan" button re-runs the scanner.

## Steps

1. **Bootstrap** — `package.json`, `config.json` (scan roots, thresholds, per-project overrides), folder layout (`scanner/`, `web/`, `data/`, `docs/`).
2. **Walker + doc inventory** — safe file walker with the exclusion/whitelist rules; emit `DocFile[]` per project; profile detection (codex-phase / openspec / adr / plain-readme).
3. **Codex-phase parser** (highest value, covers AutoParts): ROADMAP phase sections, `Status:` lines, phase plans + work items, CURRENT_PROJECT_AUDIT baseline/remediation, handoffs + CLAUDE.md pointer check, audits, dated decisions.
4. **Status engine** — normalization table + project-level rules from `03-status-rules.md`, always with `statusReasons[].evidence`.
5. **Viewer v1** — overview grid (status, idle days, counts) + project detail view (phases, open work, decisions needing the human, handoffs, warnings). Russian UI labels, English content as-is.
6. **Validate against reality** — run on `AutoParts` (expect `needs attention`: card rebuild + human acceptance pending) and the other projects folder members; fix parser gaps; add `plain-readme`/checkbox fallback and openspec parser as needed.
7. **Polish** — rescan button, sort/filter by status, config-driven thresholds, `warnings` surfacing for unparseable projects.

## Acceptance for v1

- AutoParts renders with correct phase list (0 → 9 incl. 4.5/4.6/4.7/4.8), correct active phase, and a `needs attention` badge whose evidence quotes the card-rejection and human-approval lines.
- A project with no docs renders as `unknown`, not as a crash.
- Scanner completes over `C:\Users\danoc\Documents\projects` in seconds and touches no forbidden files (verify with a file-access log during development).

## Open questions for the owner

1. Single scan root (`...\Documents\projects`) or explicit project list in config?
2. Should the dashboard read git (branch/last commit) — requires running `git` per repo — or stay filesystem-only in v1? Recommendation: read git; it is the best freshness signal.
3. UI language: Russian labels (per session-report convention) or English to match the docs? Recommendation: Russian labels.
