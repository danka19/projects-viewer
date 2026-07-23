# Canonical Project-State Sources Design

**Date:** 2026-07-23  
**Status:** approved design; awaiting document review before implementation planning

## Purpose

Make Project View derive live blockers, constraints, progress eligibility, and the current phase from current canonical evidence only. This prevents historical or normative documentation from being presented as current project state.

## Source Boundary

The scanner will accept current-state evidence only from:

1. `ROADMAP.md` (at the repository root or under `docs/`),
2. non-archived active OpenSpec changes under `openspec/changes/<change-id>/`, and
3. `docs/BUGS.md`, the canonical current bug list.

`docs/archive/**`, `openspec/changes/archive/**`, audit documents, evidence documents, and plans are never sources of live blockers. They may remain discoverable as documentation or historical context, but cannot affect live blocker counts, `summary.mainBlocker`, health, current constraints, or the current phase.

## Blocker Semantics

A real blocker must be an explicit current-work statement in an allowed source. A bare occurrence of `blocked` is insufficient. The scanner must reject technical invariants, rules, examples, historical quotations, OpenSpec normative scenarios, and other explanatory text even where they use blocker terminology.

The output continues to retain source evidence for every accepted blocker.

## Superseded Semantics

Superseded work is excluded from progress numerator and denominator and from active constraints. When a superseded item has no explicit replacement reference, the scanner exposes only a documentation-quality warning; it does not fabricate a blocker, active restriction, or replacement work item.

## Current Phase Semantics

`summary.currentPhase` is derived solely from parsed phases in `ROADMAP.md`. It remains the unique phase with explicit `in_progress` lifecycle status; zero or multiple such phases yield `null`. Non-roadmap prose cannot establish or override the phase identity.

## Verification

Automated scanner fixtures will prove that:

- blockers in archives, audits, evidence, and plans are ignored;
- an active roadmap or active OpenSpec change can still supply a real blocker;
- a bare `blocked` technical invariant or historical quotation is ignored;
- superseded items leave progress and constraints, with a missing-replacement quality warning only;
- a ScanLab-style roadmap with exactly one current phase produces that phase rather than `null`.

## Scope And Non-Goals

This change does not alter scanned-project read-only guarantees, permit arbitrary source paths, or modify historical documents. It introduces no configuration UI or cloud/API behavior.
