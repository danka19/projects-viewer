# selectable-primary-work-view Specification

## Purpose
Define deterministic, persistent, truthful selection between Roadmap and Specs primary work views.

## Roadmap

- Roadmap phase: P4
- Related phases: none

## Requirements
### Requirement: User selects an available primary work view
The primary visualization SHALL expose a semantic single-select control containing visible Roadmap and Specs choices with detected counts. An unavailable choice MUST be disabled with a concise reason and MUST NOT disappear.

#### Scenario: Mixed project switches views
- **WHEN** both models contain structured data and the user activates Specs
- **THEN** Specs becomes selected without changing or replacing the Roadmap model

#### Scenario: Missing view is explained
- **WHEN** a project has specifications but no roadmap
- **THEN** Roadmap remains visible, disabled, and labelled with the reason `No roadmap detected`

### Requirement: Initial view resolution is deterministic
The system SHALL resolve the primary view in this order: valid saved per-project choice, valid configured `defaultView`, only available structured view, Roadmap when both are available, then a shared empty state. A stale unavailable choice MUST fall back to an available view and disclose the reason.

#### Scenario: First mixed visit preserves compatibility
- **WHEN** both views contain data and neither saved nor configured choice exists
- **THEN** Roadmap opens

#### Scenario: Spec-only project opens useful work
- **WHEN** Specs contains structured data and Roadmap does not
- **THEN** Specs opens and the fallback reason is disclosed

#### Scenario: Stale saved view cannot create false empty state
- **WHEN** saved Specs selection is restored after all specifications disappear while Roadmap remains
- **THEN** Roadmap opens and a concise stale-selection notice is shown

### Requirement: View state persists per project and through history
The system SHALL persist the selected view, selected specification identity, and canvas presentation state by stable project id in versioned path-free UI state. Back and Forward MUST restore the corresponding project, view, focus, and compatible drawer descriptor without leaking state between projects.

#### Scenario: Projects restore independent choices
- **WHEN** the user selects Specs for project A, Roadmap for project B, and returns to A
- **THEN** project A restores Specs and no project B state is applied

#### Scenario: Browser history restores view
- **WHEN** the user changes primary view and navigates Back or Forward
- **THEN** the historical valid view and focus state are restored

### Requirement: Search routes into the matching work context
Global search SHALL index specification name/id, owned task names, explicit group, lifecycle, and source path. Activating a phase result MUST select Roadmap; activating a specification or owned task result MUST select Specs before selecting, expanding, focusing, or opening details for its target.

#### Scenario: Task search enters owner card
- **WHEN** a user activates a specification-task result from another project or view
- **THEN** the matching project and Specs view open, the owner card expands, and the target task receives focus or opens in the drawer

### Requirement: Primary work states remain truthful
The system SHALL distinguish loading, shared empty, per-view empty fallback, initial error, compatible stale refresh, partial data, no-tasks, unassigned-work, and integrity states. Refresh failure MUST preserve compatible prior graph and presentation state; retry MUST be available only in live mode.

#### Scenario: Both views are empty
- **WHEN** neither view contains structured data
- **THEN** one source-guidance empty state is shown without an empty axis or canvas

#### Scenario: Refresh failure preserves context
- **WHEN** a refresh fails after a Specs graph was displayed
- **THEN** the graph, compatible selection, expansion, pan, and zoom remain and the surface is marked stale
