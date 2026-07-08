# Agent Operating Guide

This file is the shared entry point for Codex and future agent tools. Keep it short; detailed project context lives in `docs/`.

## Current Mode

- Active implementation agent: Codex.
- Future subagents may be used for bounded worker, reviewer, architecture-checker, and verification-checker tasks when tooling supports them.
- The human owner keeps final product, UX, data-source, security, and business-scope decisions.

## Required Read Order

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/00_FILE_STRUCTURE.md`
4. `docs/ROADMAP.md`
5. Relevant `docs/phases/PHASE_*.md` when working by roadmap phase.
6. `openspec/` before SDD/OpenSpecs/TDD work, product behavior changes, data contract changes, or acceptance planning.
7. Relevant `openspec/changes/<change-id>/` folder when working on an active proposed change.
8. `docs/CURRENT_PROJECT_AUDIT.md` before trusting existing implementation or setup state.
9. `docs/AI_STEP_VERIFICATION_CHECKLIST.md` before implementation, verification, or completion reporting.
10. Only topic documents related to the current task.

Scaling rule: for small bounded tasks (typo fixes, single-file edits, doc corrections, quick questions) read only `AGENTS.md` plus the files the task actually touches. The full read order is mandatory for phase work, architecture, data contract, or product behavior changes.

## Project Rules

1. Quality, thoughtful design, safety, and architecture are more important than rushing.
2. Project documentation must be written in English unless the human explicitly changes the project language.
3. User-facing replies must be written in Russian unless the user explicitly asks for another language.
4. At the end of every work session, before replying to the user, create a git commit when the project repository has intentional changes.
5. After completing work, update documentation if the change affects product behavior, architecture, setup, operations, security, roadmap status, data contracts, or user-visible labels.
6. If work follows roadmap steps, verify before changes that the current branch matches the active roadmap phase.
7. End-of-session reports follow the global `session-report` skill: short mode for bounded tasks, full mode for phase work items, multi-file features, or changes to architecture, data contracts, security, or product behavior.
8. Reports must be self-contained enough that the human understands the result without opening changed files.
9. Treat human feedback as durable project knowledge. Persist product rules, rejected behavior, acceptance criteria, verification habits, and open decisions in the correct docs.
10. Before implementation, map affected OpenSpec requirements or change deltas to acceptance scenarios and verification evidence. If automated tests do not exist, record manual verification steps and residual risk.
11. When the next project step requires a human decision or mandatory verification, say so explicitly and explain why it matters, relevant options or tradeoffs, expected evidence, and the consequence or risk of leaving it unresolved.
12. User-facing reports must always include next steps. If there is no active required action, state the recommended next step and why it is next.
13. When the human asks for advice, asks "how is it better", asks a conceptual question, or asks for an opinion/recommendation, answer with a detailed explanation first and do not silently convert the question into implementation. Make changes only when the human explicitly asks to record, implement, update, or continue work, or when the question is inseparable from a requested documentation update.
14. When several open questions or decisions remain, ask them in one clear batch with recommended defaults and tradeoffs. Ask one-by-one only when a single answer is required to safely proceed.

## Project-Specific Context

- Projects Viewer is a local-only dashboard for reading documentation in configured local projects.
- Scanned projects are read-only inputs. Never modify, move, delete, reformat, or create files inside scanned project paths as part of dashboard scans.
- `projects.config.json` is the only source of scanned project paths. Browser/API requests must not provide arbitrary paths.
- `npm run dev` starts `server.mjs`, Express API, Vite middleware, startup scan, and documentation watcher at `http://127.0.0.1:5173` by default.
- Static mode is expected when the browser cannot reach the local API; rescan controls must stay disabled there.
- Live rescan behavior must preserve single-flight scans, one queued/delayed rescan, and the 30 second minimum throttle.
- Do not add cloud, auth, API keys, agent control, arbitrary shell commands, or whole-disk scanning without a documented design decision and human approval.

## User-Facing Report Style

- Follow the global `session-report` skill for structure and mode selection (short vs full).
- Do not hide ambiguity. If documentation is missing, stale, contradictory, or only partially verified, state that in its own block and update the relevant durable document when appropriate.
- If the human asked for a recommendation or "what is better", the answer must compare the practical options, give the recommended path, explain tradeoffs and risks, and clearly separate advice from any actions taken.

## Global Skills

Generic workflow skills live in `~/.codex/skills` and apply to all projects. Do not copy them into the repository; project-specific deltas belong in this file.

- Architecture planning: `architecture-planner`.
- New ideas, fixes, scope changes, architecture notes, data contract changes, or verification requests during an active phase: `phase-change-intake` before changing the plan.
- Phase planning: `phase-planner`.
- One phase work item at a time: `phase-step-runner`.
- Full phase execution with worker/reviewer/checker roles: `phase-full-runner`.
- SDD/OpenSpec workflow: `openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`, `openspec-archive-change`, `openspec-explore`.
- Delegating a bounded task to Claude: `handoff-to-claude`.
- End-of-session reporting: `session-report`.
- Periodic doc/reality reconciliation: `doc-sync-audit`.
- At the start of planning or phase execution work, state which skill is being used and why.
- When creating a phase implementation plan, follow `docs/phases/PHASE_PLAN_TEMPLATE.md`.
- Planning from `docs/ROADMAP.md` alone is forbidden.
- OpenSpec artifacts under `openspec/` are the source of truth for product behavior, requirements, proposed changes, and acceptance criteria.
- Documentation governance and TDD-style verification rules should live in `openspec/specs/documentation-governance/spec.md` once that spec exists.
- New feedback during a phase must be routed as adopt now, queue current phase, create OpenSpec change, defer, or reject before it changes active scope.
- For SDD/OpenSpecs work, run `openspec list`, `openspec list --specs`, and `openspec validate --all --strict` before completion when relevant.

## Branching Guidance

For roadmap work, use a branch whose name clearly identifies the phase or workstream, for example:

```text
phase-0/project-foundation
phase-1/discovery
phase-2/core-data-model
phase-3/first-usable-workflow
```

If a task does not belong to a roadmap step, use a short descriptive branch. Use `main` only for stable integration or initial repository setup.

## Secrets And Config

- Credential and secret values must live in local-only files ignored by git.
- The default local secret file is `.env.local`.
- Keep `.env.example` in git as the documented template with placeholders only.
- Never commit API keys, customer files, production credentials, private datasets, dumps, or exports.

## Command Execution Rules

- Always run shell commands with explicit timeouts where the tool supports them.
- Prefer non-interactive commands.
- For commands that can produce large output, inspect focused output instead of flooding the conversation.
- If a command appears blocked, stop it, record the exact command and blocker, then retry narrower or report the required human action.

## Before Claiming Work Is Done

- Run the narrowest meaningful verification command.
- If verification cannot run, record the exact command and blocker.
- Verify that documentation is still correct and complete for the task.
- Create a git commit before replying when the repository has intentional changes and local rules require commits.
