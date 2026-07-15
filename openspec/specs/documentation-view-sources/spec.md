# documentation-view-sources Specification

## Purpose
Define safe saved documentation-view roots and deterministic evidence-backed source classification.

## Roadmap

- Roadmap phase: P4
- Related phases: none

## Requirements
### Requirement: Saved projects configure documentation views safely
The system SHALL accept optional `defaultView` and per-view `documentationViews.roadmap.roots` and `documentationViews.specs.roots` only through canonical saved project configuration. Every root MUST be normalized project-relative input that resolves inside the saved project root; absolute paths, traversal, missing/non-directory roots, and symlink escapes MUST be rejected atomically before any scan.

#### Scenario: Valid separate roots are saved
- **WHEN** a live-mode user saves existing project-relative Roadmap and Specs roots
- **THEN** the normalized roots and optional valid default view are persisted without modifying the scanned project

#### Scenario: Unsafe roots are rejected without scanning
- **WHEN** a mutation contains an absolute, traversing, missing, file, or escaping-symlink root
- **THEN** the entire mutation fails, canonical config remains unchanged, and no request-provided location is scanned

#### Scenario: Existing config remains compatible
- **WHEN** a saved project omits both new fields
- **THEN** it remains valid and both views use automatic mixed-repository classification

### Requirement: Scanner classifies roadmap and specification sources deterministically
The scanner SHALL apply explicit configured roots first, exact supported structures second, and the existing safe classifier third. It MUST recognize both `openspec/` and `.openspec/` change/capability layouts; ambiguous documents MUST remain Knowledge items with an integrity notice rather than being promoted.

#### Scenario: Mixed repository exposes both models
- **WHEN** a configured project contains safely classifiable roadmap and specification documents without view roots
- **THEN** the generated contract contains both primary models without assigning either document to an unsupported view

#### Scenario: One scoped view and one automatic view
- **WHEN** only Specs roots are configured
- **THEN** specification extraction reads only matching saved roots while Roadmap uses automatic classification over the allowed scan

#### Scenario: OpenSpec directory spellings are equivalent
- **WHEN** equivalent artifacts exist under `openspec/changes` or `.openspec/changes`
- **THEN** each layout produces the same specification identity and ownership semantics

### Requirement: Scanner extracts only evidenced specification work
The scanner SHALL create one work item per active OpenSpec change, one reference item per accepted capability, and one item per configured generic specification with stable source identity. A task SHALL belong to a specification only through artifact location, explicit supported metadata, or an unambiguous configured rule; other tasks MUST be emitted as unassigned work.

#### Scenario: OpenSpec tasks belong to their change
- **WHEN** checkbox tasks occur in a change's `tasks.md`
- **THEN** they are ordered tasks of that change card with stable non-index keys and source evidence

#### Scenario: Task-only source remains unassigned
- **WHEN** tasks have no evidenced owning specification
- **THEN** they appear in `unassignedTasks` and no fabricated specification is created

### Requirement: Explicit work frontmatter is the only dependency metadata source
The scanner SHALL support YAML identity-document frontmatter containing required `work.id`, string-list `work.dependsOn`, and optional string `work.group`. `proposal.md` is authoritative for a change, `spec.md` for an accepted capability, and the generic document for a generic spec. It MUST NOT infer dependencies from path order, nesting, numbers, dates, names, task order, lifecycle, semantic similarity, or model judgment.

#### Scenario: Explicit dependency is extracted
- **WHEN** an identity document declares `work.id: ranking-rules` and `work.dependsOn: [search-contract]`
- **THEN** generated data records an evidence-backed `search-contract -> ranking-rules` dependency

#### Scenario: Similar documents remain independent
- **WHEN** two specifications have similar names, adjacent numbering, ordered dates, or neighboring folders but no supported declaration
- **THEN** no dependency is emitted

#### Scenario: Contradictory secondary metadata is disclosed
- **WHEN** a secondary artifact contradicts the identity document's work metadata
- **THEN** identity metadata wins and generated integrity evidence describes the contradiction

### Requirement: Scanning preserves local read-only boundaries
The system MUST scan only enabled projects from canonical saved config, MUST NOT accept browser-provided scan roots, MUST NOT follow symlinks, and MUST write only dashboard-generated runtime output.

#### Scenario: Configured view scan is read-only
- **WHEN** scanner fixtures include sentinels inside configured source roots
- **THEN** all sentinel content and timestamps remain unchanged after scanning
