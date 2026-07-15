# Roadmap Specification Cards Design

## Ownership contract

Accepted capability specs use `Roadmap phase` and optional `Roadmap step`. Active changes use `Execution phase` and optional `Execution step`. The primary phase owns the card; related phases only provide traceability. Missing or invalid references remain unassigned with source evidence.

## Presentation contract

The Roadmap timeline keeps its phase axis and expanded step timeline. Step-owned specification cards render beneath their exact step. Phase-level cards render in a labelled phase-level section. Each card shows lifecycle, evidence-backed progress, task summary, and source navigation. Large specs remain single cards and nest their tasks.

## Navigation and safety

Card activation uses existing stable drawer/search descriptors and may target the matching Specs Canvas card. It never accepts arbitrary paths, changes lifecycle truth, edits scanned projects, or triggers external actions.
