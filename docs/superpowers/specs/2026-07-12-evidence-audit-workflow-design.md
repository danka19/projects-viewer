# Evidence Audit Workflow Design

Date: 2026-07-12

Status: approved by the human owner for implementation.

## Goal

Substantial verification sessions that define criteria and produce findings must leave durable evidence instead of ending only with a chat report. After such an audit, Codex must also offer to create remediation work unless the human has already authorized it.

This workflow applies across projects. A check is substantial when it evaluates several criteria or surfaces findings, risks, acceptance evidence, or product-quality judgments. A narrow command run or a small bounded verification does not require a separate audit artifact.

## Skill Design

Create a personal `evidence-audit` skill as the canonical workflow for substantial API, UX, usability, accessibility, reliability, security, documentation, or acceptance audits. Add only a short conditional handoff in `session-report` so end-of-session reporting verifies that the audit workflow was used without duplicating its instructions.

The skill must:

1. Define criteria before evaluating the target.
2. Collect reproducible evidence and distinguish verified defects, limitations, and unverified suspicions.
3. Write one dated audit artifact in the repository's established audit location.
4. Search existing audits, plans, roadmap entries, and OpenSpec changes before writing so the new artifact references canonical material instead of repeating it.
5. Record severity, impact, reproduction evidence, root cause when verified, residual uncertainty, and recommended next action.
6. Ask whether to create remediation tasks after reporting findings, unless the user already requested tasks/specs in the same conversation.
7. Never silently create remediation scope from a read-only audit request.

## Documentation Ownership

- A dated audit file owns the detailed criteria, evidence, results, findings, and residual risks for one verification session.
- OpenSpec owns proposed behavior changes, acceptance scenarios, design decisions, and implementation tasks.
- The roadmap owns ordering and phase placement and links to the audit and OpenSpec change.
- Current-state documents summarize status and link to canonical artifacts; they do not copy the full findings list.
- The final chat report summarizes the durable record and asks for the next decision when remediation has not already been authorized.

## Current Projects Viewer Follow-up

After the skills are updated, create a dated Projects Viewer API/UX audit from the 2026-07-12 evidence. Create one OpenSpec change covering the confirmed API fallback, scanner trust, and search-explanation defects. Add one Phase 4 roadmap slice referencing that change and the audit. Update current-state documentation only where needed to keep status and indexes accurate.

The audit and OpenSpec artifacts must not duplicate each other: the audit states what was observed; the OpenSpec change states what behavior must change and how completion will be verified.

## Validation

- Validate the new skill's structure and frontmatter with the skill-authoring validator.
- Use the current session as baseline evidence: the earlier substantial audit produced a detailed chat report but no durable audit file and no explicit remediation-task offer.
- Forward-testing with subagents is not authorized by the current collaboration rules and must be reported as an unperformed validation step.
- Validate all OpenSpec artifacts with `openspec validate --all --strict`.
- Search for repeated findings and requirements across audit, roadmap, current-state docs, and OpenSpec; replace repeats with references where possible.
- Run `git diff --check` and inspect the final tracked diff before committing.

## Out Of Scope

- Automatically creating issues, Trello cards, or external tasks without explicit authorization.
- Requiring an audit artifact for every small verification command.
- Implementing the Projects Viewer defect fixes in this documentation session.
