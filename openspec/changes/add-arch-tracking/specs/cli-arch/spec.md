## ADDED Requirements

### Requirement: openspec arch Command Group
The CLI SHALL expose an `openspec arch` command group for architecture tracking operations.

#### Scenario: Help output
- **WHEN** user runs `openspec arch --help`
- **THEN** available subcommands are listed with descriptions

### Requirement: openspec arch init
The `openspec arch init` command SHALL scaffold the `openspec/arch/` folder structure with valid Structurizr DSL stubs.

#### Scenario: First-time initialization
- **WHEN** `openspec arch init` is run and `openspec/arch/` does not exist
- **THEN** the command creates `openspec/arch/c1.dsl`, `c2.dsl`, `c3.dsl`, `c4.dsl`
- **AND** creates `openspec/arch/decisions/` and `openspec/arch/decisions/archive/`
- **AND** each `.dsl` file contains a minimal valid `workspace {}` block
- **AND** prints: `✓ Created openspec/arch/ — set schema: arch-driven in openspec/config.yaml to enable arch tracking`

#### Scenario: Already initialized
- **WHEN** `openspec arch init` is run and `openspec/arch/` already exists
- **THEN** the command prints a message that arch is already initialized
- **AND** exits without overwriting any files
