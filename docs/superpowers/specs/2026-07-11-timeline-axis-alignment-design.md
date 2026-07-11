# Timeline Axis Alignment Design

Status: approved by the human owner on 2026-07-11.

## Problem

Phase cards render at their intrinsic content height while their parent list items stretch to the tallest item. Because each axis segment is placed immediately after its card, variable card heights move axis nodes vertically. Live-browser evidence on the fourteen-phase AutoParts timeline measured card heights from 105.1 px to 131.3 px and axis-node positions from 584.2 px to 610.4 px.

## Accepted Decision

All phase cards in one rendered phase row stretch to the height of the tallest card in that row. The axis and its nodes therefore share one horizontal baseline with at most 1 px vertical deviation.

The implementation must:

- preserve intrinsic content and existing two-line clamps;
- avoid a fixed pixel height and avoid clipping content;
- preserve responsive card widths, horizontal scrolling, current/expanded width emphasis, and lifecycle styling;
- use the existing flex-row contract, matching the already-correct nested step-card behavior;
- cover the behavior with an automated layout-contract regression test and browser geometry checks at desktop, tablet, and mobile widths.

## Rejected Alternatives

- A fixed card height was rejected because translations, longer lifecycle labels, or integrity text could clip or overflow.
- An independently absolute-positioned axis was rejected because it would duplicate layout geometry and make the expansion bridge more fragile.

## Acceptance Criteria

1. Every phase card in a rendered phase row fills its equal-height list item.
2. Phase-axis node top coordinates differ by no more than 1 px in the long mixed-content fixture.
3. No phase-card content is vertically clipped.
4. Phase and step timelines remain single-row, horizontally scrollable, and page-level overflow remains absent at 1280x720, 1024x768, and 390x844.

