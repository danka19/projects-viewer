# Projects Viewer Favicon Design

Status: approved by the human owner on 2026-07-15.

## Problem

Projects Viewer has no favicon, so its browser tab uses the generic browser fallback and does not reflect the dashboard's visual identity. The mark must remain recognizable at 16–32 px, match the existing earth-tone developer-dashboard palette, and avoid a central red dot that could be mistaken for a recording indicator.

## Accepted Direction

Use the selected **Sweep Ring** concept: a compact radar mark that represents a moving overview of local projects.

The favicon consists of:

- a `#242724` rounded-square background that remains stable in both application themes;
- a `#DCC9A9` sand radar ring;
- a `#AC5045` terracotta scanning arc placed on the upper-right circumference, never at the center;
- a hollow central diamond cursor with the dark background visible through it;
- a small `#8FAE8A` sage project marker offset into the lower-right radar field;
- faint sand crosshairs that may visually recede at small sizes without carrying essential meaning.

The semantic reading is "projects under active overview," not recording, capture, or media playback.

## Asset And Integration Design

- Create one deterministic, repository-native SVG favicon with a `64 64` view box.
- Keep the essential silhouette legible at 16 px: dark tile, sand ring, terracotta arc, hollow diamond, and sage marker.
- Use no text, animation, gradients, filters, external resources, raster exports, or runtime theme switching.
- Place the asset in Vite's static public asset location and reference it from `index.html` with an explicit SVG favicon link.
- Do not add a header logo, app icon family, Apple touch icon, web manifest, or alternate raster formats in this change.

## Rejected Alternatives

- **Document Stack** was rejected because it was clear but visually generic and did not express the dashboard's cross-project overview.
- **Terminal Pulse** was not selected as the primary mark because it communicated a developer tool more strongly than a project portfolio.
- **Radar Prompt** was rejected after comparison because the human owner preferred the clearer Sweep Ring concept.
- A filled terracotta center point was rejected because it resembled a `REC` indicator at favicon scale.

## Verification Design

Implementation evidence must include:

1. A focused automated or static integration check that `index.html` references the committed SVG favicon at the expected public path.
2. A successful production build.
3. Manual browser inspection at approximately 16 px and 32 px in a real tab, confirming that the ring, scan arc, hollow cursor, and sage marker remain distinguishable.
4. Manual inspection in both dark and light application themes, confirming that the favicon remains intentionally theme-stable.
5. A final check that no filled terracotta shape is centered in the mark and that the icon does not read as a recording indicator.

## Acceptance Criteria

1. The Projects Viewer browser tab displays the new SVG favicon instead of the generic fallback.
2. The favicon uses the accepted Sweep Ring geometry and project palette described above.
3. At 16 px, the essential silhouette remains recognizable without relying on the faint crosshairs.
4. The center is a hollow diamond cursor; there is no filled red or terracotta center point.
5. The same static favicon remains visually coherent beside both dark and light application themes.
6. The production build succeeds and existing application behavior is unchanged.

## Scope And Requirement Mapping

This is a bounded visual-identity change. It does not alter accepted product behavior, data contracts, architecture, security boundaries, scanning behavior, or roadmap ownership, so no OpenSpec delta is required. The acceptance criteria above are the canonical verification map for this asset change.
