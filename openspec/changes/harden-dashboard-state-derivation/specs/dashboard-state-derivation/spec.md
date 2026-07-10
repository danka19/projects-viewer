## ADDED Requirements

### Requirement: Next actions come only from project planning sources

The scanner SHALL NOT source next-action signals from agent-rule documents, process-policy documents, example/template documents, or audit/checklist-category documents.

#### Scenario: Agent rules describe reporting habits
- **WHEN** `AGENTS.md` or a verification checklist contains next-step reporting rules
- **THEN** no next-action signal is produced from those documents
- **AND** next actions from roadmap/planning documents remain available

#### Scenario: Done project has only rule-derived candidates
- **WHEN** a project has closed phases, no open planning work, and rule files with next-step wording
- **THEN** the project reports zero next actions
- **AND** `summary.nextAction` is null

### Requirement: Plan checkboxes are tasks, not live blockers

The scanner SHALL treat unchecked markdown checkboxes as tasks and SHALL classify them as real blockers only when their text explicitly says blocked or blocker.

#### Scenario: TDD plan step mentions a failing test
- **WHEN** an unchecked checkbox says "Add a failing test named …"
- **THEN** it is not classified as a real blocker
- **AND** it never becomes `summary.mainBlocker`

#### Scenario: Checkbox explicitly records blocked work
- **WHEN** an unchecked checkbox text contains explicit blocked/blocker wording
- **THEN** it may still be classified as a real blocker with source evidence

### Requirement: Current phase identity is explicit or null

The scanner SHALL set `summary.currentPhase` only when exactly one phase has `in_progress` lifecycle status and SHALL keep it null for zero or multiple in-progress phases.

#### Scenario: One phase is in progress
- **WHEN** exactly one roadmap phase is `in_progress`
- **THEN** `summary.currentPhase` names that phase

#### Scenario: Current phase is ambiguous or absent
- **WHEN** zero or more than one phase is `in_progress`, or work is only pending acceptance
- **THEN** `summary.currentPhase` is null
- **AND** downstream presentation surfaces the between-phases or ambiguity state instead of a fabricated current phase
