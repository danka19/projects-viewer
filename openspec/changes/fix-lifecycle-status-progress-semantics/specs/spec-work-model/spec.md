## ADDED Requirements

### Requirement: Accepted living-spec progress requires implementation evidence
The system SHALL keep implementation progress unknown for an accepted living specification without eligible task evidence, while preserving existing final progress for OpenSpec changes with explicit final lifecycle evidence.

#### Scenario: Accepted living specification has no implementation evidence
- **WHEN** an `accepted-capability` has no eligible owned tasks and no explicit implementation-final evidence
- **THEN** its implementation progress is unknown
- **AND** the presentation reports `No tasks documented`
- **AND** it does not display `0/0` or 100 percent

#### Scenario: Explicitly final change retains final progress
- **WHEN** a closed or archived OpenSpec change has explicit final lifecycle evidence and no eligible tasks
- **THEN** the existing final-progress rule may establish 100 percent
