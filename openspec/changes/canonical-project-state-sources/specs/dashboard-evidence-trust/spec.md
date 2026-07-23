## ADDED Requirements

### Requirement: Superseded current-source text cannot revive historical constraints
Projects Viewer SHALL preserve superseded wording as non-live context even when it appears in an otherwise canonical current-state source. A missing replacement reference SHALL remain a documentation-quality warning rather than a live blocker or gate.

#### Scenario: Current roadmap retains superseded release text
- **WHEN** `ROADMAP.md` retains a superseded release entry without a replacement reference
- **THEN** the entry does not enter `signalGroups.realBlockers`, approval gates, review signals, or paused/deferred constraints
- **AND** any missing-replacement indication is non-live diagnostic evidence
