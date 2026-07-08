# AI Step Verification Checklist

Purpose: define the minimum self-check an AI agent must run before claiming a roadmap step, phase work item, architecture change, UI change, data contract change, code change, or documentation update is complete.

Status: mandatory for future implementation work. If this checklist conflicts with a phase-specific plan, stop and document the conflict instead of guessing.

## Required Pre-Work Check

Before changing code or product documentation, confirm:

- Current branch matches the active phase branch or the user approved a different branch.
- `AGENTS.md`, `docs/README.md`, `docs/00_FILE_STRUCTURE.md`, `docs/ROADMAP.md`, the relevant phase plan, `openspec/` when SDD applies, `docs/CURRENT_PROJECT_AUDIT.md`, and this checklist were read.
- The active `openspec/changes/<change-id>/` folder was read when work implements or plans a proposed change.
- Task-specific audit, acceptance-gap, handoff, or planning documents were read.
- Existing code and tests were searched for the concepts being changed.
- The work was classified as product behavior, architecture, setup, operations, security, roadmap status, data contract, user-visible label, or docs-only.
- Affected OpenSpec requirements, proposed deltas, acceptance scenarios, and expected verification evidence are known before implementation starts.
- New human feedback received during the phase was routed through `phase-change-intake` before changing the active plan.

If documentation is ambiguous, incomplete, or contradictory, say so in the user-facing report and update the relevant work log or audit note instead of silently guessing.

## Human Feedback Memory

Whenever the human owner explains how the product should work, rejects behavior, adds an edge case, corrects terminology, or asks for a verification habit, classify it before finishing:

- `glossary_term`: update `docs/CONTEXT.md`.
- `product_behavior_rule`: update `openspec/specs/` when accepted current behavior changes, or `openspec/changes/` when the behavior is still proposed.
- `acceptance_criterion`: update the active `openspec/changes/` artifact and relevant phase plan; promote it to `openspec/specs/` only after acceptance.
- `verification_step`: update this checklist.
- `rejected_behavior`: update an audit/acceptance-gap document and this checklist when it affects future verification.
- `open_decision`: record it in the phase plan, audit, or roadmap and state it in the final report.
- `implementation_detail`: document it only where it affects behavior, architecture, setup, operations, security, or future work.
- `reporting_preference`: update `AGENTS.md` and this checklist when the human asks for a different answer style, level of detail, or report structure.

## Advice-Versus-Action Check

- If the human asks "what is next", include a concrete next-step recommendation and explain why it is next.
- If the human asks "how is it better", asks for advice, or asks a conceptual/architecture question, provide a detailed answer first and do not silently implement.
- If the human also explicitly asks to "record", "write", "update", "fix", "continue", or otherwise change project artifacts, make the requested documentation/code change after answering or while clearly separating the action from the advice.
- When there is ambiguity between "answer" and "do", prefer answering and ask for confirmation before implementation unless project safety, durable documentation, or an explicit "record this" request makes the action clear.
- When multiple open questions remain, ask them in one concise batch with recommended defaults and tradeoffs. Ask one-by-one only when one blocking answer is required before any useful next step can happen.

## Domain And Architecture Check

- Use canonical terms from `docs/CONTEXT.md`.
- Preserve boundaries between raw input, derived data, review-required proposals, and accepted decisions.
- Do not treat heuristic or LLM output as source-of-truth data.
- Record architecture decisions that affect module boundaries, persistence, integrations, security, deployment, or operations.

## Test And Evidence Check

- Treat OpenSpec scenarios as the acceptance starting point for TDD-style work.
- Before writing code, identify whether the change can be covered by automated tests, syntax checks, contract checks, or manual verification.
- Add or update tests proportional to risk.
- Cover negative cases where the system must not infer too much.
- Run the narrowest meaningful tests first, then broader tests when shared behavior changes.
- Run `git diff --check` before completion when files changed.
- For SDD/OpenSpecs changes, run `openspec list`, `openspec list --specs`, and `openspec validate --all --strict`.
- If a test or check cannot run, record the exact command and blocker.
- If automated tests do not exist for the affected behavior, record manual verification steps and remaining manual-verification risk.
- When the next step requires a human decision, explicitly state that it is a required decision and explain the question, why it matters, relevant options or tradeoffs, and the consequence of leaving it unresolved.
- When the next step requires mandatory verification, explicitly state that it is required and describe exactly what must be checked, how to check it where known, expected evidence, and residual risk if it is not performed.

## Documentation Check

Before reporting completion, ask:

- Does `docs/00_FILE_STRUCTURE.md` need an update?
- Does `docs/ROADMAP.md` need a phase status, gate, or acceptance update?
- Does `docs/CURRENT_PROJECT_AUDIT.md` need a finding added, updated, or closed?
- Does `openspec/` need a CLI-native spec or change update?
- Does `openspec/specs/documentation-governance/spec.md` still describe the documentation and TDD workflow accurately?
- Does the relevant phase plan need implementation evidence or blockers?
- Does `docs/CONTEXT.md` need a glossary term?
- Does this checklist need an update because the human introduced a new verification habit or rejected behavior?
- Did any new phase idea need an intake record, OpenSpec change, audit note, or deferred backlog entry?

## Final Report Check

Follow the global `session-report` skill: pick short or full mode by task size, write in Russian with clear Markdown sections, make the report self-contained, and end with the next step. When the next step requires a human decision or mandatory verification, explain it in detail rather than using a terse label.
