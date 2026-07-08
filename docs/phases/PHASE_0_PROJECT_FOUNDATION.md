# Phase 0. Project Foundation

Status: completed pending approval.

## Goal

Prepare repository operating rules, documentation structure, initial roadmap, audit, and verification checklist.

## Work Items

### 0.1 Documentation Foundation

Objective:

- Establish `AGENTS.md`, `CLAUDE.md`, `docs/`, roadmap, audit, glossary, and phase template.

Verification:

- Confirm required files exist.
- Confirm `docs/00_FILE_STRUCTURE.md` matches the generated structure.
- Confirm OpenSpec expectations and change-intake rules are documented.
- Confirm project facts are saved in `docs/README.md`, `docs/CONTEXT.md`, `docs/CURRENT_PROJECT_AUDIT.md`, and `docs/ROADMAP.md`.
- Run `git status --short`.

Exit criteria:

- Another Codex session can start from `AGENTS.md` and continue without chat history.

Evidence:

- Documentation foundation was initialized with the global `project-starter-kit` workflow.
- Repository map, context glossary, roadmap, current audit, and verification checklist now exist.
- Known project facts recorded: local-only live dashboard, Express/Vite server, read-only scanner, configured-project-path safety boundary, watcher rules, commands, and verification evidence.

## Phase Gate

- Project rules are clear.
- Secret and private-data handling is documented.
- Initial open decisions and risks are recorded.

Approval status:

- Completed pending human review.

## Change Intake

### 2026-07-08 Local Server Lifecycle

Idea:

- After agent work, do not automatically stop the local dashboard server; leave it running, restart only when needed, or start it if it is not running and the dashboard is needed.

Source:

- Human request on 2026-07-08.

Type:

- `documentation_change`, `verification_change`.

Decision:

- `adopt_now`.

Reason:

- This is an operational habit that affects verification and handoff quality but does not change product behavior or data contracts.

Affected specs:

- None.

Affected architecture:

- None.

Data contract impact:

- None.

Verification impact:

- Future verification should preserve a useful running server instead of shutting it down automatically.

Status:

- Accepted and recorded in `README.md` and `docs/AI_STEP_VERIFICATION_CHECKLIST.md`.

### 2026-07-08 Persistent Project And Workspace Management

Idea:

- Add persistent UI and backend support for managing tracked local projects and workspace discovery.

Source:

- Human request on 2026-07-08.

Type:

- `new_feature`, `architecture_change`, `data_contract_change`, `verification_change`, `documentation_change`.

Decision:

- `create_openspec_change` for implementation planning, with design captured first in `docs/superpowers/specs/2026-07-08-persistent-project-management-design.md`.

Reason:

- The request changes config persistence, API contracts, scanner input rules, watcher behavior, generated data storage, UI workflows, and verification requirements.

Affected specs:

- No `openspec/` directory exists yet; implementation planning should create or initialize the relevant OpenSpec change before code changes.

Affected architecture:

- Introduces canonical `app-data/projects.config.json`, generated `app-data/projects.generated.json`, config-management helpers, workspace discovery helpers, and UI management workflow.

Data contract impact:

- Adds persistent `workspaces`, richer `projects`, and `settings` config objects.

Verification impact:

- Requires migration, API, discovery, enabled-project scan filtering, persistence-after-restart, and UI workflow verification.

Status:

- Accepted for design and implementation planning; not yet implemented.
