## Context

The scanner currently evaluates task completion and some contextual meaning too late or one line at a time. As a result, a checked task containing blocker language and the `THEN` line of a cross-line OpenSpec scenario can enter `signalGroups.realBlockers`; next-action matching can also promote explanatory prose when it contains both next-action terminology and an embedded marker example. Separately, the pure search model finds and ranks correct evidence but the UI label starts from the beginning of the source text, so a late match can be invisible.

This change is deliberately supplemental. `harden-dashboard-state-derivation` owns the existing source-category, unchecked-task, and explicit current-phase trust rules. `improve-dashboard-search-navigation` owns deterministic ranking, evidence identity, source-aware deduplication, and search navigation. The 2026-07-12 unknown API fallback is already specified and tasked by `harden-mcp-context-api`; it is evidence context only and is not part of this design.

## Goals / Non-Goals

**Goals:**

- Prevent the three exact audited scanner false-positive shapes from becoming live blocker or next-action state.
- Preserve diagnostic/specification visibility without granting normative examples live-work authority.
- Make every search result visibly explain why it matched, including matches late in long evidence text.
- Keep match presentation separate from stable evidence identity, ranking, and deduplication.
- Verify behavior with the real 2026-07-12 source shapes and a real-project rescan.

**Non-Goals:**

- No redesign of trusted source-category rules, phase identity, search ranking, result limits, keyboard behavior, or persistence.
- No requirement or task for the unknown `/api/*` HTML fallback; implementation remains in `harden-mcp-context-api` tasks 3.1–3.3.
- No scanner API schema change unless implementation proves a private presentation field is needed; existing source evidence remains the identity source.
- No modification of scanned project files, arbitrary-path input, cloud service, auth, agent control, or new dependency.

## Decisions

### Reject completed-task blocker candidates before blocker classification

Task extraction must retain checkbox completion state through classification. A checked `[x]` task is historical completion evidence and cannot enter `realBlockers` or `summary.mainBlocker`, even if its text includes `blocked`, `blocker`, or a hard-block phrase. Unchecked tasks continue to follow the explicit blocker rule owned by `harden-dashboard-state-derivation`.

Alternative: refine only the hard-block regular expression. Rejected because the audited completed lines intentionally contain blocker words; completion state, not vocabulary, is the decisive evidence.

### Classify cross-line OpenSpec scenario pairs with bounded neighboring-line context

Scanner classification should recognize a `THEN`/`AND` normative line as OpenSpec scenario context when it belongs to a nearby `WHEN` scenario sequence under a `#### Scenario` block. That context remains available as specification/diagnostic evidence but cannot become live blocker state. The implementation should use a small deterministic line-context state or bounded look-behind while scanning a document, not a repository-wide semantic parser.

Alternative: discard every line beginning with `THEN`. Rejected because ordinary planning prose may use the word legitimately, and the verified defect is specifically normative scenario structure.

### Require standalone active-work semantics for next-action extraction

Next-action terminology in a heading, descriptive sentence, or embedded code/example marker is insufficient. A candidate must express current actionable work through an existing active-work form, such as an unchecked active task or a standalone recognized next-action directive whose marker is structural rather than quoted or embedded. This rule is applied in addition to the source-category exclusions already owned by `harden-dashboard-state-derivation`.

Alternative: blacklist the exact audited sentence. Rejected because nearby headings and explanatory marker examples have the same structural failure mode.

### Derive match-aware presentation without changing evidence identity

The pure search model should compute a display fragment around the normalized query match, with enough leading/trailing context and boundary ellipses to make the relationship visible. If a result type has an equivalent already-visible field that contains the match, it may use that instead. The result's stable evidence key, score, ordering, source file/line identity, and navigation target remain unchanged.

Alternative: continue rendering the first fixed-length characters and highlight only if the match happens to be present. Rejected because it does not explain late matches such as the audited `preflight packet` result.

### Preserve deduplication before adding presentation metadata

Identical source evidence is still collapsed according to the source-aware identity contract in `improve-dashboard-search-navigation`; the retained result alone receives the match-aware fragment. Presentation text must not become an identity input or cause one source line to reappear as separate Next action and Decision results.

Alternative: generate fragments before deduplication and treat them as result identity. Rejected because query-dependent text would destabilize keys and could recreate duplicate representations.

## Risks / Trade-offs

- [A narrow OpenSpec context detector misses unusual formatting] → Cover the exact multi-line `WHEN`/`THEN` audit shape plus adjacent `AND` lines, and keep the detector bounded and explicit.
- [Active-work gating suppresses a legitimate prose next action] → Preserve standalone recognized directives and unchecked active tasks; add positive fixtures beside each negative fixture.
- [Match fragments split words or lose useful context] → Center on normalized match boundaries, preserve readable surrounding text, and test early, middle, late, and long matches.
- [A query-dependent fragment changes stable identity or ordering] → Compute it only after evidence identity, deduplication, scoring, and sorting are established; assert keys/order remain stable.
- [Generated data still contains stale false positives after code tests pass] → Run the real configured-project rescan and inspect `projects-viewer` blocker, main-blocker, and next-action evidence before acceptance.

## Migration Plan

1. Add RED scanner fixtures using the exact checked blocker tasks, cross-line `WHEN`/`THEN` scenario, and explanatory `Next-action signals ...` sentence from the 2026-07-12 audit, plus trusted positive controls.
2. Implement completion-aware, bounded normative-context, and active-work classification until the scanner fixtures pass.
3. Add RED pure/component search fixtures for a late `preflight packet` match and duplicated evidence, then implement match-aware presentation without changing stable identity, ranking, or deduplication.
4. Run focused and full automated verification, build, real-project rescan evidence, and browser acceptance for visible query-to-result context.
5. Update the dated audit remediation status and current-state documentation, then run strict OpenSpec validation.

Rollback restores the scanner/search implementation commit and regenerates runtime scan data. No scanned-project or persistent config migration is required.

## Open Questions

None. Exact fragment length and emphasis styling may be selected during implementation as presentation details, provided the complete query-to-result relationship remains visible and accessible.
