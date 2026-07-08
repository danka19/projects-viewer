# Claude Entry Point

Read `AGENTS.md` first. It is the canonical instruction file for all agents.

Do not maintain separate project rules here. If a workflow, convention, or architecture constraint is useful for Claude, put it in `AGENTS.md` or the relevant file under `docs/`.

## Active Handoff

None. When Codex prepares a bounded task for Claude, a single line with the path to `docs/handoffs/HANDOFF_<date>_<topic>.md` appears here (see the global `handoff-to-claude` skill).
