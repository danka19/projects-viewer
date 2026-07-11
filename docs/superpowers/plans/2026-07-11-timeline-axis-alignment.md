# Timeline Axis Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the phase timeline axis perfectly horizontal when phase cards contain different amounts of content, then re-audit the completed dashboard redesign.

**Architecture:** Preserve the existing flex row: the ordered list stretches each phase `<li>` to the tallest row item, and `PhaseCard` must consume that available height just as `StepCard` already does. Add a component contract test before the one-class implementation change, then verify the actual browser geometry and reconcile acceptance documentation.

**Tech Stack:** React 19, TypeScript, Tailwind utility classes, Vitest/Testing Library, Vite, OpenSpec, in-app browser geometry inspection.

## Global Constraints

- Keep Projects Viewer local-only and scanned projects read-only.
- Preserve existing theme tokens, lifecycle semantics, horizontal overflow, keyboard/focus behavior, and safe UI-state restoration.
- Do not use fixed phase-card heights or clip card content.
- Phase-axis node vertical deviation must be no more than 1 px.

---

### Task 1: Record The Accepted Geometry Contract

**Files:**
- Modify: `openspec/changes/redesign-dashboard-project-timeline/design.md`
- Modify: `openspec/changes/redesign-dashboard-project-timeline/specs/dashboard-project-timeline/spec.md`
- Modify: `openspec/changes/redesign-dashboard-project-timeline/tasks.md`

**Interfaces:**
- Consumes: the existing `dashboard-project-timeline` responsive and large-timeline requirements.
- Produces: a normative equal-height/straight-axis scenario and explicit regression tasks.

- [ ] **Step 1: Add the approved decision and rejected alternatives to the OpenSpec design.**
- [ ] **Step 2: Add a scenario requiring equal card heights and <=1 px axis-node deviation.**
- [ ] **Step 3: Add unchecked test, implementation, and fresh-acceptance tasks; reopen the unsupported human-acceptance claim.**
- [ ] **Step 4: Run `openspec validate redesign-dashboard-project-timeline --strict`; expect PASS.**

### Task 2: Add The Regression Test First

**Files:**
- Modify: `tests/components/project-timeline.test.tsx`

**Interfaces:**
- Consumes: phase buttons rendered by `ProjectTimeline` and the existing stretched phase-track list.
- Produces: a layout-contract assertion that each `.tl-phase-card` participates in equal-height stretching.

- [ ] **Step 1: Add a failing component test.**

```tsx
it('stretches every phase card so the shared axis stays level with mixed content', () => {
  renderTimeline(projectWithCurrent());
  const cards = screen.getAllByRole('button', { name: /^Phase / });
  expect(cards.length).toBeGreaterThan(1);
  for (const card of cards) expect(card).toHaveClass('flex-1');
});
```

- [ ] **Step 2: Run `npx vitest run tests/components/project-timeline.test.tsx`; expect the new test to FAIL because `PhaseCard` lacks `flex-1`.**

### Task 3: Stretch Phase Cards Without Fixed Heights

**Files:**
- Modify: `src/timeline/PhaseCard.tsx`
- Test: `tests/components/project-timeline.test.tsx`

**Interfaces:**
- Consumes: equal-height flex-column phase list items from `ProjectTimeline`.
- Produces: a phase card button that grows to the shared row height.

- [ ] **Step 1: Add the minimal implementation.**

```tsx
className={`tl-phase-card glass relative flex w-full flex-1 flex-col ...`}
```

- [ ] **Step 2: Re-run `npx vitest run tests/components/project-timeline.test.tsx`; expect PASS.**
- [ ] **Step 3: Run the complete component suite; expect PASS with no warnings.**

### Task 4: Re-Audit And Verify The Redesign

**Files:**
- Modify: `docs/audits/DASHBOARD_REDESIGN_ACCEPTANCE_2026-07-11.md`
- Modify: `docs/CURRENT_PROJECT_AUDIT.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/planning/DASHBOARD_REDESIGN_PLAN.md`
- Modify: `docs/README.md`
- Modify: `docs/00_FILE_STRUCTURE.md` only if the repository map is inaccurate.

**Interfaces:**
- Consumes: OpenSpec requirements, implementation, tests, browser state, git state, and previous acceptance claims.
- Produces: an evidence-backed implemented/not-implemented matrix and honest acceptance status.

- [ ] **Step 1: Compare every OpenSpec requirement/scenario and UX-001..UX-011 closure criterion with code/tests/browser evidence.**
- [ ] **Step 2: Measure phase card heights and axis-node top coordinates in dark and light themes at 1280x720, 1024x768, and 390x844.**
- [ ] **Step 3: Verify page/local overflow, first-screen ordering, search/history, keyboard/focus return, empty/no-current/current/no-steps/ambiguous/long states, and console errors.**
- [ ] **Step 4: Correct stale or unsupported acceptance/status statements and record residual risks without inferring human acceptance.**

### Task 5: Final Verification And Commit

**Files:**
- Modify: only evidence/status documentation found stale in Task 4.

**Interfaces:**
- Consumes: the completed fix and audit.
- Produces: a reviewable commit and final acceptance report.

- [ ] **Step 1: Run focused timeline tests, `npm test`, and `npm run build`; expect all to pass.**
- [ ] **Step 2: Run `openspec list`, `openspec list --specs`, `openspec validate --all --strict`, and `git diff --check`; expect clean validation.**
- [ ] **Step 3: Review `git diff` for unrelated changes and secrets.**
- [ ] **Step 4: Commit the intentional fix, tests, and documentation with a focused message.**

