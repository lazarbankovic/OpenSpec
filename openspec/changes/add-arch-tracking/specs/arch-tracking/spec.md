## Purpose
The `openspec/arch/` folder is the permanent store for C4 architecture diagrams and Architecture Decision Records (ADRs) in an OpenSpec project. It is the authoritative source of truth for architectural decisions and diagram state.

## Requirements

### Requirement: C4 Diagram Store
The `openspec/arch/` folder SHALL contain one Structurizr DSL file per C4 level.

#### Scenario: Folder contents after init
- **WHEN** `openspec arch init` is run
- **THEN** `openspec/arch/` contains `c1.dsl`, `c2.dsl`, `c3.dsl`, `c4.dsl`
- **AND** each file is a valid minimal Structurizr `workspace {}` block

### Requirement: ADR Store
The `openspec/arch/decisions/` folder SHALL hold accepted Architecture Decision Records as individual files.

#### Scenario: ADR file naming
- **WHEN** a new ADR is added
- **THEN** it is named `NNNN-<dash-case-title>.md` where `NNNN` is a globally incrementing four-digit sequence

#### Scenario: Superseded ADR
- **WHEN** an ADR is superseded by a newer decision
- **THEN** the old ADR is moved to `openspec/arch/decisions/archive/`
- **AND** the new ADR contains a `Supersedes: ADR-NNNN` field referencing the old one

### Requirement: ADR Format
Every ADR SHALL contain four required sections: Decision, Reasoning, Trade-offs, and Rejected Alternatives.

#### Scenario: Valid ADR structure
- **WHEN** an ADR is created
- **THEN** it contains `## Decision`, `## Reasoning`, `## Trade-offs`, and `## Rejected Alternatives` sections
- **AND** each section has at least one sentence of content

### Requirement: ADRs as Guardrails
Existing ADRs SHALL be checked for conflicts before any proposed change is applied.

#### Scenario: Conflict detected
- **WHEN** a proposed change contradicts an existing ADR
- **THEN** the AI stops at the first conflict found
- **AND** notifies the user with: the conflicting ADR identifier, the decision it contains, and why the proposal conflicts
- **AND** requires explicit user approval before proceeding
- **AND** a superseding ADR is created in the change's `arch/decisions/` folder if the user approves

#### Scenario: No ADRs exist
- **WHEN** `openspec/arch/decisions/` is empty or does not exist
- **THEN** the conflict check is skipped silently

### Requirement: Change Arch Delta
A change using the `arch-driven` schema SHALL optionally contain an `arch/` subfolder with modified C4 layers and new ADRs.

#### Scenario: Arch delta structure
- **WHEN** a change includes architecture modifications
- **THEN** `changes/<name>/arch/` contains the modified `.dsl` files
- **AND** `changes/<name>/arch/.base/` contains unmodified copies of those same files captured at checkout time
- **AND** only C4 layers that the change affects are present

#### Scenario: ADR in change
- **WHEN** a new ADR is part of a change
- **THEN** it lives in `changes/<name>/arch/decisions/` until the change is archived
- **AND** it is copied to `openspec/arch/decisions/` with the next sequence number at archive time
