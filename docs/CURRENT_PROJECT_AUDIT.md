# Current Project Audit

Status: active.

Last updated: 2026-07-08.

## Repository Baseline

| Item | Current State |
|---|---|
| Repository root | `C:\Users\danoc\Documents\projects\projects-viewer` |
| Current implementation worktree | `C:\Users\danoc\Documents\projects\projects-viewer\.worktrees\persistent-project-management` |
| Current branch | `feature/persistent-project-management` |
| Remote | `origin https://github.com/danka19/projects-viewer.git` |
| Latest known commit before this audit update | `624c8ae Document setup and project commands` |
| Local divergence | `main` was ahead of `origin/main` by 2 commits before this documentation-foundation update |

## Useful Starting Points

- Agent rules: `AGENTS.md`.
- Product and operations overview: `README.md` and `docs/README.md`.
- Repository map: `docs/00_FILE_STRUCTURE.md`.
- Roadmap: `docs/ROADMAP.md`.
- Runtime commands: `README.md` and `docs/00_FILE_STRUCTURE.md`.
- Workflow skills are global under `~/.codex/skills`.

## Verified Environment Evidence

| Check | Evidence |
|---|---|
| Git installed | `git status --short --branch` succeeded on 2026-07-08 |
| Runtime installed | Node/npm commands succeeded on 2026-07-08 |
| Tests available | `npm test` passed: 2/2 Node tests on 2026-07-08 |
| Build available | `npm run build` passed on 2026-07-08 |
| Local app/server available | `npm run dev` started `http://127.0.0.1:5173`; `/api/scan-status` returned `success`, trigger `startup`, docs `53` |
| Production-like local server | `npm run server` started after `npm run build`; `/api/projects` returned 1 project and 53 docs; `/` returned HTTP 200 |
| Watcher behavior | Temporary markdown add produced watcher scan with 54 docs; delayed unlink scan returned 53 docs |
| Persistent config module | `npm test -- tests/project-config.test.mjs` passed: migration, project CRUD, duplicate handling, enabled filtering, workspace normalization |
| Workspace discovery module | `npm test -- tests/project-discovery.test.mjs` passed: depth normalization, marker reasons, exclusions, disabled workspace |
| Scanner config contract | `npm test -- tests/run-scan.test.mjs` passed: legacy config, enabled-project filtering, app-data generated output |
| Project management API | `npm test -- tests/server-api.test.mjs` passed: add project validation/persistence, workspace discovery, track-discovered |
| Frontend build | `npm run build` passed after adding `Manage Projects`; prebuild wrote `app-data/projects.generated.json` |
| Manual project-management UI verification | `npm run dev` on `http://127.0.0.1:5174` passed: opened **Manage Projects**, added one temp project, added one temp workspace, discovered two candidate projects, tracked selected candidates, disabled the temp single project, rescanned enabled projects, restarted server, and confirmed config persisted while generated data excluded the disabled project |

## Known Risks And Gaps

| ID | Risk | Owner | Status |
|---|---|---|---|
| AUDIT-001 | Product scope beyond local documentation dashboard and live rescan is not fully documented in OpenSpec form. | Phase 1 | open |
| AUDIT-002 | Environment and verification commands are recorded in README and this audit; keep them current as scripts change. | Phase 0 | monitored |
| AUDIT-003 | Architecture decisions are partially documented in README/docs, but no ADR/OpenSpec exists for server/API/watcher contracts. | Phase 1/2 | open |
| AUDIT-004 | Local branch has commits ahead of GitHub remote; push is still a human/project decision. | Human owner | open |
| AUDIT-005 | Manual browser verification for add project, restart persistence, workspace discovery, track selected, disable, and rescan. | Current feature | closed 2026-07-08 |

## Audit Rules

- Update this file when a finding is fixed, invalidated by evidence, or moved.
- Do not mark a finding closed without verification evidence.
